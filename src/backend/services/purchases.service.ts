import { getDatabase, SqlDatabase } from "../db/database";
import { recordStockMovement } from "./inventory.service";
import { logAudit } from "./audit.service";

export interface CreatePurchaseItemInput {
  productId: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseInput {
  invoiceNo?: string;
  supplierId: string;
  purchaseDate?: string;
  items: CreatePurchaseItemInput[];
  discount?: number;
  paidAmount?: number;
  paymentMethod?: string;
  accountId?: string;
  notes?: string;
  createdBy?: string;
}

export async function createPurchase(input: CreatePurchaseInput) {
  const db = await getDatabase();

  return db.transaction(() => {
    if (!input.items || input.items.length === 0) {
      throw new Error("Wax alaab ah lama dooran (At least one item is required for purchase)");
    }

    const supplier = db.get<{ id: string; name: string }>(
      "SELECT id, name FROM suppliers WHERE id = ?",
      [input.supplierId],
    );
    if (!supplier) {
      throw new Error(`Supplier ${input.supplierId} not found`);
    }

    const purchaseId = "pur-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    const purchaseDate = input.purchaseDate || new Date().toISOString().split("T")[0];

    // Auto-generate invoice number if omitted
    let invoiceNo = input.invoiceNo;
    if (!invoiceNo) {
      const lastPur = db.get<{ count: number }>("SELECT COUNT(*) as count FROM purchases");
      invoiceNo = `INV-${(lastPur?.count || 0) + 1001}`;
    }

    let subtotal = 0;
    const itemsToInsert: {
      id: string;
      productId: string;
      quantity: number;
      unitCost: number;
      lineTotal: number;
    }[] = [];

    for (const it of input.items) {
      if (it.quantity <= 0) {
        throw new Error("Tirada alaabta waa in ay ka weynaataa 0 (Quantity must be > 0)");
      }
      if (it.unitCost < 0) {
        throw new Error("Qiimaha iibka ma noqon karo wax ka yar 0 (Unit cost cannot be negative)");
      }

      const product = db.get<{ id: string; name: string; sku: string }>(
        "SELECT id, name, sku FROM products WHERE id = ?",
        [it.productId],
      );
      if (!product) {
        throw new Error(`Product ${it.productId} not found`);
      }

      const lineTotal = Math.round(it.quantity * it.unitCost * 100) / 100;
      subtotal += lineTotal;

      // Increase stock via inventory movement
      recordStockMovement(
        {
          productId: it.productId,
          movementType: "purchase",
          quantity: it.quantity,
          unitCost: it.unitCost,
          reference: invoiceNo,
          sourceModule: "purchases",
          sourceId: purchaseId,
          notes: `Soo iibsi (Purchase from ${supplier.name})`,
          createdBy: input.createdBy,
        },
        db,
      );

      // Update product cost_price
      db.run("UPDATE products SET cost_price = ?, updated_at = datetime('now') WHERE id = ?", [
        it.unitCost,
        it.productId,
      ]);

      itemsToInsert.push({
        id: "pitem-" + Math.random().toString(36).substring(2, 9),
        productId: it.productId,
        quantity: it.quantity,
        unitCost: it.unitCost,
        lineTotal,
      });
    }

    const discount = Math.round((input.discount || 0) * 100) / 100;
    const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
    const paidAmount = Math.min(
      total,
      Math.round((input.paidAmount !== undefined ? input.paidAmount : total) * 100) / 100,
    );
    const remainingBalance = Math.max(0, Math.round((total - paidAmount) * 100) / 100);

    // Insert purchase
    db.run(
      `INSERT INTO purchases (
        id, invoice_no, supplier_id, purchase_date, total, paid_amount, discount,
        remaining_balance, payment_method, account_id, status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?)`,
      [
        purchaseId,
        invoiceNo,
        input.supplierId,
        purchaseDate,
        total,
        paidAmount,
        discount,
        remainingBalance,
        input.paymentMethod || "cash",
        input.accountId || null,
        input.notes || null,
        input.createdBy || null,
      ],
    );

    // Insert purchase items
    for (const it of itemsToInsert) {
      db.run(
        `INSERT INTO purchase_items (id, purchase_id, product_id, quantity, unit_cost, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [it.id, purchaseId, it.productId, it.quantity, it.unitCost, it.lineTotal],
      );
    }

    // Update supplier balance
    db.run(
      `UPDATE suppliers SET 
        current_balance = current_balance + ?,
        total_purchases = total_purchases + ?,
        total_paid = total_paid + ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [remainingBalance, total, paidAmount, input.supplierId],
    );

    // Deduct cash from account if payment made
    if (paidAmount > 0 && input.accountId) {
      const txnId = "txn-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
      db.run(
        `INSERT INTO financial_transactions (
          id, transaction_date, kind, category, amount, account_id, reference, source_module, source_id, note, created_by
        ) VALUES (?, ?, 'supplier_payment', 'Purchases / Inventory', ?, ?, ?, 'purchases', ?, ?, ?)`,
        [
          txnId,
          purchaseDate,
          paidAmount,
          input.accountId,
          invoiceNo,
          purchaseId,
          `Bixin lacag soo iibsi: ${supplier.name} (${invoiceNo})`,
          input.createdBy || null,
        ],
      );

      db.run(
        `UPDATE payment_accounts SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?`,
        [paidAmount, input.accountId],
      );
    }

    logAudit(
      {
        userId: input.createdBy,
        action: "CREATE_PURCHASE",
        module: "purchases",
        recordId: purchaseId,
        afterState: {
          invoiceNo,
          total,
          paidAmount,
          remainingBalance,
          supplierId: input.supplierId,
        },
        reason: `Purchase created from ${supplier.name}`,
      },
      db,
    );

    return getPurchaseById(purchaseId, db);
  });
}

export async function voidPurchase(purchaseId: string, reason: string, userId?: string) {
  const db = await getDatabase();

  return db.transaction(() => {
    const purchase = db.get<{
      id: string;
      invoice_no: string;
      supplier_id: string;
      total: number;
      paid_amount: number;
      remaining_balance: number;
      account_id: string | null;
      status: string;
    }>("SELECT * FROM purchases WHERE id = ?", [purchaseId]);

    if (!purchase) {
      throw new Error(`Purchase ${purchaseId} not found`);
    }
    if (purchase.status === "voided") {
      throw new Error("Soo iibsigani horay ayaa loo baabi'iyay (Purchase already voided)");
    }

    // Deduct stock for all items
    const items = db.query<{ product_id: string; quantity: number; unit_cost: number }>(
      "SELECT product_id, quantity, unit_cost FROM purchase_items WHERE purchase_id = ?",
      [purchaseId],
    );

    for (const it of items) {
      recordStockMovement(
        {
          productId: it.product_id,
          movementType: "purchase_return",
          quantity: -it.quantity,
          unitCost: it.unit_cost,
          reference: purchase.invoice_no,
          sourceModule: "purchases_void",
          sourceId: purchaseId,
          notes: `Baabi'inta soo iibsiga ${purchase.invoice_no}: ${reason}`,
          createdBy: userId,
        },
        db,
      );
    }

    // Reverse supplier balances
    db.run(
      `UPDATE suppliers SET 
        current_balance = MAX(0, current_balance - ?),
        total_purchases = MAX(0, total_purchases - ?),
        total_paid = MAX(0, total_paid - ?),
        updated_at = datetime('now')
       WHERE id = ?`,
      [purchase.remaining_balance, purchase.total, purchase.paid_amount, purchase.supplier_id],
    );

    // Refund cash if paid
    if (purchase.paid_amount > 0 && purchase.account_id) {
      const txnId = "txn-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
      db.run(
        `INSERT INTO financial_transactions (
          id, transaction_date, kind, category, amount, account_id, reference, source_module, source_id, note, created_by
        ) VALUES (?, date('now'), 'income', 'Purchase Void Refund', ?, ?, ?, 'purchases_void', ?, ?, ?)`,
        [
          txnId,
          purchase.paid_amount,
          purchase.account_id,
          purchase.invoice_no,
          purchaseId,
          `Soo celin lacag soo iibsi la baabi'iyay: ${purchase.invoice_no}`,
          userId || null,
        ],
      );

      db.run(
        `UPDATE payment_accounts SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`,
        [purchase.paid_amount, purchase.account_id],
      );
    }

    db.run("UPDATE purchases SET status = 'voided' WHERE id = ?", [purchaseId]);

    logAudit(
      {
        userId,
        action: "VOID_PURCHASE",
        module: "purchases",
        recordId: purchaseId,
        beforeState: { status: purchase.status, total: purchase.total },
        afterState: { status: "voided" },
        reason,
      },
      db,
    );

    return { success: true, message: `Purchase ${purchase.invoice_no} voided` };
  });
}

export async function getPurchaseById(purchaseId: string, externalDb?: SqlDatabase) {
  const db = externalDb || (await getDatabase());

  const purchase = db.get<Record<string, unknown>>(
    `SELECT p.*, s.name as supplier_name, s.phone as supplier_phone
     FROM purchases p
     LEFT JOIN suppliers s ON p.supplier_id = s.id
     WHERE p.id = ?`,
    [purchaseId],
  );
  if (!purchase) return null;

  const items = db.query<Record<string, unknown>>(
    `SELECT pi.*, pr.name as product_name, pr.sku as product_sku, pr.unit
     FROM purchase_items pi
     JOIN products pr ON pi.product_id = pr.id
     WHERE pi.purchase_id = ?`,
    [purchaseId],
  );

  return { ...purchase, items };
}

export async function listPurchases(filters: {
  search?: string;
  supplierId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDatabase();
  const conditions: string[] = ["1=1"];
  const params: (string | number)[] = [];

  if (filters.search) {
    conditions.push("(p.invoice_no LIKE ? OR s.name LIKE ? OR p.notes LIKE ?)");
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  if (filters.supplierId) {
    conditions.push("p.supplier_id = ?");
    params.push(filters.supplierId);
  }

  if (filters.status) {
    conditions.push("p.status = ?");
    params.push(filters.status);
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const countRow = db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE ${conditions.join(" AND ")}`,
    params,
  );

  const purchases = db.query<Record<string, unknown>>(
    `SELECT p.*, s.name as supplier_name, s.phone as supplier_phone
     FROM purchases p
     LEFT JOIN suppliers s ON p.supplier_id = s.id
     WHERE ${conditions.join(" AND ")}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return {
    total: countRow?.count || 0,
    purchases,
    limit,
    offset,
  };
}
