import type { Client } from "@libsql/client";

export async function postFinancialTransaction(
  db: Client,
  txn: {
    txnType:
      | "sale"
      | "collection"
      | "expense"
      | "income"
      | "transfer"
      | "purchase_payment"
      | "refund"
      | "driver_settlement"
      | "capital";
    amount: number;
    feeAmount?: number;
    accountId?: string | null;
    toAccountId?: string | null;
    category?: string | null;
    referenceType?: string | null;
    referenceId?: string | null;
    partyType?: "customer" | "supplier" | "driver" | "other" | null;
    partyId?: string | null;
    description: string;
    createdBy?: string | null;
    txnDate?: string;
  },
) {
  const fee = txn.feeAmount ?? 0;
  const netAmount = txn.amount - fee;
  const dateStr = txn.txnDate ?? new Date().toISOString().split("T")[0];
  const txnNo = `TXN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

  // Record in financial_transactions
  await db.execute({
    sql: `INSERT INTO financial_transactions (
      id, txn_no, txn_date, txn_type, amount, fee_amount, net_amount,
      account_id, to_account_id, category, reference_type, reference_id,
      party_type, party_id, description, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
    args: [
      `txn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      txnNo,
      dateStr,
      txn.txnType,
      txn.amount,
      fee,
      netAmount,
      txn.accountId ?? null,
      txn.toAccountId ?? null,
      txn.category ?? null,
      txn.referenceType ?? null,
      txn.referenceId ?? null,
      txn.partyType ?? null,
      txn.partyId ?? null,
      txn.description,
      txn.createdBy ?? "system",
    ],
  });

  // Adjust account balances
  if (txn.accountId) {
    if (
      txn.txnType === "sale" ||
      txn.txnType === "collection" ||
      txn.txnType === "income" ||
      txn.txnType === "driver_settlement" ||
      txn.txnType === "capital"
    ) {
      // Inflow
      await db.execute({
        sql: "UPDATE payment_accounts SET current_balance = current_balance + ?, updated_at = datetime('now') WHERE id = ?",
        args: [netAmount, txn.accountId],
      });
    } else if (
      txn.txnType === "expense" ||
      txn.txnType === "purchase_payment" ||
      txn.txnType === "refund"
    ) {
      // Outflow
      await db.execute({
        sql: "UPDATE payment_accounts SET current_balance = current_balance - ?, updated_at = datetime('now') WHERE id = ?",
        args: [txn.amount, txn.accountId],
      });
    }
  }

  // Handle transfer
  if (txn.txnType === "transfer" && txn.accountId && txn.toAccountId) {
    await db.execute({
      sql: "UPDATE payment_accounts SET current_balance = current_balance - ?, updated_at = datetime('now') WHERE id = ?",
      args: [txn.amount, txn.accountId],
    });
    await db.execute({
      sql: "UPDATE payment_accounts SET current_balance = current_balance + ?, updated_at = datetime('now') WHERE id = ?",
      args: [netAmount, txn.toAccountId],
    });
  }

  return txnNo;
}

export async function getFinancialSnapshot(db: Client) {
  // Aggregate accounts cash
  const accRs = await db.execute(
    "SELECT SUM(current_balance) as total_cash FROM payment_accounts WHERE is_active = 1",
  );
  const totalCash = Number(accRs.rows[0]?.["total_cash"] ?? 0);

  // Total sales & collections
  const salesRs = await db.execute(`
    SELECT 
      COALESCE(SUM(total), 0) as total_sales,
      COALESCE(SUM(paid_amount), 0) as paid_amount,
      COALESCE(SUM(balance), 0) as total_receivables
    FROM sales WHERE status = 'completed'
  `);
  const totalSales = Number(salesRs.rows[0]?.["total_sales"] ?? 0);
  const totalReceivables = Number(salesRs.rows[0]?.["total_receivables"] ?? 0);

  // Total purchases & payables
  const purchRs = await db.execute(`
    SELECT 
      COALESCE(SUM(total), 0) as total_purchases,
      COALESCE(SUM(paid_amount), 0) as paid_purchases,
      COALESCE(SUM(balance), 0) as total_payables
    FROM purchases WHERE status = 'received'
  `);
  const totalPurchases = Number(purchRs.rows[0]?.["total_purchases"] ?? 0);
  const totalPayables = Number(purchRs.rows[0]?.["total_payables"] ?? 0);

  // Total expenses
  const expRs = await db.execute(`
    SELECT COALESCE(SUM(amount), 0) as total_expenses
    FROM financial_transactions WHERE txn_type = 'expense' AND status = 'completed'
  `);
  const totalExpenses = Number(expRs.rows[0]?.["total_expenses"] ?? 0);

  // Total direct income
  const incRs = await db.execute(`
    SELECT COALESCE(SUM(amount), 0) as total_income
    FROM financial_transactions WHERE txn_type = 'income' AND status = 'completed'
  `);
  const totalOtherIncome = Number(incRs.rows[0]?.["total_income"] ?? 0);

  // Cost of goods sold (COGS)
  const cogsRs = await db.execute(`
    SELECT COALESCE(SUM(si.quantity * si.cost_price), 0) as cogs
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE s.status = 'completed'
  `);
  const cogs = Number(cogsRs.rows[0]?.["cogs"] ?? 0);

  const grossProfit = totalSales - cogs;
  const netProfit = grossProfit + totalOtherIncome - totalExpenses;

  // Inventory valuation
  const invRs = await db.execute(`
    SELECT COALESCE(SUM(stock_quantity * cost_price), 0) as inventory_value,
           COALESCE(SUM(stock_quantity * selling_price), 0) as retail_value
    FROM products WHERE is_active = 1
  `);
  const inventoryValue = Number(invRs.rows[0]?.["inventory_value"] ?? 0);
  const retailValue = Number(invRs.rows[0]?.["retail_value"] ?? 0);

  return {
    total_sales: totalSales,
    gross_profit: grossProfit,
    total_expenses: totalExpenses,
    net_profit: netProfit,
    total_cash: totalCash,
    total_receivables: totalReceivables,
    total_payables: totalPayables,
    inventory_value: inventoryValue,
    retail_value: retailValue,
    cogs: cogs,
    profit_margin: totalSales > 0 ? (netProfit / totalSales) * 100 : 0,
  };
}

export async function getBusinessOverview(db: Client) {
  const snapshot = await getFinancialSnapshot(db);

  // Orders counts
  const ordersRs = await db.execute(`
    SELECT 
      COUNT(*) as total_orders,
      SUM(CASE WHEN status = 'delivered' OR status = 'converted' THEN 1 ELSE 0 END) as delivered_orders,
      SUM(CASE WHEN status = 'pending' OR status = 'confirmed' THEN 1 ELSE 0 END) as open_orders
    FROM orders
  `);
  const totalOrders = Number(ordersRs.rows[0]?.["total_orders"] ?? 0);
  const deliveredOrders = Number(ordersRs.rows[0]?.["delivered_orders"] ?? 0);
  const openOrders = Number(ordersRs.rows[0]?.["open_orders"] ?? 0);

  // Active Customers
  const custRs = await db.execute("SELECT COUNT(*) as count FROM customers WHERE active = 1");
  const activeCustomers = Number(custRs.rows[0]?.["count"] ?? 0);

  // Active Products
  const prodRs = await db.execute("SELECT COUNT(*) as count FROM products WHERE is_active = 1");
  const activeProducts = Number(prodRs.rows[0]?.["count"] ?? 0);

  return {
    ...snapshot,
    total_orders: totalOrders,
    delivered_orders: deliveredOrders,
    open_orders: openOrders,
    active_customers: activeCustomers,
    active_products: activeProducts,
    delivery_success_rate: totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 100,
  };
}
