-- ===== PHASE 6: ORDERS, DELIVERY & CARGO, DRIVERS, COD HANDOVERS =====

CREATE TYPE public.order_status AS ENUM ('pending','confirmed','ready','out_for_delivery','delivered','cancelled','converted');
CREATE TYPE public.fulfillment_type AS ENUM ('pickup','delivery','cargo');
CREATE TYPE public.delivery_status AS ENUM ('pending','assigned','picked_up','in_transit','delivered','failed','returned');

-- ---------- delivery zones ----------
CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  district text,
  default_fee numeric(14,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_zones TO authenticated;
GRANT ALL ON public.delivery_zones TO service_role;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zones readable" ON public.delivery_zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "zones managed" ON public.delivery_zones FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER delivery_zones_updated_at BEFORE UPDATE ON public.delivery_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- cargo companies ----------
CREATE TABLE public.cargo_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  phone text,
  contact_person text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargo_companies TO authenticated;
GRANT ALL ON public.cargo_companies TO service_role;
ALTER TABLE public.cargo_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cargo companies readable" ON public.cargo_companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "cargo companies managed" ON public.cargo_companies FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER cargo_companies_updated_at BEFORE UPDATE ON public.cargo_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- cargo rates ----------
CREATE TABLE public.cargo_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.cargo_companies(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES public.delivery_zones(id) ON DELETE CASCADE,
  destination text,
  rate numeric(14,2) NOT NULL DEFAULT 0,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargo_rates TO authenticated;
GRANT ALL ON public.cargo_rates TO service_role;
ALTER TABLE public.cargo_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cargo rates readable" ON public.cargo_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "cargo rates managed" ON public.cargo_rates FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER cargo_rates_updated_at BEFORE UPDATE ON public.cargo_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- drivers ----------
CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  vehicle_type text NOT NULL DEFAULT 'motorcycle',
  license_no text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  user_id uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drivers readable" ON public.drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "drivers managed" ON public.drivers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER drivers_updated_at BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- orders ----------
CREATE SEQUENCE public.order_number_seq;
CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS text LANGUAGE sql SET search_path = public AS $$
  SELECT 'O-' || to_char(CURRENT_DATE,'YYMM') || '-' || lpad(nextval('public.order_number_seq')::text, 5, '0');
$$;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL UNIQUE DEFAULT public.next_order_number(),
  customer_id uuid REFERENCES public.customers(id),
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  status public.order_status NOT NULL DEFAULT 'pending',
  fulfillment public.fulfillment_type NOT NULL DEFAULT 'pickup',
  zone_id uuid REFERENCES public.delivery_zones(id),
  cargo_company_id uuid REFERENCES public.cargo_companies(id),
  delivery_address text,
  delivery_fee numeric(14,2) NOT NULL DEFAULT 0,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  sale_id uuid REFERENCES public.sales(id),
  note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders readable" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "orders writable by sellers" ON public.orders FOR ALL TO authenticated
  USING (public.can_sell(auth.uid())) WITH CHECK (public.can_sell(auth.uid()));
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX orders_date_idx ON public.orders(order_date DESC);
CREATE INDEX orders_status_idx ON public.orders(status);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity numeric(14,2) NOT NULL,
  unit_price numeric(14,2) NOT NULL,
  unit_cost numeric(14,2) NOT NULL DEFAULT 0,
  line_total numeric(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order items readable" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "order items writable by sellers" ON public.order_items FOR ALL TO authenticated
  USING (public.can_sell(auth.uid())) WITH CHECK (public.can_sell(auth.uid()));
CREATE INDEX order_items_order_idx ON public.order_items(order_id);

-- ---------- deliveries ----------
CREATE SEQUENCE public.delivery_number_seq;
CREATE OR REPLACE FUNCTION public.next_delivery_number()
RETURNS text LANGUAGE sql SET search_path = public AS $$
  SELECT 'D-' || to_char(CURRENT_DATE,'YYMM') || '-' || lpad(nextval('public.delivery_number_seq')::text, 5, '0');
$$;

CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_no text NOT NULL UNIQUE DEFAULT public.next_delivery_number(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id),
  zone_id uuid REFERENCES public.delivery_zones(id),
  cargo_company_id uuid REFERENCES public.cargo_companies(id),
  status public.delivery_status NOT NULL DEFAULT 'pending',
  fee numeric(14,2) NOT NULL DEFAULT 0,
  cod_amount numeric(14,2) NOT NULL DEFAULT 0,
  cod_collected boolean NOT NULL DEFAULT false,
  recipient_name text,
  recipient_phone text,
  address text,
  dispatch_date date,
  delivered_at timestamptz,
  note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deliveries readable" ON public.deliveries FOR SELECT TO authenticated USING (true);
CREATE POLICY "deliveries writable" ON public.deliveries FOR ALL TO authenticated
  USING (public.can_sell(auth.uid()) OR public.has_role(auth.uid(),'driver'))
  WITH CHECK (public.can_sell(auth.uid()) OR public.has_role(auth.uid(),'driver'));
CREATE TRIGGER deliveries_updated_at BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX deliveries_status_idx ON public.deliveries(status);
CREATE INDEX deliveries_driver_idx ON public.deliveries(driver_id);

-- ---------- driver handovers (COD cash returned) ----------
CREATE TABLE public.driver_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id),
  handover_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(14,2) NOT NULL,
  method public.payment_method NOT NULL DEFAULT 'cash',
  account_id uuid REFERENCES public.payment_accounts(id),
  reference text,
  note text,
  status public.txn_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_handovers TO authenticated;
GRANT ALL ON public.driver_handovers TO service_role;
ALTER TABLE public.driver_handovers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "handovers readable" ON public.driver_handovers FOR SELECT TO authenticated USING (true);
CREATE POLICY "handovers writable" ON public.driver_handovers FOR ALL TO authenticated
  USING (public.can_sell(auth.uid())) WITH CHECK (public.can_sell(auth.uid()));

-- ---------- read-model views ----------
CREATE VIEW public.orders_overview
WITH (security_invoker = true) AS
SELECT o.id, o.order_no, o.order_date, o.status, o.fulfillment,
       o.customer_id, c.name AS customer_name, c.phone AS customer_phone,
       o.zone_id, z.name AS zone_name,
       o.cargo_company_id, cc.name AS cargo_company_name,
       o.delivery_address, o.delivery_fee, o.subtotal, o.discount, o.total,
       o.sale_id, s.sale_no, o.note, o.created_at,
       COALESCE(i.item_count,0)::int AS item_count,
       COALESCE(i.quantity_total,0)::numeric AS quantity_total,
       d.id AS delivery_id, d.delivery_no, d.status AS delivery_status,
       d.driver_id, dr.name AS driver_name
FROM public.orders o
LEFT JOIN public.customers c ON c.id = o.customer_id
LEFT JOIN public.delivery_zones z ON z.id = o.zone_id
LEFT JOIN public.cargo_companies cc ON cc.id = o.cargo_company_id
LEFT JOIN public.sales s ON s.id = o.sale_id
LEFT JOIN LATERAL (
  SELECT count(*) AS item_count, SUM(oi.quantity) AS quantity_total
  FROM public.order_items oi WHERE oi.order_id = o.id
) i ON true
LEFT JOIN LATERAL (
  SELECT dd.* FROM public.deliveries dd WHERE dd.order_id = o.id
  ORDER BY dd.created_at DESC LIMIT 1
) d ON true
LEFT JOIN public.drivers dr ON dr.id = d.driver_id;
GRANT SELECT ON public.orders_overview TO authenticated;

CREATE VIEW public.deliveries_overview
WITH (security_invoker = true) AS
SELECT d.id, d.delivery_no, d.order_id, o.order_no, d.sale_id, s.sale_no,
       d.driver_id, dr.name AS driver_name, dr.phone AS driver_phone,
       d.zone_id, z.name AS zone_name,
       d.cargo_company_id, cc.name AS cargo_company_name,
       d.status, d.fee, d.cod_amount, d.recipient_name, d.recipient_phone,
       d.address, d.dispatch_date, d.delivered_at, d.note, d.created_at,
       COALESCE(o.customer_id, s.customer_id) AS customer_id,
       COALESCE(oc.name, sc.name) AS customer_name
FROM public.deliveries d
LEFT JOIN public.orders o ON o.id = d.order_id
LEFT JOIN public.sales s ON s.id = d.sale_id
LEFT JOIN public.drivers dr ON dr.id = d.driver_id
LEFT JOIN public.delivery_zones z ON z.id = d.zone_id
LEFT JOIN public.cargo_companies cc ON cc.id = d.cargo_company_id
LEFT JOIN public.customers oc ON oc.id = o.customer_id
LEFT JOIN public.customers sc ON sc.id = s.customer_id;
GRANT SELECT ON public.deliveries_overview TO authenticated;

CREATE VIEW public.driver_balances
WITH (security_invoker = true) AS
SELECT dr.id AS driver_id, dr.name, dr.phone, dr.vehicle_type, dr.active,
       COALESCE(dl.cod_total,0)::numeric(14,2) AS cod_total,
       COALESCE(dl.cod_collected,0)::numeric(14,2) AS cod_collected,
       COALESCE(h.handed_over,0)::numeric(14,2) AS handed_over,
       (COALESCE(dl.cod_collected,0) - COALESCE(h.handed_over,0))::numeric(14,2) AS outstanding
FROM public.drivers dr
LEFT JOIN LATERAL (
  SELECT SUM(d.cod_amount) AS cod_total,
         SUM(d.cod_amount) FILTER (WHERE d.status = 'delivered') AS cod_collected
  FROM public.deliveries d WHERE d.driver_id = dr.id
) dl ON true
LEFT JOIN LATERAL (
  SELECT SUM(hh.amount) AS handed_over FROM public.driver_handovers hh
  WHERE hh.driver_id = dr.id AND hh.status = 'active'
) h ON true;
GRANT SELECT ON public.driver_balances TO authenticated;

CREATE VIEW public.driver_performance
WITH (security_invoker = true) AS
SELECT dr.id AS driver_id, dr.name, dr.phone, dr.vehicle_type, dr.active,
       COALESCE(x.deliveries_total,0)::int AS deliveries_total,
       COALESCE(x.delivered,0)::int AS delivered,
       COALESCE(x.in_progress,0)::int AS in_progress,
       COALESCE(x.unsuccessful,0)::int AS unsuccessful,
       COALESCE(x.unassigned,0)::int AS unassigned,
       COALESCE(x.fees_total,0)::numeric(14,2) AS fees_total,
       COALESCE(x.cod_collected,0)::numeric(14,2) AS cod_collected,
       x.last_delivery_at
FROM public.drivers dr
LEFT JOIN LATERAL (
  SELECT count(*) AS deliveries_total,
         count(*) FILTER (WHERE d.status='delivered') AS delivered,
         count(*) FILTER (WHERE d.status IN ('assigned','picked_up','in_transit')) AS in_progress,
         count(*) FILTER (WHERE d.status IN ('failed','returned')) AS unsuccessful,
         count(*) FILTER (WHERE d.status='pending') AS unassigned,
         SUM(d.fee) AS fees_total,
         SUM(d.cod_amount) FILTER (WHERE d.status='delivered') AS cod_collected,
         MAX(d.delivered_at) AS last_delivery_at
  FROM public.deliveries d WHERE d.driver_id = dr.id
) x ON true;
GRANT SELECT ON public.driver_performance TO authenticated;

-- ---------- RPCs ----------
CREATE OR REPLACE FUNCTION public.create_order(
  _order_date date, _customer_id uuid, _items jsonb, _discount numeric DEFAULT 0,
  _fulfillment public.fulfillment_type DEFAULT 'pickup', _delivery_fee numeric DEFAULT 0,
  _zone_id uuid DEFAULT NULL, _cargo_company_id uuid DEFAULT NULL,
  _address text DEFAULT NULL, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE it jsonb; v_id uuid; v_sub numeric(14,2) := 0; v_qty numeric; v_price numeric; v_product record;
BEGIN
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'An order needs at least one line item';
  END IF;
  IF COALESCE(_discount,0) < 0 OR COALESCE(_delivery_fee,0) < 0 THEN
    RAISE EXCEPTION 'Discount and delivery fee cannot be negative';
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (it->>'quantity')::numeric; v_price := (it->>'unit_price')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'Every line needs a quantity above zero'; END IF;
    IF v_price IS NULL OR v_price < 0 THEN RAISE EXCEPTION 'Every line needs a valid price'; END IF;
    SELECT id, name, active INTO v_product FROM public.products WHERE id = (it->>'product_id')::uuid;
    IF v_product.id IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
    IF NOT v_product.active THEN RAISE EXCEPTION 'Product % is inactive', v_product.name; END IF;
    v_sub := v_sub + (v_qty * v_price);
  END LOOP;

  IF COALESCE(_discount,0) > v_sub THEN RAISE EXCEPTION 'Discount cannot exceed the subtotal'; END IF;
  IF _fulfillment = 'delivery' AND _zone_id IS NULL THEN RAISE EXCEPTION 'Choose a delivery zone'; END IF;
  IF _fulfillment = 'cargo' AND _cargo_company_id IS NULL THEN RAISE EXCEPTION 'Choose a cargo company'; END IF;

  INSERT INTO public.orders (order_date, customer_id, status, fulfillment, zone_id, cargo_company_id,
                             delivery_address, delivery_fee, subtotal, discount, total, note, created_by)
  VALUES (COALESCE(_order_date, CURRENT_DATE), _customer_id, 'pending', _fulfillment, _zone_id, _cargo_company_id,
          _address, COALESCE(_delivery_fee,0), v_sub, COALESCE(_discount,0),
          v_sub - COALESCE(_discount,0) + COALESCE(_delivery_fee,0), _note, auth.uid())
  RETURNING id INTO v_id;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT id, cost_price INTO v_product FROM public.products WHERE id = (it->>'product_id')::uuid;
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, unit_cost)
    VALUES (v_id, v_product.id, (it->>'quantity')::numeric, (it->>'unit_price')::numeric, v_product.cost_price);
  END LOOP;

  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE o record;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.sale_id IS NOT NULL OR o.status = 'converted' THEN RAISE EXCEPTION 'This order is already a sale'; END IF;
  UPDATE public.orders SET status = 'cancelled' WHERE id = _order_id;
  UPDATE public.deliveries SET status = 'returned'
   WHERE order_id = _order_id AND status NOT IN ('delivered','failed','returned');
END; $$;

CREATE OR REPLACE FUNCTION public.convert_order_to_sale(
  _order_id uuid, _paid_amount numeric DEFAULT 0,
  _payment_method public.payment_method DEFAULT 'cash',
  _account_id uuid DEFAULT NULL, _sale_date date DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE o record; v_items jsonb; v_sale uuid;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.status = 'cancelled' THEN RAISE EXCEPTION 'This order was cancelled'; END IF;
  IF o.sale_id IS NOT NULL THEN RAISE EXCEPTION 'This order is already converted'; END IF;

  SELECT jsonb_agg(jsonb_build_object('product_id', oi.product_id, 'quantity', oi.quantity, 'unit_price', oi.unit_price))
    INTO v_items FROM public.order_items oi WHERE oi.order_id = _order_id;
  IF v_items IS NULL THEN RAISE EXCEPTION 'This order has no items'; END IF;

  v_sale := public.create_sale(
    COALESCE(_sale_date, CURRENT_DATE), o.customer_id, v_items, o.discount,
    COALESCE(_paid_amount,0), _payment_method, _account_id,
    COALESCE(o.note, 'From order ' || o.order_no));

  UPDATE public.orders SET status = 'converted', sale_id = v_sale WHERE id = _order_id;
  UPDATE public.deliveries SET sale_id = v_sale WHERE order_id = _order_id AND sale_id IS NULL;
  RETURN v_sale;
END; $$;

CREATE OR REPLACE FUNCTION public.create_delivery(
  _order_id uuid DEFAULT NULL, _sale_id uuid DEFAULT NULL, _driver_id uuid DEFAULT NULL,
  _zone_id uuid DEFAULT NULL, _cargo_company_id uuid DEFAULT NULL,
  _fee numeric DEFAULT 0, _cod_amount numeric DEFAULT 0,
  _recipient_name text DEFAULT NULL, _recipient_phone text DEFAULT NULL,
  _address text DEFAULT NULL, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF _order_id IS NULL AND _sale_id IS NULL THEN RAISE EXCEPTION 'A delivery needs an order or a sale'; END IF;
  IF COALESCE(_fee,0) < 0 OR COALESCE(_cod_amount,0) < 0 THEN RAISE EXCEPTION 'Fee and COD cannot be negative'; END IF;
  IF _order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id) THEN
    RAISE EXCEPTION 'Order not found'; END IF;
  IF _sale_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.sales WHERE id = _sale_id) THEN
    RAISE EXCEPTION 'Sale not found'; END IF;

  INSERT INTO public.deliveries (order_id, sale_id, driver_id, zone_id, cargo_company_id, status,
                                 fee, cod_amount, recipient_name, recipient_phone, address, note,
                                 dispatch_date, created_by)
  VALUES (_order_id, _sale_id, _driver_id, _zone_id, _cargo_company_id,
          CASE WHEN _driver_id IS NULL THEN 'pending'::public.delivery_status ELSE 'assigned'::public.delivery_status END,
          COALESCE(_fee,0), COALESCE(_cod_amount,0), _recipient_name, _recipient_phone, _address, _note,
          CURRENT_DATE, auth.uid())
  RETURNING id INTO v_id;

  IF _order_id IS NOT NULL THEN
    UPDATE public.orders SET status = 'out_for_delivery'
     WHERE id = _order_id AND status IN ('pending','confirmed','ready');
  END IF;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.update_delivery_status(
  _delivery_id uuid, _status public.delivery_status, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE d record;
BEGIN
  SELECT * INTO d FROM public.deliveries WHERE id = _delivery_id;
  IF d.id IS NULL THEN RAISE EXCEPTION 'Delivery not found'; END IF;
  IF d.status IN ('delivered','failed','returned') THEN RAISE EXCEPTION 'This delivery is already closed'; END IF;
  IF _status IN ('assigned','picked_up','in_transit') AND d.driver_id IS NULL AND d.cargo_company_id IS NULL THEN
    RAISE EXCEPTION 'Assign a driver or cargo company first';
  END IF;

  UPDATE public.deliveries SET
    status = _status,
    delivered_at = CASE WHEN _status = 'delivered' THEN now() ELSE delivered_at END,
    cod_collected = CASE WHEN _status = 'delivered' AND cod_amount > 0 THEN true ELSE cod_collected END,
    note = COALESCE(_note, note)
  WHERE id = _delivery_id;

  IF d.order_id IS NOT NULL THEN
    UPDATE public.orders SET status = CASE WHEN _status = 'delivered' THEN 'delivered'::public.order_status
                                           ELSE status END
     WHERE id = d.order_id AND status NOT IN ('converted','cancelled');
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.record_driver_handover(
  _driver_id uuid, _amount numeric, _account_id uuid,
  _method public.payment_method DEFAULT 'cash', _handover_date date DEFAULT NULL,
  _reference text DEFAULT NULL, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_id uuid; v_out numeric(14,2); v_date date;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Handover amount must be above zero'; END IF;
  IF _account_id IS NULL THEN RAISE EXCEPTION 'Choose the account receiving the cash'; END IF;
  v_date := COALESCE(_handover_date, CURRENT_DATE);

  SELECT outstanding INTO v_out FROM public.driver_balances WHERE driver_id = _driver_id;
  IF v_out IS NULL THEN RAISE EXCEPTION 'Driver not found'; END IF;
  IF _amount > v_out THEN RAISE EXCEPTION 'Handover exceeds the driver''s outstanding cash (%)', v_out; END IF;

  INSERT INTO public.driver_handovers (driver_id, handover_date, amount, method, account_id, reference, note, created_by)
  VALUES (_driver_id, v_date, _amount, _method, _account_id, _reference, _note, auth.uid())
  RETURNING id INTO v_id;

  RETURN v_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.create_order(date,uuid,jsonb,numeric,public.fulfillment_type,numeric,uuid,uuid,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_order(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.convert_order_to_sale(uuid,numeric,public.payment_method,uuid,date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_delivery(uuid,uuid,uuid,uuid,uuid,numeric,numeric,text,text,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_delivery_status(uuid,public.delivery_status,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_driver_handover(uuid,numeric,uuid,public.payment_method,date,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_order_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_delivery_number() FROM PUBLIC, anon;

-- seed default zones
INSERT INTO public.delivery_zones (name, district, default_fee, sort_order) VALUES
  ('Hodan','Hodan',2,1),('Wadajir','Wadajir',3,2),('Kaaraan','Kaaraan',3,3),('Hamar Weyne','Hamar Weyne',2,4);