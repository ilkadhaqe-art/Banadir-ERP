-- ==============================================================================
-- BANADIR ONLINE FOS - COMPLETE FRESH DATABASE SCHEMA & MIGRATION
-- Single-file consolidated database setup for fresh Supabase PostgreSQL
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS & TYPES
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'manager', 'cashier', 'driver', 'viewer');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE public.payment_method AS ENUM ('cash', 'evc_plus', 'premier_bank', 'salaam_bank', 'merchant', 'other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fulfillment_type') THEN
    CREATE TYPE public.fulfillment_type AS ENUM ('pickup', 'delivery', 'cargo');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sale_status') THEN
    CREATE TYPE public.sale_status AS ENUM ('active', 'voided');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'converted', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
    CREATE TYPE public.delivery_status AS ENUM ('pending', 'assigned', 'in_transit', 'delivered', 'failed', 'returned');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type') THEN
    CREATE TYPE public.stock_movement_type AS ENUM ('purchase', 'sale', 'sale_return', 'purchase_return', 'adjustment', 'transfer_in', 'transfer_out');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'txn_status') THEN
    CREATE TYPE public.txn_status AS ENUM ('pending', 'completed', 'cancelled');
  END IF;
END $$;

-- 3. CORE UTILITY FUNCTIONS
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4. USERS & PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('owner', 'admin'));
$$;

CREATE OR REPLACE FUNCTION public.can_sell(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('owner', 'admin', 'manager', 'cashier'));
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id UUID, _role public.app_role, _enabled BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF _enabled THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
  END IF;
END;
$$;

-- 5. APP SETTINGS
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. PAYMENT ACCOUNTS & TRANSFERS
CREATE TABLE IF NOT EXISTS public.payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'wallet', -- 'wallet', 'bank', 'cash'
  scope TEXT NOT NULL DEFAULT 'business',
  account_number TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.account_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account_id UUID NOT NULL REFERENCES public.payment_accounts(id) ON DELETE RESTRICT,
  to_account_id UUID NOT NULL REFERENCES public.payment_accounts(id) ON DELETE RESTRICT,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  status public.txn_status NOT NULL DEFAULT 'completed',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  description TEXT,
  debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  account_id UUID REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
  source_table TEXT,
  source_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. PRODUCT CATALOG & INVENTORY
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  cost_price NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  selling_price NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
  stock INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  barcode TEXT,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type public.stock_movement_type NOT NULL,
  quantity INT NOT NULL,
  unit_cost NUMERIC(15,2) DEFAULT 0,
  note TEXT,
  source_table TEXT,
  source_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  old_price NUMERIC(15,2) NOT NULL,
  new_price NUMERIC(15,2) NOT NULL,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. CUSTOMERS & SUPPLIERS
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  credit_limit NUMERIC(15,2) DEFAULT 1000,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  address TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. SALES & ORDERS
CREATE SEQUENCE IF NOT EXISTS public.sale_ref_seq START 1;

CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_no TEXT NOT NULL UNIQUE DEFAULT ('S' || LPAD(nextval('public.sale_ref_seq')::TEXT, 5, '0')),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sale_time TIMESTAMPTZ DEFAULT now(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount NUMERIC(15,2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(15,2) NOT NULL DEFAULT 0,
  cargo_fee NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  advance_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance NUMERIC(15,2) GENERATED ALWAYS AS (GREATEST(0, total - paid_amount)) STORED,
  fee_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  account_id UUID REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
  payment_status TEXT NOT NULL DEFAULT 'unpaid', -- 'paid', 'partial', 'full_debt'
  fulfillment public.fulfillment_type NOT NULL DEFAULT 'pickup',
  status public.sale_status NOT NULL DEFAULT 'active',
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price - discount) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  account_id UUID REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  refund_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  refund_method public.payment_method DEFAULT 'cash',
  account_id UUID REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
  sale_item_id UUID REFERENCES public.sale_items(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  total NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. PURCHASES & PROCUREMENT
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount NUMERIC(15,2) NOT NULL DEFAULT 0,
  extra_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance NUMERIC(15,2) GENERATED ALWAYS AS (GREATEST(0, total - paid_amount)) STORED,
  payment_method public.payment_method DEFAULT 'cash',
  account_id UUID REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(15,2) NOT NULL CHECK (unit_cost >= 0),
  total NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  account_id UUID REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. LOGISTICS, DRIVERS & DELIVERIES
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_type TEXT DEFAULT 'Motorcycle',
  plate_number TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.delivery_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cargo_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  region TEXT DEFAULT 'Banaadir',
  fee NUMERIC(15,2) NOT NULL DEFAULT 2.00,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  zone_id UUID REFERENCES public.delivery_zones(id) ON DELETE SET NULL,
  cargo_company_id UUID REFERENCES public.cargo_companies(id) ON DELETE SET NULL,
  status public.delivery_status NOT NULL DEFAULT 'pending',
  fee NUMERIC(15,2) NOT NULL DEFAULT 0,
  cod_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  collected_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  recipient_name TEXT,
  recipient_phone TEXT,
  address TEXT,
  dispatch_date DATE DEFAULT CURRENT_DATE,
  delivered_date TIMESTAMPTZ,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT NOT NULL UNIQUE DEFAULT ('ORD' || LPAD(nextval('public.sale_ref_seq')::TEXT, 5, '0')),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  total NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount NUMERIC(15,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(15,2) NOT NULL DEFAULT 0,
  fulfillment public.fulfillment_type NOT NULL DEFAULT 'pickup',
  status public.order_status NOT NULL DEFAULT 'pending',
  recipient_name TEXT,
  recipient_phone TEXT,
  address TEXT,
  zone_id UUID REFERENCES public.delivery_zones(id) ON DELETE SET NULL,
  cargo_company_id UUID REFERENCES public.cargo_companies(id) ON DELETE SET NULL,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(15,2) NOT NULL CHECK (unit_price >= 0),
  total NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. VIEWS (AGGREGATIONS & READ MODELS)
CREATE OR REPLACE VIEW public.account_balances AS
SELECT 
  a.id AS account_id,
  a.name,
  a.kind,
  a.scope,
  a.active,
  COALESCE(SUM(t.credit), 0) - COALESCE(SUM(t.debit), 0) AS balance
FROM public.payment_accounts a
LEFT JOIN public.financial_transactions t ON a.id = t.account_id
GROUP BY a.id, a.name, a.kind, a.scope, a.active;

CREATE OR REPLACE VIEW public.sales_overview AS
SELECT 
  s.id,
  s.sale_no,
  s.sale_date,
  s.sale_time,
  s.customer_id,
  c.name AS customer_name,
  c.phone AS customer_phone,
  s.total,
  s.paid_amount,
  s.balance,
  s.payment_method,
  s.payment_status,
  s.fulfillment,
  s.status,
  s.created_at
FROM public.sales s
LEFT JOIN public.customers c ON s.customer_id = c.id;

CREATE OR REPLACE VIEW public.customer_balances AS
SELECT 
  c.id AS customer_id,
  c.name,
  c.phone,
  COALESCE(SUM(s.balance), 0) AS total_debt
FROM public.customers c
LEFT JOIN public.sales s ON c.id = s.customer_id AND s.status = 'active'
GROUP BY c.id, c.name, c.phone;

-- 13. PROCEDURES & ATOMIC BUSINESS ENGINES (RPCS)

-- Apply Sale & Record Inventory / Accounting
CREATE OR REPLACE FUNCTION public.apply_sale(
  _sale_id UUID,
  _sale_date DATE,
  _sale_time TIMESTAMPTZ,
  _customer_id UUID,
  _items JSONB,
  _discount NUMERIC DEFAULT 0,
  _vat_rate NUMERIC DEFAULT 0,
  _paid_amount NUMERIC DEFAULT 0,
  _advance_amount NUMERIC DEFAULT 0,
  _payment_method public.payment_method DEFAULT 'cash',
  _account_id UUID DEFAULT NULL,
  _fulfillment public.fulfillment_type DEFAULT 'pickup',
  _delivery_fee NUMERIC DEFAULT 0,
  _cargo_fee NUMERIC DEFAULT 0,
  _recipient_name TEXT DEFAULT NULL,
  _recipient_phone TEXT DEFAULT NULL,
  _address TEXT DEFAULT NULL,
  _location_id UUID DEFAULT NULL,
  _region_id UUID DEFAULT NULL,
  _delivery_company_id UUID DEFAULT NULL,
  _driver_id UUID DEFAULT NULL,
  _cargo_company_id UUID DEFAULT NULL,
  _note TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_item RECORD;
  v_subtotal NUMERIC(15,2) := 0;
  v_vat_amt NUMERIC(15,2) := 0;
  v_total NUMERIC(15,2) := 0;
  v_p_cost NUMERIC(15,2);
  v_prod_stock INT;
  v_status TEXT;
BEGIN
  -- Validate items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(_items) AS x(product_id UUID, quantity INT, unit_price NUMERIC, discount NUMERIC) LOOP
    SELECT cost_price, stock INTO v_p_cost, v_prod_stock FROM public.products WHERE id = v_item.product_id;
    IF v_prod_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Stock kuma filna alaabta (Insufficient stock for product ID %)', v_item.product_id;
    END IF;

    v_subtotal := v_subtotal + (v_item.quantity * v_item.unit_price) - COALESCE(v_item.discount, 0);

    INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, unit_cost, discount)
    VALUES (_sale_id, v_item.product_id, v_item.quantity, v_item.unit_price, COALESCE(v_p_cost, 0), COALESCE(v_item.discount, 0));

    -- Decrement stock
    UPDATE public.products SET stock = stock - v_item.quantity WHERE id = v_item.product_id;

    -- Record stock movement
    INSERT INTO public.inventory_movements (product_id, movement_type, quantity, unit_cost, source_table, source_id, note)
    VALUES (v_item.product_id, 'sale', -v_item.quantity, COALESCE(v_p_cost, 0), 'sales', _sale_id, 'Iibka ref: ' || _sale_id);
  END LOOP;

  v_vat_amt := ROUND(v_subtotal * COALESCE(_vat_rate, 0), 2);
  v_total := v_subtotal - COALESCE(_discount, 0) + v_vat_amt + COALESCE(_delivery_fee, 0) + COALESCE(_cargo_fee, 0);

  IF _paid_amount >= v_total THEN
    v_status := 'paid';
  ELSIF _paid_amount > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'full_debt';
  END IF;

  UPDATE public.sales
  SET 
    sale_date = COALESCE(_sale_date, CURRENT_DATE),
    sale_time = COALESCE(_sale_time, now()),
    customer_id = _customer_id,
    subtotal = v_subtotal,
    discount = COALESCE(_discount, 0),
    vat_rate = COALESCE(_vat_rate, 0),
    vat_amount = v_vat_amt,
    delivery_fee = COALESCE(_delivery_fee, 0),
    cargo_fee = COALESCE(_cargo_fee, 0),
    total = v_total,
    paid_amount = COALESCE(_paid_amount, 0),
    payment_method = _payment_method,
    account_id = _account_id,
    payment_status = v_status,
    fulfillment = _fulfillment,
    note = _note
  WHERE id = _sale_id;

  -- Financial Ledger Entry if payment received
  IF _paid_amount > 0 AND _account_id IS NOT NULL THEN
    INSERT INTO public.financial_transactions (txn_date, category, description, credit, account_id, source_table, source_id)
    VALUES (COALESCE(_sale_date, CURRENT_DATE), 'Sales Income', 'Lacag iib ah', _paid_amount, _account_id, 'sales', _sale_id);
  END IF;
END;
$$;

-- Create Sale Master Function
CREATE OR REPLACE FUNCTION public.create_sale(
  _sale_date DATE DEFAULT CURRENT_DATE,
  _customer_id UUID DEFAULT NULL,
  _items JSONB DEFAULT '[]'::JSONB,
  _discount NUMERIC DEFAULT 0,
  _paid_amount NUMERIC DEFAULT 0,
  _payment_method public.payment_method DEFAULT 'cash',
  _account_id UUID DEFAULT NULL,
  _note TEXT DEFAULT NULL,
  _vat_rate NUMERIC DEFAULT 0,
  _advance_amount NUMERIC DEFAULT 0,
  _fulfillment public.fulfillment_type DEFAULT 'pickup',
  _delivery_fee NUMERIC DEFAULT 0,
  _cargo_fee NUMERIC DEFAULT 0,
  _recipient_name TEXT DEFAULT NULL,
  _recipient_phone TEXT DEFAULT NULL,
  _address TEXT DEFAULT NULL,
  _location_id UUID DEFAULT NULL,
  _region_id UUID DEFAULT NULL,
  _delivery_company_id UUID DEFAULT NULL,
  _driver_id UUID DEFAULT NULL,
  _cargo_company_id UUID DEFAULT NULL,
  _sale_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_sale_id UUID;
BEGIN
  INSERT INTO public.sales (sale_date, payment_method, fulfillment, status)
  VALUES (COALESCE(_sale_date, CURRENT_DATE), _payment_method, _fulfillment, 'active')
  RETURNING id INTO v_sale_id;

  PERFORM public.apply_sale(
    v_sale_id, _sale_date, _sale_time, _customer_id, _items, _discount, _vat_rate,
    _paid_amount, _advance_amount, _payment_method, _account_id, _fulfillment,
    _delivery_fee, _cargo_fee, _recipient_name, _recipient_phone, _address,
    _location_id, _region_id, _delivery_company_id, _driver_id, _cargo_company_id, _note
  );

  IF _fulfillment <> 'pickup' THEN
    INSERT INTO public.deliveries (
      sale_id, driver_id, zone_id, cargo_company_id, status, fee,
      cod_amount, recipient_name, recipient_phone, address, note
    )
    VALUES (
      v_sale_id, _driver_id, _location_id, _cargo_company_id,
      CASE WHEN _driver_id IS NOT NULL THEN 'assigned'::public.delivery_status ELSE 'pending'::public.delivery_status END,
      COALESCE(_delivery_fee, 0) + COALESCE(_cargo_fee, 0),
      GREATEST(0, (SELECT balance FROM public.sales WHERE id = v_sale_id)),
      _recipient_name, _recipient_phone, _address, _note
    );
  END IF;

  RETURN v_sale_id;
END;
$$;

-- Business Overview RPC
CREATE OR REPLACE FUNCTION public.business_overview(_from DATE DEFAULT NULL, _to DATE DEFAULT NULL)
RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_sales', COALESCE(SUM(total), 0),
    'total_paid', COALESCE(SUM(paid_amount), 0),
    'total_debt', COALESCE(SUM(balance), 0),
    'sales_count', COUNT(id)
  ) INTO v_result
  FROM public.sales
  WHERE status = 'active'
    AND (_from IS NULL OR sale_date >= _from)
    AND (_to IS NULL OR sale_date <= _to);

  RETURN v_result;
END;
$$;

-- Financial Snapshot RPC
CREATE OR REPLACE FUNCTION public.financial_snapshot()
RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'cash_in_accounts', COALESCE((SELECT SUM(balance) FROM public.account_balances), 0),
    'customer_receivables', COALESCE((SELECT SUM(balance) FROM public.sales WHERE status = 'active'), 0),
    'inventory_asset_value', COALESCE((SELECT SUM(stock * cost_price) FROM public.products WHERE active = true), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Account Transfer RPC
CREATE OR REPLACE FUNCTION public.create_account_transfer(
  _from_account_id UUID,
  _to_account_id UUID,
  _amount NUMERIC,
  _transfer_date DATE DEFAULT CURRENT_DATE,
  _note TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.account_transfers (from_account_id, to_account_id, amount, transfer_date, note, status)
  VALUES (_from_account_id, _to_account_id, _amount, COALESCE(_transfer_date, CURRENT_DATE), _note, 'completed')
  RETURNING id INTO v_id;

  -- Debit from source account
  INSERT INTO public.financial_transactions (txn_date, category, description, debit, account_id, source_table, source_id)
  VALUES (COALESCE(_transfer_date, CURRENT_DATE), 'Transfer Out', 'Wareejin: ' || COALESCE(_note, 'Transfer'), _amount, _from_account_id, 'account_transfers', v_id);

  -- Credit to target account
  INSERT INTO public.financial_transactions (txn_date, category, description, credit, account_id, source_table, source_id)
  VALUES (COALESCE(_transfer_date, CURRENT_DATE), 'Transfer In', 'Soo galid: ' || COALESCE(_note, 'Transfer'), _amount, _to_account_id, 'account_transfers', v_id);

  RETURN v_id;
END;
$$;

-- 14. DEFAULT SEEDS FOR BANADIR ONLINE FOS
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('business_name', 'Banadir Online FOS', 'Magaca Ganacsiga'),
  ('currency', 'USD', 'Lacagta la isticmaalo'),
  ('vat_rate', '0.05', 'Cashuurta 5%'),
  ('receipt_phone', '+252 61 555 0123', 'Telefoonka Xarunta'),
  ('receipt_address', 'Maka Al-Mukarama, Mogadishu', 'Cinwaanka Guud')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Payment Accounts
INSERT INTO public.payment_accounts (id, name, kind, scope, active)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'EVC Plus (Main)', 'wallet', 'business', true),
  ('a0000000-0000-0000-0000-000000000002', 'Premier Bank USD', 'bank', 'business', true),
  ('a0000000-0000-0000-0000-000000000003', 'Salaam Somali Bank', 'bank', 'business', true),
  ('a0000000-0000-0000-0000-000000000004', 'Cash Box (Khasnadda)', 'cash', 'business', true)
ON CONFLICT (id) DO NOTHING;

-- Mogadishu Delivery Zones
INSERT INTO public.delivery_zones (name, region, fee, active)
VALUES 
  ('Hodan', 'Banaadir', 2.00, true),
  ('Howlwadaag', 'Banaadir', 2.00, true),
  ('Waberi', 'Banaadir', 2.00, true),
  ('Shibis', 'Banaadir', 2.50, true),
  ('Boondheere', 'Banaadir', 2.50, true),
  ('Wadajir', 'Banaadir', 2.00, true),
  ('Dayniile', 'Banaadir', 3.00, true),
  ('Yaaqshiid', 'Banaadir', 3.00, true),
  ('Kaaran', 'Banaadir', 3.50, true)
ON CONFLICT (name) DO NOTHING;

-- Cargo Companies
INSERT INTO public.cargo_companies (name, phone, active)
VALUES 
  ('SomCargo Logistics', '+252 61 888 1111', true),
  ('Tawakal Cargo Express', '+252 61 777 2222', true)
ON CONFLICT DO NOTHING;

-- Product Categories
INSERT INTO public.product_categories (name, description)
VALUES 
  ('Electronics', 'Qalabka korontada & Mobile-ada'),
  ('Fashion', 'Dharka & Kabaha'),
  ('Groceries', 'Cuntada & Raashinka')
ON CONFLICT (name) DO NOTHING;

-- 15. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public Read Access" ON public.products FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public Read Sales" ON public.sales FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public Read Accounts" ON public.payment_accounts FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
