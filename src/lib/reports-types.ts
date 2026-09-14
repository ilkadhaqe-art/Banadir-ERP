/**
 * Phase 8 contracts: reporting views, audit trail, app settings and the
 * business overview rollup. Every figure is produced by the database.
 */

export type { UntypedDb } from "@/lib/logistics-types";

export type SalesDailyReportRow = {
  day: string;
  sales_count: number;
  sales_total: number;
  discount_total: number;
  paid_total: number;
  debt_total: number;
  cogs_total: number;
  gross_profit: number;
};

export type ProductSalesReportRow = {
  product_id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  quantity_sold: number;
  revenue: number;
  cost: number;
  profit: number;
  last_sold_on: string | null;
};

export type CustomerSalesReportRow = {
  customer_id: string;
  name: string;
  phone: string | null;
  active: boolean;
  sales_count: number;
  sales_total: number;
  paid_total: number;
  outstanding: number;
  last_sale_on: string | null;
};

export type MoneyReportRow = {
  day: string;
  scope: "business" | "personal";
  category: string;
  amount: number;
  entries: number;
};

export type InventoryValuationRow = {
  product_id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  reorder_level: number;
  stock_on_hand: number;
  cost_price: number;
  sell_price: number;
  stock_value: number;
  retail_value: number;
  low_stock: boolean;
};

export type AccountBalanceReportRow = {
  account_id: string;
  name: string;
  kind: string;
  scope: "business" | "personal";
  active: boolean;
  balance: number;
};

export type ProfitLossRow = {
  day: string;
  sales_net: number;
  cogs: number;
  gross_profit: number;
  business_expenses: number;
  personal_expenses: number;
  other_income: number;
  guaranteed_income: number;
  net_profit: number;
  target: number;
  achievement: number;
  plus_amount: number;
  minus_amount: number;
  cash_balance: number;
  receivables: number;
};

export type BusinessOverview = {
  from: string;
  to: string;
  sales: number;
  gross_profit: number;
  expenses: number;
  income: number;
  receivables: number;
  payables: number;
  stock_value: number;
  low_stock_count: number;
  cash_total: number;
  open_orders: number;
  active_deliveries: number;
  driver_cash_outstanding: number;
};

export type AuditLogRow = {
  id: string;
  created_at: string;
  action: string;
  entity_table: string | null;
  entity_id: string | null;
  affected_date: string | null;
  actor: string | null;
  actor_name: string | null;
  reason: string | null;
};

export type AppSetting = {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
};
