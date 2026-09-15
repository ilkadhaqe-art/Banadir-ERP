/**
 * Phase 6 contracts: orders, delivery & cargo, drivers, COD handovers.
 *
 * The generated Database types are frozen because this project's database is
 * hosted externally, so these structural types describe the Phase 6 tables,
 * views and RPC inputs. Every number in these shapes is produced by the
 * database (canonical tables, read-model views, atomic RPCs). Nothing here is
 * recomputed in React.
 */

/** Minimal structural escape hatch for the Phase 6 tables/views: handlers
 * cast the authenticated client to this shape, and the row types above keep
 * results fully typed at the module boundary. */
export type UntypedDb = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<{ data: any; error: { message: string } | null }>;
};

export type OrderStatus =
  "pending" | "confirmed" | "ready" | "out_for_delivery" | "delivered" | "cancelled" | "converted";

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning/15 text-warning" },
  confirmed: { label: "Confirmed", className: "bg-primary/15 text-primary" },
  ready: { label: "Ready", className: "bg-primary/15 text-primary" },
  out_for_delivery: { label: "Out for delivery", className: "bg-accent text-accent-foreground" },
  delivered: { label: "Delivered", className: "bg-success/15 text-success" },
  converted: { label: "Converted to sale", className: "bg-success/15 text-success" },
  cancelled: { label: "Cancelled", className: "bg-destructive/15 text-destructive" },
};

export type FulfillmentType = "pickup" | "delivery" | "cargo";

export const FULFILLMENT_TYPES: { value: FulfillmentType; label: string }[] = [
  { value: "pickup", label: "Pickup" },
  { value: "delivery", label: "Delivery" },
  { value: "cargo", label: "Cargo" },
];

export const FULFILLMENT_LABELS: Record<FulfillmentType, string> = {
  pickup: "Pickup",
  delivery: "Delivery",
  cargo: "Cargo",
};

export type DeliveryStatus =
  "pending" | "assigned" | "picked_up" | "in_transit" | "delivered" | "failed" | "returned";

export const DELIVERY_STATUS_META: Record<DeliveryStatus, { label: string; className: string }> = {
  pending: { label: "Unassigned", className: "bg-warning/15 text-warning" },
  assigned: { label: "Assigned", className: "bg-primary/15 text-primary" },
  picked_up: { label: "Picked up", className: "bg-accent text-accent-foreground" },
  in_transit: { label: "In transit", className: "bg-accent text-accent-foreground" },
  delivered: { label: "Delivered", className: "bg-success/15 text-success" },
  failed: { label: "Failed", className: "bg-destructive/15 text-destructive" },
  returned: { label: "Returned", className: "bg-destructive/15 text-destructive" },
};

/** Allowed forward moves in the delivery lifecycle (terminal states excluded). */
export const DELIVERY_NEXT_STATUSES: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending: ["assigned", "failed", "returned"],
  assigned: ["picked_up", "failed", "returned"],
  picked_up: ["in_transit", "delivered", "failed", "returned"],
  in_transit: ["delivered", "failed", "returned"],
  delivered: [],
  failed: [],
  returned: [],
};

export type OrderOverview = {
  id: string;
  order_no: string;
  order_date: string;
  status: OrderStatus;
  fulfillment: FulfillmentType;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  zone_id: string | null;
  zone_name: string | null;
  cargo_company_id: string | null;
  cargo_company_name: string | null;
  delivery_address: string | null;
  delivery_fee: number;
  subtotal: number;
  discount: number;
  total: number;
  sale_id: string | null;
  sale_no: string | null;
  note: string | null;
  created_at: string;
  item_count: number;
  quantity_total: number;
  delivery_id: string | null;
  delivery_no: string | null;
  delivery_status: DeliveryStatus | null;
  driver_id: string | null;
  driver_name: string | null;
  driver_phone?: string | null;
  portal_token?: string | null;
  portal_enabled?: boolean | null;
  payment_status?: string | null;
  payment_method?: string | null;
  payment_ref?: string | null;
  advance_payment?: number | null;
  remaining_balance?: number | null;
  delivery_stage?: string | null;
};

export type OrderItemDetail = {
  id: string;
  product_id: string;
  product_name: string;
  sku: string | null;
  unit: string | null;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  line_total: number;
};

export type DeliveryOverview = {
  id: string;
  delivery_no: string;
  order_id: string | null;
  order_no: string | null;
  sale_id: string | null;
  sale_no: string | null;
  driver_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  zone_id: string | null;
  zone_name: string | null;
  cargo_company_id: string | null;
  cargo_company_name: string | null;
  status: DeliveryStatus;
  fee: number;
  cod_amount: number;
  recipient_name: string | null;
  recipient_phone: string | null;
  address: string | null;
  dispatch_date: string | null;
  delivered_at: string | null;
  note: string | null;
  created_at: string;
  customer_id: string | null;
  customer_name: string | null;
};

