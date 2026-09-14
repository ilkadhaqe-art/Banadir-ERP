import type { Client } from "@libsql/client";
import { adjustInventory, checkCanSell } from "./inventory-engine";
import { postFinancialTransaction } from "./financial-engine";

export async function nextSaleNumber(db: Client): Promise<string> {
  const rs = await db.execute("SELECT COUNT(*) as count FROM sales");
  const count = Number(rs.rows[0]?.["count"] ?? 0) + 1;
  const year = new Date().getFullYear();
  return `INV-${year}-${count.toString().padStart(4, "0")}`;
}

export async function createSale(
  db: Client,
  input: {
    customer_id?: string | null;
    items: Array<{
      product_id: string;
      product_name?: string;
      quantity: number;
      unit_price: number;
      cost_price?: number;
      discount?: number;
    }>;
    discount?: number;
    vat_rate?: number;
    paid_amount?: number;
    advance_amount?: number;
    payment_channel_id?: string | null;
    payment_account_id?: string | null;
    payment_method?: string | null;
    payment_status?: "full_paid" | "partial" | "full_debt";
    fulfillment?: "pickup" | "delivery" | "cargo";
    delivery_fee?: number;
    cargo_fee?: number;
    fee_paid?: number;
    recipient_name?: string | null;
    recipient_phone?: string | null;
    recipient_address?: string | null;
    delivery_zone_id?: string | null;
    cargo_company_id?: string | null;
    driver_id?: string | null;
    notes?: string | null;
    created_by?: string | null;
  },
) {
  if (!input.items || input.items.length === 0) {
    throw new Error("Sale must contain at least one item.");
  }

  // 1. Stock check
  for (const item of input.items) {
    const check = await checkCanSell(db, item.product_id, item.quantity);
    if (!check.allowed) {
      throw new Error(
        `Insufficient stock for "${check.product_name}". Requested: ${item.quantity}, Available: ${check.available_qty}`,
      );
    }
  }

  // 2. Compute financial totals
  let subtotal = 0;
  const itemsWithTotals = input.items.map((it) => {
    const itemDiscount = it.discount ?? 0;
    const itemTotal = it.quantity * it.unit_price - itemDiscount;
    subtotal += itemTotal;
    return {
      ...it,
      discount: itemDiscount,
      total: Math.max(0, itemTotal),
    };
  });

  const saleDiscount = input.discount ?? 0;
  const taxable = Math.max(0, subtotal - saleDiscount);
  const vatRate = input.vat_rate ?? 0;
  const vatAmount = (taxable * vatRate) / 100;
  const total = taxable + vatAmount;

  const deliveryFee = input.delivery_fee ?? 0;
  const cargoFee = input.cargo_fee ?? 0;
  const feePaid = input.fee_paid ?? 0;
  const feeBalance = Math.max(0, deliveryFee + cargoFee - feePaid);

  const paidAmount = input.paid_amount ?? 0;
  const balance = Math.max(0, total - paidAmount);

  let paymentStatus: "full_paid" | "partial" | "full_debt" = "full_paid";
  if (balance === 0) {
    paymentStatus = "full_paid";
  } else if (paidAmount > 0) {
    paymentStatus = "partial";
  } else {
    paymentStatus = "full_debt";
  }

  // Get customer info if provided
  let customerName: string | null = null;
  let customerPhone: string | null = null;
  let customerAddress: string | null = null;
  if (input.customer_id) {
    const cRs = await db.execute({
      sql: "SELECT name, phone, address FROM customers WHERE id = ?",
      args: [input.customer_id],
    });
    if (cRs.rows.length > 0) {
      customerName = String(cRs.rows[0]["name"] ?? "");
      customerPhone = cRs.rows[0]["phone"] ? String(cRs.rows[0]["phone"]) : null;
      customerAddress = cRs.rows[0]["address"] ? String(cRs.rows[0]["address"]) : null;
    }
  }

  const saleId = `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const saleNo = await nextSaleNumber(db);
  const now = new Date();
  const saleDate = now.toISOString().split("T")[0];
  const saleTime = now.toTimeString().split(" ")[0].slice(0, 5);

  // 3. Insert Sale
  await db.execute({
    sql: `INSERT INTO sales (
      id, sale_no, sale_date, sale_time, customer_id, customer_name, customer_phone, customer_address,
      subtotal, discount, vat_rate, vat_amount, total, paid_amount, advance_amount, returned_total,
      balance, payment_status, payment_channel_id, payment_account_id, payment_method, fulfillment,
      delivery_fee, cargo_fee, fee_paid, fee_balance, recipient_name, recipient_phone, recipient_address,
      delivery_zone_id, cargo_company_id, driver_id, notes, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`,
    args: [
      saleId,
      saleNo,
      saleDate,
      saleTime,
      input.customer_id ?? null,
      customerName,
      customerPhone,
      customerAddress,
      subtotal,
      saleDiscount,
      vatRate,
      vatAmount,
      total,
      paidAmount,
      input.advance_amount ?? 0,
      balance,
      paymentStatus,
      input.payment_channel_id ?? null,
      input.payment_account_id ?? null,
      input.payment_method ?? "cash",
      input.fulfillment ?? "pickup",
      deliveryFee,
      cargoFee,
      feePaid,
      feeBalance,
      input.recipient_name ?? customerName,
      input.recipient_phone ?? customerPhone,
      input.recipient_address ?? customerAddress,
      input.delivery_zone_id ?? null,
      input.cargo_company_id ?? null,
      input.driver_id ?? null,
      input.notes ?? null,
      input.created_by ?? "system",
    ],
  });

  // 4. Insert Sale Items & Deduct Inventory
  for (const item of itemsWithTotals) {
    const itemId = `si-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await db.execute({
      sql: `INSERT INTO sale_items (
        id, sale_id, product_id, product_name, quantity, unit_price, cost_price, discount, total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        itemId,
        saleId,
        item.product_id,
        item.product_name ?? null,
        item.quantity,
        item.unit_price,
        item.cost_price ?? 0,
        item.discount,
        item.total,
      ],
    });

    // Real inventory deduction!
    await adjustInventory(db, {
      productId: item.product_id,
      quantityChange: -item.quantity,
      movementType: "sale",
      unitPrice: item.unit_price,
      unitCost: item.cost_price,
      referenceType: "sale",
      referenceId: saleId,
      notes: `Sale #${saleNo}`,
      createdBy: input.created_by ?? "system",
    });
  }

  // 5. Post to Financial Ledger if paid
  if (paidAmount > 0 && input.payment_account_id) {
    await postFinancialTransaction(db, {
      txnType: "sale",
      amount: paidAmount,
      accountId: input.payment_account_id,
      category: "Sales Revenue",
      referenceType: "sale",
      referenceId: saleId,
      partyType: "customer",
      partyId: input.customer_id ?? null,
      description: `Payment for Sale #${saleNo}`,
      createdBy: input.created_by ?? "system",
    });
  }

  // 6. Create Delivery record if fulfillment is delivery or cargo
  if (input.fulfillment === "delivery" || input.fulfillment === "cargo") {
    const delCountRs = await db.execute("SELECT COUNT(*) as count FROM deliveries");
    const delNum = `DEL-${now.getFullYear()}-${(Number(delCountRs.rows[0]?.["count"] ?? 0) + 1).toString().padStart(4, "0")}`;
    const delId = `del-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await db.execute({
      sql: `INSERT INTO deliveries (
        id, delivery_no, sale_id, status, fulfillment, driver_id, delivery_zone_id, cargo_company_id,
        recipient_name, recipient_phone, recipient_address, fee, fee_paid, fee_balance, cod_amount, cod_collected
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      args: [
        delId,
        delNum,
        saleId,
        input.driver_id ? "assigned" : "pending",
        input.fulfillment,
        input.driver_id ?? null,
        input.delivery_zone_id ?? null,
        input.cargo_company_id ?? null,
        input.recipient_name ?? customerName,
        input.recipient_phone ?? customerPhone,
        input.recipient_address ?? customerAddress,
        deliveryFee + cargoFee,
        feePaid,
        feeBalance,
        balance, // COD amount is whatever remains unpaid
      ],
    });
  }

  return {
    id: saleId,
    sale_no: saleNo,
    total,
    paid_amount: paidAmount,
    balance,
    payment_status: paymentStatus,
  };
}

