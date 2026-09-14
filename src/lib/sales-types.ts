/**
 * Sales, customers, collections, returns and payment-account contracts
 * (Grand Master Two, part 2).
 *
 * Every number in these shapes is produced by the database (canonical tables,
 * read-model views and the atomic RPCs). Nothing here is recomputed in React.
 */

export type PaymentMethod = "cash" | "evc_plus" | "edahab" | "merchant" | "bank";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "evc_plus", label: "EVC Plus" },
  { value: "edahab", label: "E-Dahab" },
  { value: "merchant", label: "Merchant" },
  { value: "bank", label: "Bank" },
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  evc_plus: "EVC Plus",
  edahab: "E-Dahab",
  merchant: "Merchant",
  bank: "Bank",
};

export type PaymentChannel = {
  id: string;
  name: string;
  group_name: string;
  method: PaymentMethod;
  requires_bank_name: boolean;
  is_default: boolean;
  sort_order: number;
  active: boolean;
};

export type SalePaymentStatus = "full_paid" | "partial" | "full_debt";

export const PAYMENT_STATUS_LABELS: Record<SalePaymentStatus, string> = {
  full_paid: "Full paid",
  partial: "Partial",
  full_debt: "Full debt",
};

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  credit_limit: number;
  notes: string | null;
  active: boolean;
  created_at: string;
};

/** customer_balances view — receivables truth per customer. */
export type CustomerBalance = {
  customer_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  credit_limit: number;
  active: boolean;
  sales_total: number;
  returned_total: number;
  paid_total: number;
  balance: number;
  credit_available: number;
  last_sale_date: string | null;
  last_payment_date: string | null;
};

/** sales_overview view — one row per sale with joined names and roll-ups. */
export type SaleOverview = {
  id: string;
  sale_no: string;
  sale_date: string;
  sale_time: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
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
  fulfillment: "pickup" | "delivery" | "cargo";
  recipient_name: string | null;
  recipient_phone: string | null;
  address: string | null;
  location_id: string | null;
  location_name: string | null;
  region_id: string | null;
  region_name: string | null;
  delivery_company_id: string | null;
  delivery_company_name: string | null;
  driver_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  cargo_company_id: string | null;
  cargo_company_name: string | null;
  payment_method: PaymentMethod;
  payment_channel_id: string | null;
  payment_channel_name: string | null;
  bank_name: string | null;
  payment_status: SalePaymentStatus;
  account_id: string | null;
  account_name: string | null;
  status: "active" | "void";
  note: string | null;
  created_at: string;
  delivery_id: string | null;
  delivery_no: string | null;
  delivery_status: string | null;
  delivered_at: string | null;
  item_count: number;
  quantity_total: number;
  cogs_total: number;
  gross_profit: number;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  line_total: number;
};

/** A sale line plus how much of it is still returnable (database-derived). */
export type SaleItemWithReturns = SaleItem & {
  product_name: string;
  returned_quantity: number;
  returnable_quantity: number;
};

export type CustomerPayment = {
  id: string;
  customer_id: string;
  sale_id: string | null;
  payment_date: string;
  amount: number;
  method: PaymentMethod;
  account_id: string | null;
  reference: string | null;
  note: string | null;
  status: "active" | "void";
  created_at: string;
};

export type SalesReturn = {
  id: string;
  sale_id: string;
  customer_id: string | null;
  return_date: string;
  total: number;
  cogs: number;
  refund_amount: number;
  refund_method: PaymentMethod | null;
  account_id: string | null;
  restock: boolean;
  note: string | null;
  status: "active" | "void";
  created_at: string;
};

export type PaymentAccount = {
  id: string;
  name: string;
  kind: string;
  scope: "business" | "personal";
  opening_balance: number;
  active: boolean;
  sort_order: number;
};

/** account_balances view — canonical account balance. */
export type AccountBalance = {
  account_id: string;
  name: string;
  kind: string;
  scope: "business" | "personal";
  active: boolean;
  opening_balance: number;
  balance: number;
};

export type AccountTransfer = {
  id: string;
  transfer_date: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  note: string | null;
  status: "active" | "void";
  created_at: string;
};

/** customer_statement() rows — running balance computed in SQL. */
export type StatementEntry = {
  entry_date: string;
  kind: string;
  reference: string | null;
  description: string | null;
  debit: number;
  credit: number;
  running_balance: number;
};

/** ---- Mutation inputs (thin pass-through to the atomic RPCs) ---- */

export type SaleLineInput = {
  product_id: string;
  quantity: number;
  unit_price: number;
};

export type CreateSaleInput = {
  sale_no?: string | null;
  payment_channel_id?: string | null;
  bank_name?: string | null;
  sale_date: string;
  sale_time?: string | null;
  customer_id?: string | null;
  items: SaleLineInput[];
  discount?: number;
  paid_amount?: number;
  payment_method: PaymentMethod;
  account_id?: string | null;
  note?: string | null;
  vat_rate?: number;
  advance_amount?: number;
  fulfillment?: "pickup" | "delivery" | "cargo";
  delivery_fee?: number;
  cargo_fee?: number;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  address?: string | null;
  location_id?: string | null;
  region_id?: string | null;
  delivery_company_id?: string | null;
  driver_id?: string | null;
  cargo_company_id?: string | null;
};

export type UpdateSaleInput = CreateSaleInput & { sale_id: string };

export type CollectionInput = {
  customer_id: string;
  amount: number;
  payment_date: string;
  method: PaymentMethod;
  account_id: string;
  sale_id?: string | null;
  reference?: string | null;
  note?: string | null;
};

export type ReturnLineInput = {
  product_id: string;
  quantity: number;
};

export type CreateReturnInput = {
  sale_id: string;
  items: ReturnLineInput[];
  return_date: string;
  restock: boolean;
  refund_amount?: number;
  refund_method?: PaymentMethod | null;
  account_id?: string | null;
  note?: string | null;
};

export type TransferInput = {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  transfer_date: string;
  note?: string | null;
};

export type CustomerInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  credit_limit?: number;
  notes?: string | null;
  active?: boolean;
};