export type Driver = {
  id: string;
  name: string;
  phone: string | null;
  company_id: string | null;
  vehicle_type: string;
  license_no: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
};

export type DriverBalance = {
  driver_id: string;
  name: string;
  phone: string | null;
  vehicle_type: string;
  active: boolean;
  cod_total: number;
  cod_collected: number;
  handed_over: number;
  outstanding: number;
};

export type DriverPerformance = {
  driver_id: string;
  name: string;
  phone: string | null;
  vehicle_type: string;
  active: boolean;
  deliveries_total: number;
  delivered: number;
  in_progress: number;
  unsuccessful: number;
  unassigned: number;
  fees_total: number;
  cod_collected: number;
  last_delivery_at: string | null;
};

export type DriverHandover = {
  id: string;
  driver_id: string;
  driver_name?: string | null;
  handover_date: string;
  amount: number;
  method: string;
  account_id: string | null;
  account_name?: string | null;
  reference: string | null;
  note: string | null;
  status: "active" | "void";
  created_at: string;
};

export type DeliveryZone = {
  id: string;
  name: string;
  district: string | null;
  default_fee: number;
  active: boolean;
  sort_order: number;
};

export type CargoCompany = {
  id: string;
  name: string;
  phone: string | null;
  contact_person: string | null;
  notes: string | null;
  active: boolean;
};

export type CargoRate = {
  id: string;
  company_id: string;
  company_name?: string | null;
  zone_id: string;
  zone_name?: string | null;
  destination: string | null;
  rate: number;
  effective_from: string;
  effective_to: string | null;
  active: boolean;
};

/** ---- Mutation inputs (thin pass-through to the atomic RPCs) ---- */

export type OrderLineInput = {
  product_id: string;
  quantity: number;
  unit_price: number;
};

export type CreateOrderInput = {
  order_date: string;
  customer_id?: string | null;
  items: OrderLineInput[];
  discount?: number;
  fulfillment: FulfillmentType;
  delivery_fee?: number;
  zone_id?: string | null;
  cargo_company_id?: string | null;
  address?: string | null;
  note?: string | null;
};

export type ConvertOrderInput = {
  order_id: string;
  paid_amount?: number;
  payment_method: string;
  account_id?: string | null;
  sale_date?: string;
};

export type CreateDeliveryInput = {
  order_id?: string | null;
  sale_id?: string | null;
  driver_id?: string | null;
  zone_id?: string | null;
  cargo_company_id?: string | null;
  fee?: number;
  cod_amount?: number;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  address?: string | null;
  note?: string | null;
};

export type DriverInput = {
  name: string;
  phone?: string | null;
  vehicle_type?: string;
  license_no?: string | null;
  notes?: string | null;
  active?: boolean;
};

export type HandoverInput = {
  driver_id: string;
  amount: number;
  account_id: string;
  method: string;
  handover_date: string;
  reference?: string | null;
  note?: string | null;
};

export type DeliveryZoneInput = {
  name: string;
  district?: string | null;
  default_fee?: number;
  active?: boolean;
};

export type CargoCompanyInput = {
  name: string;
  phone?: string | null;
  contact_person?: string | null;
  notes?: string | null;
  active?: boolean;
};

export type CargoRateInput = {
  company_id: string;
  zone_id: string;
  destination?: string | null;
  rate: number;
  effective_from?: string;
  active?: boolean;
};

/** ---- Delivery & Cargo operations center (Phase 7 read models) ---- */

/** A customer collection recorded against the delivery's sale. */
export type DeliveryCollection = {
  id: string;
  payment_date: string;
  amount: number;
  method: string;
  account_id: string | null;
  account_name: string | null;
  reference: string | null;
  note: string | null;
  created_at: string;
};

/** One real, timestamped fact about the delivery — never a fabricated event. */
export type DeliveryTimelineEvent = {
  at: string;
  label: string;
  detail: string | null;
  amount: number | null;
};

export type DeliverySaleLink = {
  id: string;
  sale_no: string;
  sale_date: string;
  total: number;
  paid_amount: number;
  returned_total: number;
  balance: number;
  payment_status: string;
  status: string;
};

export type DeliveryDetail = {
  delivery: DeliveryOverview;
  order: OrderOverview | null;
  items: OrderItemDetail[];
  sale: DeliverySaleLink | null;
  customer: { id: string; name: string; phone: string | null; balance: number } | null;
  collections: DeliveryCollection[];
  /** Rate card that currently matches the zone + company pair, for reference only. */
  rate_card: CargoRate | null;
};

export type DeliveryCollectionInput = {
  delivery_id: string;
  amount: number;
  method: string;
  account_id: string;
  payment_date: string;
  reference?: string | null;
  note?: string | null;
};