export async function reverseSale(db: Client, saleId: string, createdBy = "system") {
  const rs = await db.execute({
    sql: "SELECT * FROM sales WHERE id = ?",
    args: [saleId],
  });
  if (rs.rows.length === 0) {
    throw new Error(`Sale ${saleId} not found`);
  }
  const sale = rs.rows[0];
  if (sale["status"] === "reversed") {
    throw new Error("Sale is already reversed");
  }

  // 1. Restore Inventory
  const itemsRs = await db.execute({
    sql: "SELECT product_id, quantity, unit_price, cost_price FROM sale_items WHERE sale_id = ?",
    args: [saleId],
  });
  for (const row of itemsRs.rows) {
    await adjustInventory(db, {
      productId: String(row["product_id"]),
      quantityChange: Number(row["quantity"]),
      movementType: "sale_return",
      unitPrice: Number(row["unit_price"]),
      unitCost: Number(row["cost_price"]),
      referenceType: "sale_reversal",
      referenceId: saleId,
      notes: `Reversal of Sale #${sale["sale_no"]}`,
      createdBy,
    });
  }

  // 2. Reverse Financial Transaction if money was paid
  const paidAmount = Number(sale["paid_amount"] ?? 0);
  if (paidAmount > 0 && sale["payment_account_id"]) {
    await postFinancialTransaction(db, {
      txnType: "refund",
      amount: paidAmount,
      accountId: String(sale["payment_account_id"]),
      category: "Sales Reversal Refund",
      referenceType: "sale_reversal",
      referenceId: saleId,
      partyType: "customer",
      partyId: sale["customer_id"] ? String(sale["customer_id"]) : null,
      description: `Reversal refund for Sale #${sale["sale_no"]}`,
      createdBy,
    });
  }

  // 3. Mark Sale reversed
  await db.execute({
    sql: "UPDATE sales SET status = 'reversed', balance = 0, updated_at = datetime('now') WHERE id = ?",
    args: [saleId],
  });

  return { success: true, sale_id: saleId };
}

