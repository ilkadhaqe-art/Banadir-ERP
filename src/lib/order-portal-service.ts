import { mockDb } from "@/lib/mock-data";
import type {
  OrderOverview,
  OrderItemDetail,
  OrderStatus,
  FulfillmentType,
} from "@/lib/logistics-types";

export type PaymentVerificationStatus = "unpaid" | "pending_verification" | "verified";

export type SomaliDeliveryStage =
  | "darawal_lama_dalban"
  | "darawal_loo_dalbay"
  | "alaabta_soo_qaaday"
  | "alaabta_soo_wadaa"
  | "alaabta_la_geeyay";

export const SOMALI_DELIVERY_STAGES: {
  id: SomaliDeliveryStage;
  label: string;
  sublabel: string;
  step: number;
}[] = [
  {
    id: "darawal_lama_dalban",
    label: "Darawal weli lama dalban",
    sublabel: "Dalabka waa la diyaarinayaa",
    step: 1,
  },
  {
    id: "darawal_loo_dalbay",
    label: "Darawal ayaa loo dalbay",
    sublabel: "Darawalka ayaa aqbalay qaadista",
    step: 2,
  },
  {
    id: "alaabta_soo_qaaday",
    label: "Alaabta waa la soo qaaday",
    sublabel: "Alaabtu waxay ku jirtaa gacanta darawalka",
    step: 3,
  },
  {
    id: "alaabta_soo_wadaa",
    label: "Alaabta waa lagu soo wadaa",
    sublabel: "Darawalku wuxuu ku soo socdaa cinwaankaaga",
    step: 4,
  },
  {
    id: "alaabta_la_geeyay",
    label: "Alaabta waa lagu geeyay",
    sublabel: "Dalabka si guul leh ayaa loo gaarsiiyay",
    step: 5,
  },
];

export type OrderPortalItem = {
  id: string;
  product_id: string;
  product_name: string;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  image_url?: string | null;
};

export type OrderPortalData = {
  order_id: string;
  order_no: string;
  portal_token: string;
  portal_enabled: boolean;
  order_date: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  status: OrderStatus;
  fulfillment: FulfillmentType;
  items: OrderPortalItem[];
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  paid_amount: number;
  remaining_balance: number;
  payment_status: PaymentVerificationStatus;
  payment_method?: "evc_plus" | "edahab" | "jeeb" | "cash" | null;
  payment_reference?: string | null;
  payment_submitted_at?: string | null;
  cancellation_reason?: string | null;
  tracking_stage: SomaliDeliveryStage;
  driver_name?: string | null;
  driver_phone?: string | null;
  delivery_note?: string | null;
  updated_at: string;
};

const STORAGE_KEY = "banadir_fos_order_portal_records";

function getStoredPortalRecords(): Record<string, OrderPortalData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveStoredPortalRecords(records: Record<string, OrderPortalData>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore quota issues
  }
}

export function clearStoredPortalRecords() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore error
  }
}

/**
 * Generates a clean URL-friendly token for an order.
 */
export function generatePortalToken(orderNoOrId: string): string {
  const clean = orderNoOrId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const rand = Math.random().toString(36).substring(2, 8);
  return `${clean}-${rand}`;
}

/**
 * Builds or retrieves portal data for a given order overview and items.
 */
export function syncOrderToPortal(
  order: OrderOverview,
  items: OrderItemDetail[] = [],
): OrderPortalData {
  const records = getStoredPortalRecords();

  // Find existing by order_id or create new
  let record = records[order.id];

  const subtotal = Number(order.subtotal) || 0;
  const discount = Number(order.discount) || 0;
  const delivery_fee = Number(order.delivery_fee) || 0;
  const total = Number(order.total) || subtotal - discount + delivery_fee;

  if (!record) {
    const token = generatePortalToken(order.order_no || order.id);
    record = {
      order_id: order.id,
      order_no: order.order_no,
      portal_token: token,
      portal_enabled: true,
      order_date: order.order_date,
      customer_name: order.customer_name || "Walk-in Customer",
      customer_phone: order.customer_phone || null,
      customer_address: order.delivery_address || null,
      status: order.status,
      fulfillment: order.fulfillment,
      items: items.map((it) => ({
        id: it.id,
        product_id: it.product_id,
        product_name: it.product_name,
        sku: it.sku,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        line_total: Number(it.line_total),
        image_url: null,
      })),
      subtotal,
      discount,
      delivery_fee,
      total,
      paid_amount: 0,
      remaining_balance: total,
      payment_status: "unpaid",
      tracking_stage: order.fulfillment === "pickup" ? "alaabta_soo_qaaday" : "darawal_lama_dalban",
      driver_name: order.driver_name || null,
      driver_phone: null,
      updated_at: new Date().toISOString(),
    };
  } else {
    // Keep updated with order base fields if not overridden
    record.order_no = order.order_no;
    record.customer_name = order.customer_name || record.customer_name;
    record.customer_phone = order.customer_phone || record.customer_phone;
    record.customer_address = order.delivery_address || record.customer_address;
    if (order.status === "cancelled") {
      record.status = "cancelled";
    }
    if (items.length > 0 && record.items.length === 0) {
      record.items = items.map((it) => ({
        id: it.id,
        product_id: it.product_id,
        product_name: it.product_name,
        sku: it.sku,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        line_total: Number(it.line_total),
      }));
    }
    if (order.driver_name) {
      record.driver_name = order.driver_name;
    }
  }

  records[order.id] = record;
  // Also index by token for O(1) lookup
  records[record.portal_token] = record;
  saveStoredPortalRecords(records);
  return record;
}

/**
 * Lookup portal data by portal_token or order_id.
 */
