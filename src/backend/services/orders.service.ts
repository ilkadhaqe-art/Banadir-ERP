import { getDatabase, SqlDatabase } from "../db/database";
import { createSale } from "./sales.service";
import { logAudit } from "./audit.service";

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderInput {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: CreateOrderItemInput[];
  discount?: number;
  deliveryFee?: number;
  fulfillment?: "pickup" | "delivery" | "cargo";
  zoneId?: string;
  cargoCompanyId?: string;
  note?: string;
  createdBy?: string;
}

export async function createOrder(input: CreateOrderInput) {
  const db = await getDatabase();

  return db.transaction(() => {
    if (!input.items || input.items.length === 0) {
      throw new Error("Wax alaab ah lama dooran (At least one item is required for order)");
    }

    const lastOrder = db.get<{ count: number }>("SELECT COUNT(*) as count FROM orders");
    const orderNo = `ORD${((lastOrder?.count || 0) + 1).toString().padStart(5, "0")}`;
    const orderId = "ord-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    const orderDate = new Date().toISOString().split("T")[0];

    let subtotal = 0;
    for (const it of input.items) {
      subtotal += it.quantity * it.unitPrice;
    }

    const discount = input.discount || 0;
    const deliveryFee = input.deliveryFee || 0;
    const total = Math.max(0, subtotal - discount + deliveryFee);

    db.run(
      `INSERT INTO orders (
        id, order_no, order_date, customer_id, customer_name, customer_phone,
        customer_address, subtotal, discount, delivery_fee, total, fulfillment,
        status, zone_id, cargo_company_id, address, note, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
      [
        orderId,
        orderNo,
        orderDate,
        input.customerId || null,
        input.customerName || null,
        input.customerPhone || null,
        input.customerAddress || null,
        subtotal,
        discount,
        deliveryFee,
        total,
        input.fulfillment || "delivery",
        input.zoneId || null,
        input.cargoCompanyId || null,
        input.customerAddress || null,
        input.note || null,
        input.createdBy || null,
      ],
    );

    for (const it of input.items) {
      db.run(
        `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          "oitem-" + Math.random().toString(36).substring(2, 9),
          orderId,
          it.productId,
          it.quantity,
          it.unitPrice,
          it.quantity * it.unitPrice,
        ],
      );
    }

    logAudit(
      {
        userId: input.createdBy,
        action: "CREATE_ORDER",
        module: "orders",
        recordId: orderId,
        afterState: { orderNo, total, itemsCount: input.items.length },
      },
      db,
    );

    return getOrderByIdSync(orderId, db);
  });
}

export function getOrderByIdSync(orderId: string, db: SqlDatabase) {
  const order = db.get<Record<string, unknown>>("SELECT * FROM orders WHERE id = ?", [orderId]);
  if (!order) return null;

  const items = db.query<Record<string, unknown>>(
    `SELECT oi.*, p.name as product_name, p.sku as product_sku 
     FROM order_items oi 
     JOIN products p ON oi.product_id = p.id 
     WHERE oi.order_id = ?`,
    [orderId],
  );

  return { ...order, items };
}

export async function getOrderById(orderId: string) {
  const db = await getDatabase();
  return getOrderByIdSync(orderId, db);
}

export async function convertOrderToSale(
  orderId: string,
  saleParams: {
    paidAmount?: number;
    paymentMethod?: string;
    accountId?: string;
    driverId?: string;
    deliveryCompanyId?: string;
    createdBy?: string;
  },
) {
  const db = await getDatabase();

  const order = await getOrderById(orderId);
  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }
  if (order.status === "converted") {
    throw new Error("Dalabkani horay ayaa loogu beddelay iib (Order already converted to sale)");
  }
  if (order.status === "cancelled") {
    throw new Error(
      "Dalab baabi'iyay looma beddeli karo iib (Cancelled order cannot be converted)",
    );
  }

  const rawItems = (order.items || []) as Record<string, unknown>[];
  const items = rawItems.map((it) => ({
    productId: String(it.product_id),
    quantity: Number(it.quantity),
    unitPrice: Number(it.unit_price),
  }));

  const sale = await createSale({
    customerId: order.customer_id as string,
    customerName: order.customer_name as string,
    customerPhone: order.customer_phone as string,
    customerAddress: order.customer_address as string,
    items,
    discount: Number(order.discount) || 0,
    deliveryFee: Number(order.delivery_fee) || 0,
    paidAmount: saleParams.paidAmount,
    paymentMethod: saleParams.paymentMethod || "cash",
    accountId: saleParams.accountId,
    fulfillmentType: (order.fulfillment as "pickup" | "delivery" | "cargo") || "delivery",
    driverId: saleParams.driverId,
    deliveryCompanyId: saleParams.deliveryCompanyId,
    notes: `Laga soo beddelay dalabka ${order.order_no}: ${order.note || ""}`,
    createdBy: saleParams.createdBy,
  });

  db.run("UPDATE orders SET status = 'converted', sale_id = ? WHERE id = ?", [
    (sale as unknown as { id: string }).id,
    orderId,
  ]);

  return sale;
}

export async function listOrders(filters: {
  search?: string;
  status?: string;
  customerId?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDatabase();
  const conditions: string[] = ["1=1"];
  const params: (string | number)[] = [];

  if (filters.search) {
    conditions.push("(o.order_no LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ?)");
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  if (filters.status) {
    conditions.push("o.status = ?");
    params.push(filters.status);
  }

  if (filters.customerId) {
    conditions.push("o.customer_id = ?");
    params.push(filters.customerId);
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const count = db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM orders o WHERE ${conditions.join(" AND ")}`,
    params,
  );

  const orders = db.query<Record<string, unknown>>(
    `SELECT o.*, c.name as customer_real_name
     FROM orders o
     LEFT JOIN customers c ON o.customer_id = c.id
     WHERE ${conditions.join(" AND ")}
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { total: count?.count || 0, orders, limit, offset };
}
