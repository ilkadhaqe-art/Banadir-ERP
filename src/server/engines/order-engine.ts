import type { Client } from "@libsql/client";
import { createSale } from "./sales-engine";

export async function nextOrderNumber(db: Client): Promise<string> {
  const rs = await db.execute("SELECT COUNT(*) as count FROM orders");
  const count = Number(rs.rows[0]?.["count"] ?? 0) + 1;
  const year = new Date().getFullYear();
  return `ORD-${year}-${count.toString().padStart(4, "0")}`;
}

export async function createOrder(
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
    advance_amount?: number;
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
    throw new Error("Order must contain at least one item.");
  }

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

  const orderDiscount = input.discount ?? 0;
  const taxable = Math.max(0, subtotal - orderDiscount);
  const vatRate = input.vat_rate ?? 0;
  const vatAmount = (taxable * vatRate) / 100;
  const total = taxable + vatAmount;

  const deliveryFee = input.delivery_fee ?? 0;
  const cargoFee = input.cargo_fee ?? 0;
  const feePaid = input.fee_paid ?? 0;
  const feeBalance = Math.max(0, deliveryFee + cargoFee - feePaid);

  const advance = input.advance_amount ?? 0;
  const balance = Math.max(0, total - advance);

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

  const orderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const orderNo = await nextOrderNumber(db);
  const today = new Date().toISOString().split("T")[0];

  await db.execute({
    sql: `INSERT INTO orders (
      id, order_no, order_date, customer_id, customer_name, customer_phone, customer_address,
      subtotal, discount, vat_rate, vat_amount, total, advance_amount, balance, payment_status,
      fulfillment, delivery_fee, cargo_fee, fee_paid, fee_balance, recipient_name, recipient_phone,
      recipient_address, delivery_zone_id, cargo_company_id, driver_id, status, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    args: [
      orderId,
      orderNo,
      today,
      input.customer_id ?? null,
      customerName,
      customerPhone,
      customerAddress,
      subtotal,
      orderDiscount,
      vatRate,
      vatAmount,
      total,
      advance,
      balance,
      advance > 0 ? "partial" : "pending",
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

  for (const item of itemsWithTotals) {
    await db.execute({
      sql: `INSERT INTO order_items (
        id, order_id, product_id, product_name, quantity, unit_price, cost_price, discount, total
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        `oi-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        orderId,
        item.product_id,
        item.product_name ?? null,
        item.quantity,
        item.unit_price,
        item.cost_price ?? 0,
        item.discount,
        item.total,
      ],
    });
  }

  return { id: orderId, order_no: orderNo, total, balance };
}

export async function convertOrderToSale(
  db: Client,
  input: {
    order_id: string;
    payment_account_id?: string;
    payment_channel_id?: string;
    payment_method?: string;
    paid_amount?: number;
    created_by?: string;
  },
) {
  const oRs = await db.execute({
    sql: "SELECT * FROM orders WHERE id = ?",
    args: [input.order_id],
  });
  if (oRs.rows.length === 0) {
    throw new Error(`Order ${input.order_id} not found`);
  }
  const order = oRs.rows[0];
  if (order["status"] === "converted") {
    throw new Error("Order is already converted to a sale.");
  }
  if (order["status"] === "cancelled") {
    throw new Error("Cannot convert a cancelled order.");
  }

  // Get order items
  const itemsRs = await db.execute({
    sql: "SELECT product_id, product_name, quantity, unit_price, cost_price, discount FROM order_items WHERE order_id = ?",
    args: [input.order_id],
  });

  const items = itemsRs.rows.map((r) => ({
    product_id: String(r["product_id"]),
    product_name: r["product_name"] ? String(r["product_name"]) : undefined,
    quantity: Number(r["quantity"]),
    unit_price: Number(r["unit_price"]),
    cost_price: Number(r["cost_price"]),
    discount: Number(r["discount"]),
  }));

  // Create real sale
  const sale = await createSale(db, {
    customer_id: order["customer_id"] ? String(order["customer_id"]) : null,
    items,
    discount: Number(order["discount"] ?? 0),
    vat_rate: Number(order["vat_rate"] ?? 0),
    paid_amount: input.paid_amount ?? Number(order["advance_amount"] ?? 0),
    advance_amount: Number(order["advance_amount"] ?? 0),
    payment_channel_id: input.payment_channel_id ?? null,
    payment_account_id: input.payment_account_id ?? null,
    payment_method: input.payment_method ?? "cash",
    fulfillment: (order["fulfillment"] as "pickup" | "delivery" | "cargo") ?? "pickup",
    delivery_fee: Number(order["delivery_fee"] ?? 0),
    cargo_fee: Number(order["cargo_fee"] ?? 0),
    fee_paid: Number(order["fee_paid"] ?? 0),
    recipient_name: order["recipient_name"] ? String(order["recipient_name"]) : null,
    recipient_phone: order["recipient_phone"] ? String(order["recipient_phone"]) : null,
    recipient_address: order["recipient_address"] ? String(order["recipient_address"]) : null,
    delivery_zone_id: order["delivery_zone_id"] ? String(order["delivery_zone_id"]) : null,
    cargo_company_id: order["cargo_company_id"] ? String(order["cargo_company_id"]) : null,
    driver_id: order["driver_id"] ? String(order["driver_id"]) : null,
    notes: `Converted from Order #${order["order_no"]}`,
    created_by: input.created_by ?? "system",
  });

  // Update order status
  await db.execute({
    sql: "UPDATE orders SET status = 'converted', converted_sale_id = ?, updated_at = datetime('now') WHERE id = ?",
    args: [sale.id, input.order_id],
  });

  return { success: true, order_id: input.order_id, sale_id: sale.id, sale_no: sale.sale_no };
}

export async function cancelOrder(db: Client, orderId: string) {
  await db.execute({
    sql: "UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?",
    args: [orderId],
  });
  return { success: true, order_id: orderId };
}
