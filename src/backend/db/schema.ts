export const DATABASE_SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

-- 1. USERS, PROFILES & ROLES
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'cashier', 'driver', 'viewer')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, role)
);

-- 2. APP SETTINGS
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. PAYMENT ACCOUNTS, CHANNELS & TRANSFERS
CREATE TABLE IF NOT EXISTS payment_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'wallet' CHECK (kind IN ('wallet', 'bank', 'cash')),
  scope TEXT NOT NULL DEFAULT 'business' CHECK (scope IN ('business', 'personal')),
  account_number TEXT,
  balance NUMERIC NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payment_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'mobile_wallet',
  account_id TEXT REFERENCES payment_accounts(id) ON DELETE SET NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS account_transfers (
  id TEXT PRIMARY KEY,
  from_account_id TEXT NOT NULL REFERENCES payment_accounts(id) ON DELETE RESTRICT,
  to_account_id TEXT NOT NULL REFERENCES payment_accounts(id) ON DELETE RESTRICT,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  transfer_date TEXT NOT NULL,
  reference TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. PRODUCT CATALOG & PRICING
CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id TEXT REFERENCES product_categories(id) ON DELETE SET NULL,
  brand_id TEXT REFERENCES product_brands(id) ON DELETE SET NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  cost_price NUMERIC NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  sell_price NUMERIC NOT NULL DEFAULT 0 CHECK (sell_price >= 0),
  stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 5,
  barcode TEXT,
  image_url TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS price_history (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price NUMERIC NOT NULL,
  new_price NUMERIC NOT NULL,
  changed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. REAL INVENTORY MOVEMENT ENGINE
CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('opening', 'purchase', 'sale', 'sale_return', 'purchase_return', 'adjustment', 'transfer_in', 'transfer_out', 'damage', 'loss')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  reference TEXT,
  source_module TEXT,
  source_id TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6. CUSTOMERS & SUPPLIERS
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  credit_limit NUMERIC NOT NULL DEFAULT 1000 CHECK (credit_limit >= 0),
  current_balance NUMERIC NOT NULL DEFAULT 0,
  total_sales NUMERIC NOT NULL DEFAULT 0,
  total_paid NUMERIC NOT NULL DEFAULT 0,
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
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  total_purchases NUMERIC NOT NULL DEFAULT 0,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7. LOCATIONS, LOGISTICS & CARGO
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('district', 'region')),
  parent_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  contact_person TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cargo_companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  contact_person TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  company_id TEXT REFERENCES delivery_companies(id) ON DELETE SET NULL,
  vehicle TEXT DEFAULT 'Bajaj',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  region TEXT DEFAULT 'Banaadir',
  fee NUMERIC NOT NULL DEFAULT 2.00,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_rates (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES delivery_companies(id) ON DELETE CASCADE,
  district_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
  rate NUMERIC NOT NULL DEFAULT 3.00,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cargo_rates (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES cargo_companies(id) ON DELETE CASCADE,
  region_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
  rate NUMERIC NOT NULL DEFAULT 15.00,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8. SALES & SALE ITEMS
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  sale_no TEXT NOT NULL UNIQUE,
  sale_date TEXT NOT NULL,
  sale_time TEXT,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  vat_rate NUMERIC NOT NULL DEFAULT 0,
  vat_amount NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  cargo_fee NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_balance NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'partial', 'debt', 'full_debt', 'reversed')),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_channel_id TEXT REFERENCES payment_channels(id) ON DELETE SET NULL,
  bank_name TEXT,
  account_id TEXT REFERENCES payment_accounts(id) ON DELETE SET NULL,
  fulfillment_type TEXT NOT NULL DEFAULT 'pickup' CHECK (fulfillment_type IN ('pickup', 'delivery', 'cargo')),
  delivery_status TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  delivery_company_id TEXT REFERENCES delivery_companies(id) ON DELETE SET NULL,
  driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
  cargo_company_id TEXT REFERENCES cargo_companies(id) ON DELETE SET NULL,
  location_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided', 'reversed')),
  notes TEXT,
  cashier_name TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customer_payments (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_date TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  account_id TEXT REFERENCES payment_accounts(id) ON DELETE SET NULL,
  note TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales_returns (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  return_date TEXT NOT NULL,
  refund_amount NUMERIC NOT NULL DEFAULT 0,
  refund_method TEXT DEFAULT 'cash',
  account_id TEXT REFERENCES payment_accounts(id) ON DELETE SET NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sales_return_items (
  id TEXT PRIMARY KEY,
  return_id TEXT NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 9. ORDERS & DELIVERIES
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  order_date TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  fulfillment TEXT NOT NULL DEFAULT 'delivery',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'converted', 'cancelled')),
  sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL,
  zone_id TEXT REFERENCES delivery_zones(id) ON DELETE SET NULL,
  cargo_company_id TEXT REFERENCES cargo_companies(id) ON DELETE SET NULL,
  address TEXT,
  note TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  sale_id TEXT REFERENCES sales(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
  zone_id TEXT REFERENCES delivery_zones(id) ON DELETE SET NULL,
  delivery_company_id TEXT REFERENCES delivery_companies(id) ON DELETE SET NULL,
  cargo_company_id TEXT REFERENCES cargo_companies(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_transit', 'delivered', 'failed', 'returned', 'cancelled')),
  fee NUMERIC NOT NULL DEFAULT 0,
  cod_amount NUMERIC NOT NULL DEFAULT 0,
  collected_amount NUMERIC NOT NULL DEFAULT 0,
  recipient_name TEXT,
  recipient_phone TEXT,
  address TEXT,
  dispatch_date TEXT,
  delivered_date TEXT,
  handover_status TEXT DEFAULT 'pending',
  note TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_events (
  id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  driver_id TEXT REFERENCES drivers(id) ON DELETE SET NULL,
  amount_collected NUMERIC DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS driver_handovers (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  account_id TEXT REFERENCES payment_accounts(id) ON DELETE SET NULL,
  handover_date TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 10. PURCHASES & PROCUREMENT
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  invoice_no TEXT,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  purchase_date TEXT NOT NULL,
  total NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  remaining_balance NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  account_id TEXT REFERENCES payment_accounts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'ordered', 'voided')),
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC NOT NULL CHECK (unit_cost >= 0),
  line_total NUMERIC NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  purchase_id TEXT REFERENCES purchases(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_date TEXT NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  account_id TEXT REFERENCES payment_accounts(id) ON DELETE SET NULL,
  note TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_returns (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  return_date TEXT NOT NULL,
  refund_amount NUMERIC NOT NULL DEFAULT 0,
  account_id TEXT REFERENCES payment_accounts(id) ON DELETE SET NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS purchase_return_items (
  id TEXT PRIMARY KEY,
  return_id TEXT NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 11. FINANCIAL ENGINE, RULES & LEDGER
CREATE TABLE IF NOT EXISTS financial_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('business', 'personal')),
  kind TEXT NOT NULL CHECK (kind IN ('obligation', 'guaranteed_income')),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'monthly', 'friday')),
  skip_friday INTEGER NOT NULL DEFAULT 0,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS financial_transactions (
  id TEXT PRIMARY KEY,
  transaction_date TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('expense', 'income', 'sale_payment', 'supplier_payment', 'collection', 'transfer')),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  account_id TEXT REFERENCES payment_accounts(id) ON DELETE SET NULL,
  from_account_id TEXT REFERENCES payment_accounts(id) ON DELETE SET NULL,
  to_account_id TEXT REFERENCES payment_accounts(id) ON DELETE SET NULL,
  reference TEXT,
  source_module TEXT,
  source_id TEXT,
  note TEXT,
  is_personal INTEGER NOT NULL DEFAULT 0,
  is_guaranteed INTEGER NOT NULL DEFAULT 0,
  is_void INTEGER NOT NULL DEFAULT 0,
  void_reason TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_financial_states (
  day TEXT PRIMARY KEY,
  opening_cash NUMERIC NOT NULL DEFAULT 0,
  closing_cash NUMERIC NOT NULL DEFAULT 0,
  sales_total NUMERIC NOT NULL DEFAULT 0,
  collections_total NUMERIC NOT NULL DEFAULT 0,
  expenses_total NUMERIC NOT NULL DEFAULT 0,
  obligations_met NUMERIC NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 12. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  record_id TEXT,
  before_state TEXT,
  after_state TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 13. INDEXES
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_sale_no ON sales(sale_no);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_sale ON deliveries(sale_id);
CREATE INDEX IF NOT EXISTS idx_fin_txns_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_fin_txns_account ON financial_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_module ON audit_logs(module);
`;
