import { getDatabase, SqlDatabase } from "../db/database";
import { logAudit } from "./audit.service";

export async function getFinancialSnapshot() {
  const db = await getDatabase();

  const cashInAccounts =
    db.get<{ total: number }>(
      "SELECT COALESCE(SUM(balance), 0) as total FROM payment_accounts WHERE active = 1",
    )?.total || 0;

  const customerReceivables =
    db.get<{ total: number }>(
      "SELECT COALESCE(SUM(remaining_balance), 0) as total FROM sales WHERE status = 'active'",
    )?.total || 0;

  const supplierPayables =
    db.get<{ total: number }>(
      "SELECT COALESCE(SUM(current_balance), 0) as total FROM suppliers WHERE active = 1",
    )?.total || 0;

  const inventoryAssetValue =
    db.get<{ total: number }>(
      "SELECT COALESCE(SUM(stock * cost_price), 0) as total FROM products WHERE active = 1",
    )?.total || 0;

  const totalExpenses =
    db.get<{ total: number }>(
      "SELECT COALESCE(SUM(amount), 0) as total FROM financial_transactions WHERE kind = 'expense' AND is_void = 0",
    )?.total || 0;

  return {
    cash_in_accounts: Math.round(cashInAccounts * 100) / 100,
    customer_receivables: Math.round(customerReceivables * 100) / 100,
    supplier_payables: Math.round(supplierPayables * 100) / 100,
    inventory_asset_value: Math.round(inventoryAssetValue * 100) / 100,
    total_expenses: Math.round(totalExpenses * 100) / 100,
    net_worth:
      Math.round(
        (cashInAccounts + customerReceivables + inventoryAssetValue - supplierPayables) * 100,
      ) / 100,
  };
}

