import type { Client } from "@libsql/client";
import { postFinancialTransaction } from "./financial-engine";

export async function recordExpense(
  db: Client,
  input: {
    amount: number;
    account_id: string;
    category: string;
    description: string;
    reference_id?: string | null;
    created_by?: string | null;
    txn_date?: string;
  },
) {
  if (input.amount <= 0) {
    throw new Error("Expense amount must be greater than zero");
  }

  const txnNo = await postFinancialTransaction(db, {
    txnType: "expense",
    amount: input.amount,
    accountId: input.account_id,
    category: input.category,
    referenceType: "direct_expense",
    referenceId: input.reference_id ?? null,
    partyType: "other",
    description: input.description,
    createdBy: input.created_by ?? "system",
    txnDate: input.txn_date,
  });

  return { success: true, txn_no: txnNo, amount: input.amount };
}

export async function recordIncome(
  db: Client,
  input: {
    amount: number;
    account_id: string;
    category: string;
    description: string;
    reference_id?: string | null;
    created_by?: string | null;
    txn_date?: string;
  },
) {
  if (input.amount <= 0) {
    throw new Error("Income amount must be greater than zero");
  }

  const txnNo = await postFinancialTransaction(db, {
    txnType: "income",
    amount: input.amount,
    accountId: input.account_id,
    category: input.category,
    referenceType: "direct_income",
    referenceId: input.reference_id ?? null,
    partyType: "other",
    description: input.description,
    createdBy: input.created_by ?? "system",
    txnDate: input.txn_date,
  });

  return { success: true, txn_no: txnNo, amount: input.amount };
}

export async function createAccountTransfer(
  db: Client,
  input: {
    from_account_id: string;
    to_account_id: string;
    amount: number;
    note?: string | null;
    created_by?: string | null;
  },
) {
  if (input.amount <= 0) {
    throw new Error("Transfer amount must be greater than zero");
  }
  if (input.from_account_id === input.to_account_id) {
    throw new Error("Source and destination accounts cannot be identical");
  }

  const transferId = `trf-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const today = new Date().toISOString().split("T")[0];

  await db.execute({
    sql: `INSERT INTO account_transfers (
      id, transfer_date, from_account_id, to_account_id, amount, note, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)`,
    args: [
      transferId,
      today,
      input.from_account_id,
      input.to_account_id,
      input.amount,
      input.note ?? null,
      input.created_by ?? "system",
    ],
  });

  await postFinancialTransaction(db, {
    txnType: "transfer",
    amount: input.amount,
    accountId: input.from_account_id,
    toAccountId: input.to_account_id,
    category: "Internal Account Transfer",
    referenceType: "transfer",
    referenceId: transferId,
    description: input.note ?? `Transfer between accounts`,
    createdBy: input.created_by ?? "system",
  });

  return { success: true, transfer_id: transferId, amount: input.amount };
}

export async function voidFinancialTransaction(db: Client, txnId: string, actorId = "system") {
  const rs = await db.execute({
    sql: "SELECT * FROM financial_transactions WHERE id = ?",
    args: [txnId],
  });
  if (rs.rows.length === 0) {
    throw new Error(`Transaction ${txnId} not found`);
  }

  const txn = rs.rows[0];
  if (txn["status"] === "voided") {
    throw new Error("Transaction is already voided");
  }

  const amount = Number(txn["amount"] ?? 0);
  const accountId = txn["account_id"] ? String(txn["account_id"]) : null;

  // Reverse account balances
  if (accountId) {
    const txnType = String(txn["txn_type"]);
    if (
      txnType === "sale" ||
      txnType === "collection" ||
      txnType === "income" ||
      txnType === "driver_settlement" ||
      txnType === "capital"
    ) {
      // Deduct previously added money
      await db.execute({
        sql: "UPDATE payment_accounts SET current_balance = current_balance - ?, updated_at = datetime('now') WHERE id = ?",
        args: [amount, accountId],
      });
    } else if (txnType === "expense" || txnType === "purchase_payment" || txnType === "refund") {
      // Refund previously deducted money
      await db.execute({
        sql: "UPDATE payment_accounts SET current_balance = current_balance + ?, updated_at = datetime('now') WHERE id = ?",
        args: [amount, accountId],
      });
    }
  }

  await db.execute({
    sql: "UPDATE financial_transactions SET status = 'voided' WHERE id = ?",
    args: [txnId],
  });

  return { success: true, txn_id: txnId, status: "voided" };
}