export async function recordCollection(
  db: Client,
  input: {
    customer_id: string;
    sale_id?: string | null;
    amount: number;
    payment_account_id: string;
    payment_method?: string;
    reference?: string | null;
    notes?: string | null;
    created_by?: string | null;
  },
) {
  if (input.amount <= 0) {
    throw new Error("Collection amount must be positive");
  }

  const pmtId = `cp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const countRs = await db.execute("SELECT COUNT(*) as count FROM customer_payments");
  const pmtNo = `PMT-${new Date().getFullYear()}-${(Number(countRs.rows[0]?.["count"] ?? 0) + 1).toString().padStart(4, "0")}`;
  const today = new Date().toISOString().split("T")[0];

  // Insert payment
  await db.execute({
    sql: `INSERT INTO customer_payments (
      id, payment_no, customer_id, sale_id, amount, payment_date, payment_method,
      payment_account_id, reference, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      pmtId,
      pmtNo,
      input.customer_id,
      input.sale_id ?? null,
      input.amount,
      today,
      input.payment_method ?? "cash",
      input.payment_account_id,
      input.reference ?? null,
      input.notes ?? null,
      input.created_by ?? "system",
    ],
  });

  // Post to financial ledger
  await postFinancialTransaction(db, {
    txnType: "collection",
    amount: input.amount,
    accountId: input.payment_account_id,
    category: "Customer Debt Collection",
    referenceType: "customer_payment",
    referenceId: pmtId,
    partyType: "customer",
    partyId: input.customer_id,
    description: `Debt collection #${pmtNo}`,
    createdBy: input.created_by ?? "system",
  });

  // If applied to a specific sale, update the sale balance and paid_amount
  if (input.sale_id) {
    const saleRs = await db.execute({
      sql: "SELECT total, paid_amount, balance FROM sales WHERE id = ?",
      args: [input.sale_id],
    });
    if (saleRs.rows.length > 0) {
      const s = saleRs.rows[0];
      const newPaid = Number(s["paid_amount"] ?? 0) + input.amount;
      const newBalance = Math.max(0, Number(s["total"] ?? 0) - newPaid);
      const newStatus = newBalance === 0 ? "full_paid" : "partial";

      await db.execute({
        sql: "UPDATE sales SET paid_amount = ?, balance = ?, payment_status = ?, updated_at = datetime('now') WHERE id = ?",
        args: [newPaid, newBalance, newStatus, input.sale_id],
      });
    }
  }

  return { payment_id: pmtId, payment_no: pmtNo, amount: input.amount };
}
