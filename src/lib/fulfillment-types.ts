/**
 * Delivery / cargo operational contracts.
 *
 * Locations, delivery companies, rate cards, tracking events, the smart
 * defaults and the complete sale statement are all produced by the database.
 * Nothing in this module recomputes a business number.
 */

import type { FulfillmentType } from "@/lib/logistics-types";
import type { PaymentMethod, SalePaymentStatus } from "@/lib/sales-types";

export type LocationLevel = "district" | "region";

export type LocationRow = {
  id: string;
  name: string;
  level: LocationLevel;
  parent_id: string | null;
  active: boolean;
  sort_order: number;
  notes: string | null;
};

export type LocationInput = {
  id?: string;
  name: string;
  level: LocationLevel;
  parent_id?: string | null;
  active?: boolean;
  sort_order?: number;
  notes?: string | null;
};

export type DeliveryCompany = {
  id: string;
  name: string;
  phone: string | null;
  contact_person: string | null;
  notes: string | null;
  active: boolean;
};

export type DeliveryCompanyInput = {
  id?: string;
  name: string;
  phone?: string | null;
  contact_person?: string | null;
  notes?: string | null;
  active?: boolean;
};

export type DeliveryRate = {
  id: string;
  company_id: string | null;
  company_name: string | null;
  driver_id: string | null;
  driver_name: string | null;
  location_id: string;
  location_name: string | null;
  rate: number;
  effective_from: string;
  effective_to: string | null;
  active: boolean;
};

export type DeliveryRateInput = {
  id?: string;
  company_id?: string | null;
  driver_id?: string | null;
  location_id: string;
  rate: number;
  effective_from: string;
  effective_to?: string | null;
  active?: boolean;
};

/** Tracking milestones shown for delivery and for cargo. */
export const DELIVERY_TRACK_STEPS = [
  { value: "assigned", label: "Assigned to driver" },
  { value: "picked_up", label: "Picked up" },
  { value: "in_transit", label: "On the way" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed" },
  { value: "returned", label: "Returned" },
] as const;

export const CARGO_TRACK_STEPS = [
  { value: "handed_to_cargo", label: "Handed to cargo" },
  { value: "in_transit", label: "On the way" },
  { value: "arrived", label: "Arrived at destination" },
  { value: "customer_received", label: "Customer received" },
  { value: "failed", label: "Failed" },
  { value: "returned", label: "Returned" },
] as const;

export type FulfillmentEventInput = {
  sale_id: string;
  status: string;
  driver_id?: string | null;
  amount_collected?: number;
  account_id?: string | null;
  method?: PaymentMethod;
  note?: string | null;
  occurred_at?: string | null;
};

export type SmartDefaults = {
  product_id: string | null;
  payment_method: PaymentMethod | null;
  delivery_company_id: string | null;
  driver_id: string | null;
  location_id: string | null;
  cargo_company_id: string | null;
  region_id: string | null;
  merchant_vat_rate: number;
};

export type SaleStatementItem = {
  product_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  image_url: string | null;
  unit: string | null;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  line_total: number;
};

export type SaleStatementEvent = {
  id: string;
  status: string;
  kind: FulfillmentType;
  amount_collected: number;
  note: string | null;
  occurred_at: string;
  driver_name: string | null;
  actor: string | null;
};

export type SaleStatementAudit = {
  action: string;
  entity_table: string;
  created_at: string;
  actor: string | null;
  reason: string | null;
  old_value: string | null;
  new_value: string | null;
};

export type SaleStatement = {
  sale: {
    id: string;
    sale_no: string;
    sale_date: string;
    sale_time: string | null;
    subtotal: number;
    discount: number;
    vat_rate: number;
    vat_amount: number;
    total: number;
    paid_amount: number;
    advance_amount: number;
    returned_total: number;
    balance: number;
    delivery_fee: number;
    cargo_fee: number;
    fee_paid: number;
    fee_balance: number;
    fulfillment: FulfillmentType;
    payment_method: PaymentMethod;
    payment_status: SalePaymentStatus;
    status: "active" | "void";
    note: string | null;
    recipient_name: string | null;
    recipient_phone: string | null;
    address: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    account_name: string | null;
    location_name: string | null;
    region_name: string | null;
    delivery_company_name: string | null;
    driver_name: string | null;
    driver_phone: string | null;
    cargo_company_name: string | null;
    created_by_name: string | null;
    updated_by_name: string | null;
    created_at: string;
    updated_at: string | null;
  };
  items: SaleStatementItem[];
  collections: {
    id: string;
    payment_date: string;
    amount: number;
    method: PaymentMethod;
    reference: string | null;
    note: string | null;
  }[];
  returns: { id: string; return_date: string; total: number; refund_amount: number }[];
  events: SaleStatementEvent[];
  delivery: { id: string; delivery_no: string; status: string; cod_amount: number } | null;
  audit: SaleStatementAudit[];
};