export async function getBusinessOverview(from?: string, to?: string) {
  const db = await getDatabase();
  const conditions: string[] = ["status = 'active'"];
  const params: string[] = [];

  if (from) {
    conditions.push("sale_date >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("sale_date <= ?");
    params.push(to);
  }

  const salesStats = db.get<{
    total_sales: number;
    total_paid: number;
    total_debt: number;
    sales_count: number;
  }>(
    `SELECT 
      COALESCE(SUM(total), 0) as total_sales,
      COALESCE(SUM(paid_amount), 0) as total_paid,
      COALESCE(SUM(remaining_balance), 0) as total_debt,
      COUNT(id) as sales_count
     FROM sales 
     WHERE ${conditions.join(" AND ")}`,
    params,
  );

  // Calculate gross profit from sale_items
  const profitStats = db.get<{ gross_profit: number }>(
    `SELECT 
      COALESCE(SUM(si.line_total - (si.quantity * si.unit_cost)), 0) as gross_profit
     FROM sale_items si
     JOIN sales s ON si.sale_id = s.id
     WHERE s.status = 'active' ${from ? "AND s.sale_date >= '" + from + "'" : ""} ${to ? "AND s.sale_date <= '" + to + "'" : ""}`,
  );

  return {
    total_sales: Math.round((salesStats?.total_sales || 0) * 100) / 100,
    total_paid: Math.round((salesStats?.total_paid || 0) * 100) / 100,
    total_debt: Math.round((salesStats?.total_debt || 0) * 100) / 100,
    sales_count: salesStats?.sales_count || 0,
    gross_profit: Math.round((profitStats?.gross_profit || 0) * 100) / 100,
  };
}

export async function recordExpense(input: {
  amount: number;
  category: string;
  accountId?: string;
  transactionDate?: string;
  reference?: string;
  note?: string;
  isPersonal?: boolean;
  createdBy?: string;
}) {
  const db = await getDatabase();

  return db.transaction(() => {
    if (input.amount <= 0) {
      throw new Error("Qarashku waa inuu ka weynaadaa 0 (Expense amount must be > 0)");
    }

    const txnId = "exp-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    const txnDate = input.transactionDate || new Date().toISOString().split("T")[0];

    db.run(
      `INSERT INTO financial_transactions (
        id, transaction_date, kind, category, amount, account_id, reference, note, is_personal, created_by
      ) VALUES (?, ?, 'expense', ?, ?, ?, ?, ?, ?, ?)`,
      [
        txnId,
        txnDate,
        input.category,
        input.amount,
        input.accountId || null,
        input.reference || null,
        input.note || null,
        input.isPersonal ? 1 : 0,
        input.createdBy || null,
      ],
    );

    if (input.accountId) {
      db.run(
        `UPDATE payment_accounts SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?`,
        [input.amount, input.accountId],
      );
    }

    logAudit(
      {
        userId: input.createdBy,
        action: "RECORD_EXPENSE",
        module: "financial",
        recordId: txnId,
        afterState: { amount: input.amount, category: input.category, accountId: input.accountId },
      },
      db,
    );

    return { id: txnId, amount: input.amount, category: input.category };
  });
}

export async function recordIncome(input: {
  amount: number;
  category: string;
  accountId: string;
  transactionDate?: string;
  reference?: string;
  note?: string;
  isPersonal?: boolean;
  createdBy?: string;
}) {
  const db = await getDatabase();

  return db.transaction(() => {
    if (input.amount <= 0) {
      throw new Error("Dakhligu waa inuu ka weynaadaa 0 (Income amount must be > 0)");
    }

    const txnId = "inc-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    const txnDate = input.transactionDate || new Date().toISOString().split("T")[0];

    db.run(
      `INSERT INTO financial_transactions (
        id, transaction_date, kind, category, amount, account_id, reference, note, is_personal, created_by
      ) VALUES (?, ?, 'income', ?, ?, ?, ?, ?, ?, ?)`,
      [
        txnId,
        txnDate,
        input.category,
        input.amount,
        input.accountId,
        input.reference || null,
        input.note || null,
        input.isPersonal ? 1 : 0,
        input.createdBy || null,
      ],
    );

    db.run(
      `UPDATE payment_accounts SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`,
      [input.amount, input.accountId],
    );

    logAudit(
      {
        userId: input.createdBy,
        action: "RECORD_INCOME",
        module: "financial",
        recordId: txnId,
        afterState: { amount: input.amount, category: input.category, accountId: input.accountId },
      },
      db,
    );

    return { id: txnId, amount: input.amount, category: input.category };
  });
}

export async function createAccountTransfer(input: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  transferDate?: string;
  reference?: string;
  note?: string;
  createdBy?: string;
}) {
  const db = await getDatabase();

  return db.transaction(() => {
    if (input.amount <= 0) {
      throw new Error(
        "Lacagta la wareejinayo waa in ay ka weynaataa 0 (Transfer amount must be > 0)",
      );
    }
    if (input.fromAccountId === input.toAccountId) {
      throw new Error(
        "Akoonka laga wareejinayo iyo kan loo wareejinayo ma isku mid noqon karaan (Cannot transfer to same account)",
      );
    }

    const fromAcc = db.get<{ name: string; balance: number }>(
      "SELECT name, balance FROM payment_accounts WHERE id = ?",
      [input.fromAccountId],
    );
    const toAcc = db.get<{ name: string; balance: number }>(
      "SELECT name, balance FROM payment_accounts WHERE id = ?",
      [input.toAccountId],
    );

    if (!fromAcc || !toAcc) {
      throw new Error("Akoonnada midkood lama helin (Source or destination account not found)");
    }

    const transferId = "trf-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    const transferDate = input.transferDate || new Date().toISOString().split("T")[0];

    db.run(
      `INSERT INTO account_transfers (
        id, from_account_id, to_account_id, amount, transfer_date, reference, note, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
      [
        transferId,
        input.fromAccountId,
        input.toAccountId,
        input.amount,
        transferDate,
        input.reference || null,
        input.note || null,
        input.createdBy || null,
      ],
    );

    // Debit source
    db.run(
      `UPDATE payment_accounts SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?`,
      [input.amount, input.fromAccountId],
    );

    // Credit destination
    db.run(
      `UPDATE payment_accounts SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`,
      [input.amount, input.toAccountId],
    );

    // Record Ledger Entries
    db.run(
      `INSERT INTO financial_transactions (
        id, transaction_date, kind, category, amount, account_id, from_account_id, to_account_id, reference, source_module, source_id, note, created_by
      ) VALUES (?, ?, 'transfer', 'Account Transfer', ?, ?, ?, ?, ?, 'account_transfers', ?, ?, ?)`,
      [
        "txn-" + Math.random().toString(36).substring(2, 9),
        transferDate,
        input.amount,
        input.fromAccountId,
        input.fromAccountId,
        input.toAccountId,
        input.reference || null,
        transferId,
        `Wareejin: ${fromAcc.name} -> ${toAcc.name}`,
        input.createdBy || null,
      ],
    );

    logAudit(
      {
        userId: input.createdBy,
        action: "ACCOUNT_TRANSFER",
        module: "financial",
        recordId: transferId,
        afterState: {
          from: fromAcc.name,
          to: toAcc.name,
          amount: input.amount,
        },
      },
      db,
    );

    return { id: transferId, amount: input.amount, from: fromAcc.name, to: toAcc.name };
  });
}

export async function listFinancialTransactions(filters: {
  kind?: string;
  category?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDatabase();
  const conditions: string[] = ["is_void = 0"];
  const params: (string | number)[] = [];

  if (filters.kind) {
    conditions.push("ft.kind = ?");
    params.push(filters.kind);
  }
  if (filters.category) {
    conditions.push("ft.category = ?");
    params.push(filters.category);
  }
  if (filters.accountId) {
    conditions.push("(ft.account_id = ? OR ft.from_account_id = ? OR ft.to_account_id = ?)");
    params.push(filters.accountId, filters.accountId, filters.accountId);
  }
  if (filters.startDate) {
    conditions.push("ft.transaction_date >= ?");
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push("ft.transaction_date <= ?");
    params.push(filters.endDate);
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const count = db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM financial_transactions ft WHERE ${conditions.join(" AND ")}`,
    params,
  );

  const transactions = db.query<Record<string, unknown>>(
    `SELECT ft.*, pa.name as account_name 
     FROM financial_transactions ft 
     LEFT JOIN payment_accounts pa ON ft.account_id = pa.id 
     WHERE ${conditions.join(" AND ")} 
     ORDER BY ft.transaction_date DESC, ft.created_at DESC 
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { total: count?.count || 0, transactions, limit, offset };
}
