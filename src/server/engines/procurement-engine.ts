import type { Client } from "@libsql/client";
import { adjustInventory } from "./inventory-engine";
import { postFinancialTransaction } from "./financial-engine";

export async function nextPurchaseNumber(db: Client): Promise<string> {
  const rs = await db.execute("SELECT COUNT(*) as count FROM purchases");
  const count = Number(rs.rows[0]?.["count"] ?? 0) + 1;
  const year = new Date().getFullYear();
  return `PO-${year}-${count.toString().padStart(4, "0")}`;
}

export async function createPurchase(
  db: Client,
  input: {
    supplier_id?: string | null;
    items: Array<{
      product_id: string;
      product_name?: string;
      quantity: number;
      unit_cost: number;
    }>;
    discount?: number;
    tax?: number;
    paid_amount?: number;
    payment_account_id?: string | null;
    notes?: string | null;
    created_by?: string | null;
  },
) {
  if (!input.items || input.items.length === 0) {
    throw new Error("Purchase must contain at least one item");
  }

  let subtotal = 0;
  const itemsWithTotals = input.items.map((it) => {
    const total = it.quantity * it.unit_cost;
    subtotal += total;
    return { ...it, total };
  });

  const discount = input.discount ?? 0;
  const tax = input.tax ?? 0;
  const total = Math.max(0, subtotal - discount + tax);
  const paidAmount = input.paid_amount ?? 0;
  const balance = Math.max(0, total - paidAmount);

  let supplierName: string | null = null;
  if (input.supplier_id) {
    const sRs = await db.execute({
      sql: "SELECT name FROM suppliers WHERE id = ?",
      args: [input.supplier_id],
    });
    if (sRs.rows.length > 0) {
      supplierName = String(sRs.rows[0]["name"]);
    }
  }

  const purchaseId = `po-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const purchaseNo = await nextPurchaseNumber(db);
  const today = new Date().toISOString().split("T")[0];

  await db.execute({
    sql: `INSERT INTO purchases (
      id, purchase_no, purchase_date, supplier_id, supplier_name, subtotal, discount,
      tax, total, paid_amount, balance, payment_status, payment_account_id, status, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?)`,
    args: [
      purchaseId,
      purchaseNo,
      today,
      input.supplier_id ?? null,
      supplierName,
      subtotal,
      discount,
      tax,
      total,
      paidAmount,
      balance,
      balance === 0 ? "full_paid" : paidAmount > 0 ? "partial" : "pending",
      input.payment_account_id ?? null,
      input.notes ?? null,
      input.created_by ?? "system",
    ],
  });

  for (const item of itemsWithTotals) {
    await db.execute({
      sql: `INSERT INTO purchase_items (
        id, purchase_id, product_id, product_name, quantity, unit_cost, total
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `pi-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        purchaseId,
        item.product_id,
        item.product_name ?? null,
        item.quantity,
        item.unit_cost,
        item.total,
      ],
    });

    // Real inventory addition!
    await adjustInventory(db, {
      productId: item.product_id,
      quantityChange: item.quantity,
      movementType: "purchase",
      unitCost: item.unit_cost,
      referenceType: "purchase",
      referenceId: purchaseId,
      notes: `Purchase #${purchaseNo}`,
      createdBy: input.created_by ?? "system",
    });
  }

  if (paidAmount > 0 && input.payment_account_id) {
    await postFinancialTransaction(db, {
      txnType: "purchase_payment",
      amount: paidAmount,
      accountId: input.payment_account_id,
      category: "Inventory Procurement",
      referenceType: "purchase",
      referenceId: purchaseId,
      partyType: "supplier",
      partyId: input.supplier_id ?? null,
      description: `Purchase payment #${purchaseNo}`,
      createdBy: input.created_by ?? "system",
    });
  }

  return { id: purchaseId, purchase_no: purchaseNo, total, balance };
}

export async function recordSupplierPayment(
  db: Client,
  input: {
    supplier_id: string;
    purchase_id?: string | null;
    amount: number;
    payment_account_id: string;
    payment_method?: string;
    reference?: string | null;
    notes?: string | null;
    created_by?: string | null;
  },
) {
  if (input.amount <= 0) {
    throw new Error("Payment amount must be positive");
  }

  const pmtId = `sp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const countRs = await db.execute("SELECT COUNT(*) as count FROM supplier_payments");
  const pmtNo = `SPMT-${new Date().getFullYear()}-${(Number(countRs.rows[0]?.["count"] ?? 0) + 1).toString().padStart(4, "0")}`;
  const today = new Date().toISOString().split("T")[0];

  await db.execute({
    sql: `INSERT INTO supplier_payments (
      id, payment_no, supplier_id, purchase_id, amount, payment_date, payment_method,
      payment_account_id, reference, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      pmtId,
      pmtNo,
      input.supplier_id,
      input.purchase_id ?? null,
      input.amount,
      today,
      input.payment_method ?? "cash",
      input.payment_account_id,
      input.reference ?? null,
      input.notes ?? null,
      input.created_by ?? "system",
    ],
  });

  await postFinancialTransaction(db, {
    txnType: "purchase_payment",
    amount: input.amount,
    accountId: input.payment_account_id,
    category: "Supplier Debt Payment",
    referenceType: "supplier_payment",
    referenceId: pmtId,
    partyType: "supplier",
    partyId: input.supplier_id,
    description: `Supplier payment #${pmtNo}`,
    createdBy: input.created_by ?? "system",
  });

  if (input.purchase_id) {
    const pRs = await db.execute({
      sql: "SELECT total, paid_amount, balance FROM purchases WHERE id = ?",
      args: [input.purchase_id],
    });
    if (pRs.rows.length > 0) {
      const p = pRs.rows[0];
      const newPaid = Number(p["paid_amount"] ?? 0) + input.amount;
      const newBalance = Math.max(0, Number(p["total"] ?? 0) - newPaid);
      await db.execute({
        sql: "UPDATE purchases SET paid_amount = ?, balance = ?, payment_status = ?, updated_at = datetime('now') WHERE id = ?",
        args: [newPaid, newBalance, newBalance === 0 ? "full_paid" : "partial", input.purchase_id],
      });
    }
  }

  return { payment_id: pmtId, payment_no: pmtNo, amount: input.amount };
}
