export const SCHEMA_SQL = `
-- Banadir Online FOS — Core Tables and Indexes

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active INTEGER NOT NULL DEFAULT 1,
  last_sign_in_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id),
  role TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  credit_limit REAL NOT NULL DEFAULT 0,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  description TEXT,
  category_id TEXT REFERENCES product_categories(id),
  brand_id TEXT REFERENCES product_brands(id),
  cost_price REAL NOT NULL DEFAULT 0,
  selling_price REAL NOT NULL DEFAULT 0,
  min_price REAL NOT NULL DEFAULT 0,
  wholesale_price REAL NOT NULL DEFAULT 0,
  stock_quantity REAL NOT NULL DEFAULT 0,
  min_stock REAL NOT NULL DEFAULT 5,
  max_stock REAL NOT NULL DEFAULT 1000,
  unit TEXT NOT NULL DEFAULT 'pcs',
  image_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_price_history (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  old_selling_price REAL NOT NULL,
  new_selling_price REAL NOT NULL,
  old_cost_price REAL NOT NULL,
  new_cost_price REAL NOT NULL,
  changed_by TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  movement_type TEXT NOT NULL, -- sale, purchase, sale_return, purchase_return, adjustment, damage, audit
  quantity REAL NOT NULL,
  unit_cost REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  quantity_before REAL NOT NULL,
  quantity_after REAL NOT NULL,
  reference_type TEXT, -- sale, purchase, return, adjustment
  reference_id TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payment_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'cash', -- cash, bank, mobile_money
  currency TEXT NOT NULL DEFAULT 'USD',
  opening_balance REAL NOT NULL DEFAULT 0,
  current_balance REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payment_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  group_name TEXT NOT NULL DEFAULT 'General',
  method TEXT NOT NULL DEFAULT 'cash', -- cash, evc_plus, edahab, merchant, bank
  requires_bank_name INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  account_id TEXT REFERENCES payment_accounts(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  contact_person TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_rate REAL NOT NULL DEFAULT 0,
  delivery_company_id TEXT REFERENCES delivery_companies(id),
  estimated_time TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_rates (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES delivery_companies(id),
  zone_id TEXT NOT NULL REFERENCES delivery_zones(id),
  rate REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cargo_companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  contact_person TEXT,
  base_rate_per_kg REAL NOT NULL DEFAULT 0,
  base_rate_per_cbm REAL NOT NULL DEFAULT 0,
  min_charge REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cargo_rates (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES cargo_companies(id),
  destination TEXT NOT NULL,
  rate_per_kg REAL NOT NULL DEFAULT 0,
  rate_per_cbm REAL NOT NULL DEFAULT 0,
  min_fee REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_type TEXT DEFAULT 'Motorcycle',
  vehicle_plate TEXT,
  license_number TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  commission_rate REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  sale_no TEXT NOT NULL UNIQUE,
  sale_date TEXT NOT NULL,
  sale_time TEXT,
  customer_id TEXT REFERENCES customers(id),
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  vat_rate REAL NOT NULL DEFAULT 0,
  vat_amount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  advance_amount REAL NOT NULL DEFAULT 0,
  returned_total REAL NOT NULL DEFAULT 0,
  balance REAL NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'full_paid', -- full_paid, partial, full_debt
  payment_channel_id TEXT REFERENCES payment_channels(id),
  payment_account_id TEXT REFERENCES payment_accounts(id),
  payment_method TEXT DEFAULT 'cash',
  fulfillment TEXT NOT NULL DEFAULT 'pickup', -- pickup, delivery, cargo
  delivery_fee REAL NOT NULL DEFAULT 0,
  cargo_fee REAL NOT NULL DEFAULT 0,
  fee_paid REAL NOT NULL DEFAULT 0,
  fee_balance REAL NOT NULL DEFAULT 0,
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_address TEXT,
  delivery_zone_id TEXT REFERENCES delivery_zones(id),
  cargo_company_id TEXT REFERENCES cargo_companies(id),
  driver_id TEXT REFERENCES drivers(id),
  status TEXT NOT NULL DEFAULT 'completed', -- completed, reversed, draft
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  product_name TEXT,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  cost_price REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  returned_quantity REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales_returns (
  id TEXT PRIMARY KEY,
  return_no TEXT NOT NULL UNIQUE,
  return_date TEXT NOT NULL,
  sale_id TEXT NOT NULL REFERENCES sales(id),
  customer_id TEXT REFERENCES customers(id),
  total_amount REAL NOT NULL DEFAULT 0,
  refund_amount REAL NOT NULL DEFAULT 0,
  payment_account_id TEXT REFERENCES payment_accounts(id),
  reason TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales_return_items (
  id TEXT PRIMARY KEY,
  return_id TEXT NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
  sale_item_id TEXT NOT NULL REFERENCES sale_items(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  total REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  order_date TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id),
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  vat_rate REAL NOT NULL DEFAULT 0,
  vat_amount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  advance_amount REAL NOT NULL DEFAULT 0,
  balance REAL NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, partial, paid
  fulfillment TEXT NOT NULL DEFAULT 'pickup', -- pickup, delivery, cargo
  delivery_fee REAL NOT NULL DEFAULT 0,
  cargo_fee REAL NOT NULL DEFAULT 0,
  fee_paid REAL NOT NULL DEFAULT 0,
  fee_balance REAL NOT NULL DEFAULT 0,
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_address TEXT,
  delivery_zone_id TEXT REFERENCES delivery_zones(id),
  cargo_company_id TEXT REFERENCES cargo_companies(id),
  driver_id TEXT REFERENCES drivers(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, ready, out_for_delivery, delivered, cancelled, converted
  converted_sale_id TEXT REFERENCES sales(id),
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  product_name TEXT,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  cost_price REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  delivery_no TEXT NOT NULL UNIQUE,
  order_id TEXT REFERENCES orders(id),
  sale_id TEXT REFERENCES sales(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending, assigned, picked_up, in_transit, delivered, failed, returned
  fulfillment TEXT NOT NULL DEFAULT 'delivery', -- delivery, cargo
  driver_id TEXT REFERENCES drivers(id),
  delivery_zone_id TEXT REFERENCES delivery_zones(id),
  cargo_company_id TEXT REFERENCES cargo_companies(id),
  delivery_company_id TEXT REFERENCES delivery_companies(id),
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_address TEXT,
  fee REAL NOT NULL DEFAULT 0,
  fee_paid REAL NOT NULL DEFAULT 0,
  fee_balance REAL NOT NULL DEFAULT 0,
  cod_amount REAL NOT NULL DEFAULT 0,
  cod_collected REAL NOT NULL DEFAULT 0,
  cargo_tracking_no TEXT,
  cargo_receipt_no TEXT,
  driver_paid INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  assigned_at TEXT,
  delivered_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS driver_handovers (
  id TEXT PRIMARY KEY,
  handover_no TEXT NOT NULL UNIQUE,
  driver_id TEXT NOT NULL REFERENCES drivers(id),
  delivery_id TEXT REFERENCES deliveries(id),
  amount REAL NOT NULL,
  payment_account_id TEXT NOT NULL REFERENCES payment_accounts(id),
  handover_date TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  purchase_no TEXT NOT NULL UNIQUE,
  purchase_date TEXT NOT NULL,
  supplier_id TEXT REFERENCES suppliers(id),
  supplier_name TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  balance REAL NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending', -- full_paid, partial, pending
  payment_account_id TEXT REFERENCES payment_accounts(id),
  status TEXT NOT NULL DEFAULT 'received', -- ordered, received, cancelled
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  product_name TEXT,
  quantity REAL NOT NULL,
  unit_cost REAL NOT NULL,
  total REAL NOT NULL,
  returned_quantity REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_returns (
  id TEXT PRIMARY KEY,
  return_no TEXT NOT NULL UNIQUE,
  return_date TEXT NOT NULL,
  purchase_id TEXT NOT NULL REFERENCES purchases(id),
  supplier_id TEXT REFERENCES suppliers(id),
  total_amount REAL NOT NULL DEFAULT 0,
  refund_amount REAL NOT NULL DEFAULT 0,
  payment_account_id TEXT REFERENCES payment_accounts(id),
  reason TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_return_items (
  id TEXT PRIMARY KEY,
  return_id TEXT NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
  purchase_item_id TEXT NOT NULL REFERENCES purchase_items(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity REAL NOT NULL,
  unit_cost REAL NOT NULL,
  total REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customer_payments (
  id TEXT PRIMARY KEY,
  payment_no TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  sale_id TEXT REFERENCES sales(id),
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_account_id TEXT REFERENCES payment_accounts(id),
  reference TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id TEXT PRIMARY KEY,
  payment_no TEXT NOT NULL UNIQUE,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  purchase_id TEXT REFERENCES purchases(id),
  amount REAL NOT NULL,
  payment_date TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_account_id TEXT REFERENCES payment_accounts(id),
  reference TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS account_transfers (
  id TEXT PRIMARY KEY,
  transfer_date TEXT NOT NULL,
  from_account_id TEXT NOT NULL REFERENCES payment_accounts(id),
  to_account_id TEXT NOT NULL REFERENCES payment_accounts(id),
  amount REAL NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id TEXT PRIMARY KEY,
  txn_no TEXT NOT NULL UNIQUE,
  txn_date TEXT NOT NULL,
  txn_type TEXT NOT NULL, -- sale, collection, expense, income, transfer, purchase_payment, refund, driver_settlement, capital
  amount REAL NOT NULL,
  fee_amount REAL NOT NULL DEFAULT 0,
  net_amount REAL NOT NULL,
  account_id TEXT REFERENCES payment_accounts(id),
  to_account_id TEXT REFERENCES payment_accounts(id),
  category TEXT,
  reference_type TEXT,
  reference_id TEXT,
  party_type TEXT, -- customer, supplier, driver, other
  party_id TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'completed', -- completed, voided
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_financial_states (
  id TEXT PRIMARY KEY,
  day_date TEXT NOT NULL UNIQUE,
  opening_cash REAL NOT NULL DEFAULT 0,
  total_income REAL NOT NULL DEFAULT 0,
  total_expenses REAL NOT NULL DEFAULT 0,
  total_sales REAL NOT NULL DEFAULT 0,
  total_collections REAL NOT NULL DEFAULT 0,
  net_cash_flow REAL NOT NULL DEFAULT 0,
  closing_cash REAL NOT NULL DEFAULT 0,
  total_receivables REAL NOT NULL DEFAULT 0,
  total_payables REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS financial_periods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'month', -- month, quarter, year
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_closed INTEGER NOT NULL DEFAULT 0,
  closed_at TEXT,
  closed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS financial_rules (
  id TEXT PRIMARY KEY,
  rule_name TEXT NOT NULL UNIQUE,
  rule_type TEXT NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  parameters TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS financial_settings (
  id TEXT PRIMARY KEY,
  currency TEXT NOT NULL DEFAULT 'USD',
  fiscal_year_start TEXT NOT NULL DEFAULT '01-01',
  enable_audit_log INTEGER NOT NULL DEFAULT 1,
  auto_reconcile INTEGER NOT NULL DEFAULT 1,
  default_cash_account_id TEXT REFERENCES payment_accounts(id),
  default_bank_account_id TEXT REFERENCES payment_accounts(id),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS financial_audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_data TEXT,
  new_data TEXT,
  actor_id TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS capital_records (
  id TEXT PRIMARY KEY,
  record_date TEXT NOT NULL,
  record_type TEXT NOT NULL DEFAULT 'equity_injection', -- equity_injection, dividend, capital_expense
  amount REAL NOT NULL,
  account_id TEXT REFERENCES payment_accounts(id),
  description TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fulfillment_events (
  id TEXT PRIMARY KEY,
  delivery_id TEXT REFERENCES deliveries(id),
  order_id TEXT REFERENCES orders(id),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT
);

-- Indices for rapid query performance
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_txn_date ON financial_transactions(txn_date);
CREATE INDEX IF NOT EXISTS idx_txn_account ON financial_transactions(account_id);
`;