export function getOrderPortalData(tokenOrId: string): OrderPortalData | null {
  const records = getStoredPortalRecords();

  if (records[tokenOrId]) {
    return records[tokenOrId];
  }

  // Look through all values
  for (const rec of Object.values(records)) {
    if (
      rec.portal_token === tokenOrId ||
      rec.order_id === tokenOrId ||
      rec.order_no.toLowerCase() === tokenOrId.toLowerCase()
    ) {
      return rec;
    }
  }

  // Fallback: check mockDb.orders
  const mockOrders = (mockDb.orders_overview || mockDb.orders || []) as OrderOverview[];
  const found = mockOrders.find(
    (o) => o.id === tokenOrId || o.order_no?.toLowerCase() === tokenOrId.toLowerCase(),
  );
  if (found) {
    return syncOrderToPortal(found, []);
  }

  return null;
}

/**
 * Customer actions:
 * 1. Cancel order (clicking MAYA)
 */
export function customerCancelOrder(
  tokenOrId: string,
  reason = "Cancelled by customer on payment confirmation",
): OrderPortalData | null {
  const data = getOrderPortalData(tokenOrId);
  if (!data) return null;

  data.status = "cancelled";
  data.cancellation_reason = reason;
  data.updated_at = new Date().toISOString();

  const records = getStoredPortalRecords();
  records[data.order_id] = data;
  records[data.portal_token] = data;
  saveStoredPortalRecords(records);

  // Sync to mockDb if present
  if (mockDb.orders) {
    mockDb.orders = mockDb.orders.map((o) =>
      o["id"] === data.order_id ? { ...o, status: "cancelled" } : o,
    );
  }
  if (mockDb.orders_overview) {
    mockDb.orders_overview = mockDb.orders_overview.map((o) =>
      o["id"] === data.order_id ? { ...o, status: "cancelled" } : o,
    );
  }

  return data;
}

/**
 * Customer actions:
 * 2. Submit payment method -> marks as "pending_verification"
 */
export function customerSubmitPayment(
  tokenOrId: string,
  paymentMethod: "evc_plus" | "edahab" | "jeeb",
  reference?: string,
): OrderPortalData | null {
  const data = getOrderPortalData(tokenOrId);
  if (!data) return null;

  data.payment_status = "pending_verification";
  data.payment_method = paymentMethod;
  data.payment_reference = reference || null;
  data.payment_submitted_at = new Date().toISOString();
  data.updated_at = new Date().toISOString();

  const records = getStoredPortalRecords();
  records[data.order_id] = data;
  records[data.portal_token] = data;
  saveStoredPortalRecords(records);

  return data;
}

/**
 * Admin actions:
 * 1. Confirm payment verification (Xaqiiji Lacagta)
 */
export function adminConfirmPayment(orderId: string, amountPaid?: number): OrderPortalData | null {
  const data = getOrderPortalData(orderId);
  if (!data) return null;

  const paid = amountPaid !== undefined ? amountPaid : data.total;
  data.paid_amount = paid;
  data.remaining_balance = Math.max(0, data.total - paid);
  data.payment_status = "verified";
  if (data.status === "pending") {
    data.status = "confirmed";
  }
  data.updated_at = new Date().toISOString();

  const records = getStoredPortalRecords();
  records[data.order_id] = data;
  records[data.portal_token] = data;
  saveStoredPortalRecords(records);

  if (mockDb.orders) {
    mockDb.orders = mockDb.orders.map((o) =>
      o["id"] === data.order_id ? { ...o, status: data.status } : o,
    );
  }
  if (mockDb.orders_overview) {
    mockDb.orders_overview = mockDb.orders_overview.map((o) =>
      o["id"] === data.order_id ? { ...o, status: data.status } : o,
    );
  }

  return data;
}

/**
 * Admin actions:
 * 2. Toggle portal link enabled/disabled
 */
export function adminTogglePortalLink(orderId: string, enabled: boolean): OrderPortalData | null {
  const data = getOrderPortalData(orderId);
  if (!data) return null;

  data.portal_enabled = enabled;
  data.updated_at = new Date().toISOString();

  const records = getStoredPortalRecords();
  records[data.order_id] = data;
  records[data.portal_token] = data;
  saveStoredPortalRecords(records);

  return data;
}

/**
 * Admin actions:
 * 3. Update Delivery Tracking Stage & Driver
 */
export function adminUpdateTracking(
  orderId: string,
  stage: SomaliDeliveryStage,
  driverName?: string,
  driverPhone?: string,
): OrderPortalData | null {
  const data = getOrderPortalData(orderId);
  if (!data) return null;

  data.tracking_stage = stage;
  if (driverName !== undefined) data.driver_name = driverName;
  if (driverPhone !== undefined) data.driver_phone = driverPhone;

  // Sync order status if stage progresses
  if (stage === "darawal_loo_dalbay" || stage === "alaabta_soo_qaaday") {
    if (data.status === "pending" || data.status === "confirmed") {
      data.status = "ready";
    }
  } else if (stage === "alaabta_soo_wadaa") {
    data.status = "out_for_delivery";
  } else if (stage === "alaabta_la_geeyay") {
    data.status = "delivered";
  }

  data.updated_at = new Date().toISOString();

  const records = getStoredPortalRecords();
  records[data.order_id] = data;
  records[data.portal_token] = data;
  saveStoredPortalRecords(records);

  if (mockDb.orders) {
    mockDb.orders = mockDb.orders.map((o) =>
      o["id"] === data.order_id ? { ...o, status: data.status, driver_name: data.driver_name } : o,
    );
  }
  if (mockDb.orders_overview) {
    mockDb.orders_overview = mockDb.orders_overview.map((o) =>
      o["id"] === data.order_id ? { ...o, status: data.status, driver_name: data.driver_name } : o,
    );
  }

  return data;
}
