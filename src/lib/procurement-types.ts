/**
 * Phase 7 contracts: suppliers, purchases, purchase returns, supplier
 * payments, expenses and other income. Every number here is produced by the
 * database (canonical tables, read-model views, atomic RPCs).
 */

import type { UntypedDb } from "@/lib/logistics-types";

export type { UntypedDb };

export type PaymentMethod = "cash" | "evc_plus" | "edahab" | "merchant" | "bank";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "evc_plus", label: "EVC Plus" },
  { value: "edahab", label: "E-Dahab" },
  { value: "merchant", label: "Merchant" },
  { value: "bank", label: "Bank" },
];

export type PurchasePaymentStatus = "full_paid" | "partial" | "full_debt";

export const PURCHASE_STATUS_META: Record<
  PurchasePaymentStatus,
  { label: string; className: string }
> = {
  full_paid: { label: "Paid", className: "bg-success/15 text-success" },
  partial: { label: "Partial", className: "bg-warning/15 text-warning" },
  full_debt: { label: "On credit", className: "bg-destructive/15 text-destructive" },
};

export type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  contact_person: string | null;
  opening_balance: number;
  notes: string | null;
  active: boolean;
  created_at: string;
};

export type SupplierBalance = {
  supplier_id: string;
  name: string;
  phone: string | null;
  active: boolean;
  opening_balance: number;
  purchased: number;
  returned: number;
  paid: number;
  balance: number;
};

export type PurchaseOverview = {
  id: string;
  purchase_no: string;
  purchase_date: string;
  invoice_no: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  supplier_phone: string | null;
  subtotal: number;
  discount: number;
  extra_cost: number;
  total: number;
  paid_amount: number;
  returned_total: number;
  balance: number;
  payment_method: PaymentMethod;
  payment_status: PurchasePaymentStatus;
  account_id: string | null;
  account_name: string | null;
  status: "active" | "void";
  note: string | null;
  created_at: string;
  item_count: number;
  quantity_total: number;
};

export type PurchaseItemDetail = {
  id: string;
  product_id: string;
  product_name: string;
  sku: string | null;
  unit: string | null;
  quantity: number;
  unit_cost: number;
  line_total: number;
};

export type SupplierPayment = {
  id: string;
  supplier_id: string;
  supplier_name: string | null;
  purchase_id: string | null;
  payment_date: string;
  amount: number;
  method: PaymentMethod;
  account_id: string | null;
  account_name: string | null;
  reference: string | null;
  note: string | null;
  status: "active" | "void";
  created_at: string;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  scope: "business" | "personal";
  kind: "expense" | "income";
  active: boolean;
  sort_order: number;
};

export type LedgerEntry = {
  id: string;
  txn_date: string;
  type: string;
  scope: "business" | "personal";
  category: string | null;
  description: string | null;
  amount: number;
  account_id: string | null;
  account_name: string | null;
  status: "active" | "void";
  created_at: string;
};

/** ---- Mutation inputs ---- */

export type SupplierInput = {
  id?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  contact_person?: string | null;
  opening_balance?: number;
  notes?: string | null;
  active?: boolean;
};

export type PurchaseLineInput = {
  product_id: string;
  quantity: number;
  unit_cost: number;
};

export type CreatePurchaseInput = {
  purchase_date: string;
  supplier_id?: string | null;
  items: PurchaseLineInput[];
  discount?: number;
  extra_cost?: number;
  paid_amount?: number;
  payment_method: PaymentMethod;
  account_id?: string | null;
  invoice_no?: string | null;
  note?: string | null;
  update_cost?: boolean;
};

export type PurchaseReturnInput = {
  purchase_id: string;
  items: { product_id: string; quantity: number }[];
  return_date?: string;
  refund_amount?: number;
  refund_method?: PaymentMethod | null;
  account_id?: string | null;
  note?: string | null;
};

export type SupplierPaymentInput = {
  supplier_id: string;
  amount: number;
  account_id: string;
  payment_date: string;
  method: PaymentMethod;
  purchase_id?: string | null;
  reference?: string | null;
  note?: string | null;
};

export type MoneyEntryInput = {
  amount: number;
  category: string;
  scope: "business" | "personal";
  txn_date: string;
  account_id: string;
  description?: string | null;
};
