-- ---------- shared posting routine ----------
CREATE OR REPLACE FUNCTION public.apply_sale(
  _sale_id uuid, _sale_date date, _sale_time timestamptz, _customer_id uuid, _items jsonb,
  _discount numeric, _vat_rate numeric, _paid_amount numeric, _advance_amount numeric,
  _payment_method public.payment_method, _account_id uuid, _fulfillment public.fulfillment_type,
  _delivery_fee numeric, _cargo_fee numeric, _recipient_name text, _recipient_phone text,
  _address text, _location_id uuid, _region_id uuid, _delivery_company_id uuid,
  _driver_id uuid, _cargo_company_id uuid, _note text)
RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  it jsonb; v_subtotal numeric(14,2) := 0; v_total numeric(14,2); v_cogs numeric(14,2) := 0;
  v_vat numeric(14,2); v_rate numeric(6,4); v_status public.sale_payment_status;
  v_product record; v_qty numeric(14,2); v_price numeric(14,2); v_stock numeric(14,2);
  v_customer record; v_outstanding numeric(14,2);
  v_fee numeric(14,2); v_fee_paid numeric(14,2); v_goods_paid numeric(14,2);
  v_date date; v_no text;
BEGIN
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'A sale needs at least one line item';
  END IF;
  IF COALESCE(_discount,0) < 0 OR COALESCE(_paid_amount,0) < 0 OR COALESCE(_advance_amount,0) < 0 THEN
    RAISE EXCEPTION 'Amounts cannot be negative';
  END IF;
  IF COALESCE(_delivery_fee,0) < 0 OR COALESCE(_cargo_fee,0) < 0 THEN
    RAISE EXCEPTION 'Fees cannot be negative';
  END IF;
  v_date := COALESCE(_sale_date, CURRENT_DATE);

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (it->>'quantity')::numeric; v_price := (it->>'unit_price')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'Every line needs a quantity above zero'; END IF;
    IF v_price IS NULL OR v_price < 0 THEN RAISE EXCEPTION 'Every line needs a valid price'; END IF;
    SELECT id, name, cost_price, active INTO v_product FROM public.products WHERE id = (it->>'product_id')::uuid;
    IF v_product.id IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
    IF NOT v_product.active THEN RAISE EXCEPTION 'Product % is inactive', v_product.name; END IF;
    SELECT stock_on_hand INTO v_stock FROM public.product_stock WHERE product_id = v_product.id;
    IF COALESCE(v_stock,0) < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for % (on hand %)', v_product.name, COALESCE(v_stock,0);
    END IF;
    v_subtotal := v_subtotal + (v_qty * v_price);
    v_cogs := v_cogs + (v_qty * v_product.cost_price);
  END LOOP;

  IF COALESCE(_discount,0) > v_subtotal THEN RAISE EXCEPTION 'Discount cannot exceed the subtotal'; END IF;

  v_rate := COALESCE(_vat_rate, 0);
  IF _payment_method = 'merchant' AND COALESCE(_vat_rate,0) = 0 THEN
    v_rate := COALESCE((SELECT value::numeric FROM public.app_settings WHERE key = 'merchant_vat_rate'), 0);
  END IF;
  v_vat := ROUND((v_subtotal - COALESCE(_discount,0)) * v_rate, 2);
  v_total := v_subtotal - COALESCE(_discount,0) + v_vat;

  v_fee := COALESCE(_delivery_fee,0) + COALESCE(_cargo_fee,0);
  IF _fulfillment = 'pickup' AND v_fee > 0 THEN RAISE EXCEPTION 'Pickup sales cannot carry a delivery or cargo fee'; END IF;

  -- Hormaris: the advance settles the delivery/cargo charge first, the excess pays the goods.
  v_fee_paid := LEAST(COALESCE(_advance_amount,0), v_fee);
  v_goods_paid := (COALESCE(_advance_amount,0) - v_fee_paid) + COALESCE(_paid_amount,0);
  IF v_goods_paid > v_total THEN RAISE EXCEPTION 'Payments cannot exceed the sale total'; END IF;

  IF v_goods_paid < v_total OR (v_fee - v_fee_paid) > 0 THEN
    IF _customer_id IS NULL THEN RAISE EXCEPTION 'Sales with an outstanding balance need a customer'; END IF;
    SELECT * INTO v_customer FROM public.customers WHERE id = _customer_id;
    IF v_customer.id IS NULL THEN RAISE EXCEPTION 'Customer not found'; END IF;
    IF NOT v_customer.active THEN RAISE EXCEPTION 'Customer % is inactive', v_customer.name; END IF;
    IF v_customer.credit_limit > 0 AND v_goods_paid < v_total THEN
      SELECT COALESCE(balance,0) INTO v_outstanding FROM public.customer_balances WHERE customer_id = _customer_id;
      IF COALESCE(v_outstanding,0) + (v_total - v_goods_paid) > v_customer.credit_limit THEN
        RAISE EXCEPTION 'Credit limit exceeded for % (limit %, outstanding %)',
          v_customer.name, v_customer.credit_limit, COALESCE(v_outstanding,0);
      END IF;
    END IF;
  END IF;

  IF (v_goods_paid + v_fee_paid) > 0 AND _account_id IS NULL THEN
    RAISE EXCEPTION 'Choose the account that received the payment';
  END IF;
  IF _fulfillment = 'cargo' AND _cargo_company_id IS NULL THEN RAISE EXCEPTION 'Choose a cargo company'; END IF;

  v_status := CASE
    WHEN v_goods_paid = 0 AND v_total > 0 THEN 'full_debt'
    WHEN v_goods_paid < v_total THEN 'partial'
    ELSE 'full_paid' END;

  UPDATE public.sales SET
    customer_id = _customer_id, sale_date = v_date, sale_time = COALESCE(_sale_time, now()),
    subtotal = v_subtotal, discount = COALESCE(_discount,0), vat_rate = v_rate, vat_amount = v_vat,
    total = v_total, paid_amount = v_goods_paid, advance_amount = COALESCE(_advance_amount,0),
    payment_method = _payment_method, payment_status = v_status, account_id = _account_id,
    fulfillment = _fulfillment, delivery_fee = COALESCE(_delivery_fee,0), cargo_fee = COALESCE(_cargo_fee,0),
    fee_paid = v_fee_paid, recipient_name = _recipient_name, recipient_phone = _recipient_phone,
    address = _address, location_id = _location_id, region_id = _region_id,
    delivery_company_id = _delivery_company_id, driver_id = _driver_id, cargo_company_id = _cargo_company_id,
    note = _note, updated_by = auth.uid(), updated_at = now()
  WHERE id = _sale_id;

  SELECT sale_no INTO v_no FROM public.sales WHERE id = _sale_id;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT id, cost_price INTO v_product FROM public.products WHERE id = (it->>'product_id')::uuid;
    v_qty := (it->>'quantity')::numeric; v_price := (it->>'unit_price')::numeric;
    INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, unit_cost)
    VALUES (_sale_id, v_product.id, v_qty, v_price, v_product.cost_price);
    INSERT INTO public.inventory_movements (product_id, movement_date, movement_type, quantity,
                                            unit_cost, reference, note, source_table, source_id, created_by)
    VALUES (v_product.id, v_date, 'sale', v_qty, v_product.cost_price, v_no, 'Sale line',
            'sales', _sale_id, auth.uid());
  END LOOP;

  INSERT INTO public.financial_transactions (txn_date, type, scope, category, description, amount,
                                             cogs, amount_paid, account_id, source_table, source_id, created_by)
  VALUES (v_date, 'sale', 'business', 'sales', 'Sale ' || v_no, v_total, v_cogs, v_goods_paid,
          _account_id, 'sales', _sale_id, auth.uid());

  IF v_fee_paid > 0 THEN
    INSERT INTO public.financial_transactions (txn_date, type, scope, category, description, amount,
                                               amount_paid, account_id, source_table, source_id, created_by)
    VALUES (v_date, 'income', 'business',
            CASE WHEN _fulfillment = 'cargo' THEN 'cargo_fee' ELSE 'delivery_fee' END,
            'Fulfilment fee collected on ' || v_no, v_fee_paid, v_fee_paid, _account_id,
            'sales', _sale_id, auth.uid());
  END IF;
END; $$;

-- ---------- create_sale (extended, old positional callers still work) ----------
DROP FUNCTION IF EXISTS public.create_sale(date, uuid, jsonb, numeric, numeric, public.payment_method, uuid, text);
CREATE OR REPLACE FUNCTION public.create_sale(
  _sale_date date, _customer_id uuid, _items jsonb, _discount numeric DEFAULT 0,
  _paid_amount numeric DEFAULT 0, _payment_method public.payment_method DEFAULT 'cash',
  _account_id uuid DEFAULT NULL, _note text DEFAULT NULL,
  _vat_rate numeric DEFAULT 0, _advance_amount numeric DEFAULT 0,
  _fulfillment public.fulfillment_type DEFAULT 'pickup',
  _delivery_fee numeric DEFAULT 0, _cargo_fee numeric DEFAULT 0,
  _recipient_name text DEFAULT NULL, _recipient_phone text DEFAULT NULL, _address text DEFAULT NULL,
  _location_id uuid DEFAULT NULL, _region_id uuid DEFAULT NULL, _delivery_company_id uuid DEFAULT NULL,
  _driver_id uuid DEFAULT NULL, _cargo_company_id uuid DEFAULT NULL,
  _sale_time timestamptz DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_id uuid; s record; v_zone uuid;
BEGIN
  INSERT INTO public.sales (sale_date, subtotal, discount, total, paid_amount, payment_method,
                            payment_status, status, created_by)
  VALUES (COALESCE(_sale_date, CURRENT_DATE), 0, 0, 0, 0, _payment_method, 'full_debt', 'active', auth.uid())
  RETURNING id INTO v_id;

  PERFORM public.apply_sale(v_id, _sale_date, _sale_time, _customer_id, _items, _discount, _vat_rate,
    _paid_amount, _advance_amount, _payment_method, _account_id, _fulfillment, _delivery_fee, _cargo_fee,
    _recipient_name, _recipient_phone, _address, _location_id, _region_id, _delivery_company_id,
    _driver_id, _cargo_company_id, _note);

  IF _fulfillment <> 'pickup' THEN
    SELECT * INTO s FROM public.sales WHERE id = v_id;
    SELECT id INTO v_zone FROM public.delivery_zones WHERE id = _location_id;
    INSERT INTO public.deliveries (sale_id, driver_id, zone_id, cargo_company_id, status, fee, cod_amount,
                                   recipient_name, recipient_phone, address, note, dispatch_date, created_by)
    VALUES (v_id, _driver_id, v_zone, _cargo_company_id,
            CASE WHEN _driver_id IS NULL AND _cargo_company_id IS NULL THEN 'pending'::public.delivery_status
                 ELSE 'assigned'::public.delivery_status END,
            COALESCE(_delivery_fee,0) + COALESCE(_cargo_fee,0),
            GREATEST(s.balance,0) + GREATEST(s.fee_balance,0),
            _recipient_name, _recipient_phone, _address, _note, COALESCE(_sale_date, CURRENT_DATE), auth.uid());
  END IF;
  RETURN v_id;
END; $$;

-- ---------- update_sale ----------
CREATE OR REPLACE FUNCTION public.update_sale(
  _sale_id uuid, _sale_date date, _customer_id uuid, _items jsonb, _discount numeric DEFAULT 0,
  _paid_amount numeric DEFAULT 0, _payment_method public.payment_method DEFAULT 'cash',
  _account_id uuid DEFAULT NULL, _note text DEFAULT NULL,
  _vat_rate numeric DEFAULT 0, _advance_amount numeric DEFAULT 0,
  _fulfillment public.fulfillment_type DEFAULT 'pickup',
  _delivery_fee numeric DEFAULT 0, _cargo_fee numeric DEFAULT 0,
  _recipient_name text DEFAULT NULL, _recipient_phone text DEFAULT NULL, _address text DEFAULT NULL,
  _location_id uuid DEFAULT NULL, _region_id uuid DEFAULT NULL, _delivery_company_id uuid DEFAULT NULL,
  _driver_id uuid DEFAULT NULL, _cargo_company_id uuid DEFAULT NULL,
  _sale_time timestamptz DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE old record; s record; v_zone uuid;
BEGIN
  SELECT * INTO old FROM public.sales WHERE id = _sale_id FOR UPDATE;
  IF old.id IS NULL THEN RAISE EXCEPTION 'Sale not found'; END IF;
  IF old.status <> 'active' THEN RAISE EXCEPTION 'This sale is voided'; END IF;
  IF EXISTS (SELECT 1 FROM public.sales_returns WHERE sale_id = _sale_id AND status = 'active') THEN
    RAISE EXCEPTION 'Reverse the returns on this sale before editing it';
  END IF;
  IF EXISTS (SELECT 1 FROM public.customer_payments WHERE sale_id = _sale_id AND status = 'active') THEN
    RAISE EXCEPTION 'This sale has collections recorded against it; reverse them before editing';
  END IF;

  DELETE FROM public.financial_transactions WHERE source_table = 'sales' AND source_id = _sale_id;
  DELETE FROM public.inventory_movements WHERE source_table = 'sales' AND source_id = _sale_id;
  DELETE FROM public.sale_items WHERE sale_id = _sale_id;

  PERFORM public.apply_sale(_sale_id, _sale_date, _sale_time, _customer_id, _items, _discount, _vat_rate,
    _paid_amount, _advance_amount, _payment_method, _account_id, _fulfillment, _delivery_fee, _cargo_fee,
    _recipient_name, _recipient_phone, _address, _location_id, _region_id, _delivery_company_id,
    _driver_id, _cargo_company_id, _note);

  SELECT * INTO s FROM public.sales WHERE id = _sale_id;
  SELECT id INTO v_zone FROM public.delivery_zones WHERE id = _location_id;
  IF _fulfillment = 'pickup' THEN
    UPDATE public.deliveries SET status = 'returned'
     WHERE sale_id = _sale_id AND status NOT IN ('delivered','failed','returned');
  ELSIF EXISTS (SELECT 1 FROM public.deliveries WHERE sale_id = _sale_id) THEN
    UPDATE public.deliveries SET driver_id = _driver_id, zone_id = v_zone, cargo_company_id = _cargo_company_id,
      fee = COALESCE(_delivery_fee,0) + COALESCE(_cargo_fee,0),
      cod_amount = GREATEST(s.balance,0) + GREATEST(s.fee_balance,0),
      recipient_name = _recipient_name, recipient_phone = _recipient_phone, address = _address
     WHERE sale_id = _sale_id AND status NOT IN ('delivered','failed','returned');
  ELSE
    INSERT INTO public.deliveries (sale_id, driver_id, zone_id, cargo_company_id, status, fee, cod_amount,
                                   recipient_name, recipient_phone, address, note, dispatch_date, created_by)
    VALUES (_sale_id, _driver_id, v_zone, _cargo_company_id,
            CASE WHEN _driver_id IS NULL AND _cargo_company_id IS NULL THEN 'pending'::public.delivery_status
                 ELSE 'assigned'::public.delivery_status END,
            COALESCE(_delivery_fee,0) + COALESCE(_cargo_fee,0),
            GREATEST(s.balance,0) + GREATEST(s.fee_balance,0),
            _recipient_name, _recipient_phone, _address, _note, COALESCE(_sale_date, CURRENT_DATE), auth.uid());
  END IF;

  PERFORM public.rebuild_financial_chain(LEAST(old.sale_date, COALESCE(_sale_date, CURRENT_DATE)));
  RETURN _sale_id;
END; $$;

-- ---------- reverse_sale ----------
CREATE OR REPLACE FUNCTION public.reverse_sale(_sale_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE old record;
BEGIN
  SELECT * INTO old FROM public.sales WHERE id = _sale_id FOR UPDATE;
  IF old.id IS NULL THEN RAISE EXCEPTION 'Sale not found'; END IF;
  IF old.status <> 'active' THEN RAISE EXCEPTION 'This sale is already voided'; END IF;
  IF EXISTS (SELECT 1 FROM public.sales_returns WHERE sale_id = _sale_id AND status = 'active') THEN
    RAISE EXCEPTION 'Reverse the returns on this sale first';
  END IF;

  DELETE FROM public.financial_transactions WHERE source_table = 'sales' AND source_id = _sale_id;
  DELETE FROM public.inventory_movements WHERE source_table = 'sales' AND source_id = _sale_id;
  UPDATE public.sales SET status = 'void', paid_amount = 0, fee_paid = 0,
         payment_status = 'full_debt', updated_by = auth.uid(), updated_at = now()
   WHERE id = _sale_id;
  UPDATE public.deliveries SET status = 'returned'
   WHERE sale_id = _sale_id AND status NOT IN ('delivered','failed','returned');

  INSERT INTO public.financial_audit_log (actor, action, entity_table, entity_id, affected_date, reason, old_value)
  VALUES (auth.uid(), 'REVERSE', 'sales', _sale_id, old.sale_date, _reason, to_jsonb(old));

  PERFORM public.rebuild_financial_chain(old.sale_date);
END; $$;

-- ---------- fulfilment tracking + collection ----------
CREATE OR REPLACE FUNCTION public.record_fulfillment_event(
  _sale_id uuid, _status text, _driver_id uuid DEFAULT NULL, _amount_collected numeric DEFAULT 0,
  _account_id uuid DEFAULT NULL, _method public.payment_method DEFAULT 'cash',
  _note text DEFAULT NULL, _occurred_at timestamptz DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE s record; d record; v_id uuid; v_left numeric(14,2); v_fee_part numeric(14,2); v_when timestamptz;
BEGIN
  SELECT * INTO s FROM public.sales WHERE id = _sale_id FOR UPDATE;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Sale not found'; END IF;
  IF s.status <> 'active' THEN RAISE EXCEPTION 'This sale is voided'; END IF;
  IF COALESCE(_amount_collected,0) < 0 THEN RAISE EXCEPTION 'Collected amount cannot be negative'; END IF;
  v_when := COALESCE(_occurred_at, now());

  SELECT * INTO d FROM public.deliveries WHERE sale_id = _sale_id ORDER BY created_at DESC LIMIT 1;

  v_left := COALESCE(_amount_collected,0);
  IF v_left > (GREATEST(COALESCE(s.fee_balance,0),0) + GREATEST(COALESCE(s.balance,0),0)) THEN
    RAISE EXCEPTION 'Collected amount exceeds what is still owed on this sale';
  END IF;
  IF v_left > 0 AND _account_id IS NULL THEN RAISE EXCEPTION 'Choose the account that received the money'; END IF;

  -- the delivery/cargo charge is settled first, the rest reduces the customer balance
  v_fee_part := LEAST(v_left, GREATEST(COALESCE(s.fee_balance,0),0));
  IF v_fee_part > 0 THEN
    UPDATE public.sales SET fee_paid = fee_paid + v_fee_part, updated_by = auth.uid(), updated_at = now()
     WHERE id = _sale_id;
    INSERT INTO public.financial_transactions (txn_date, type, scope, category, description, amount,
                                               amount_paid, account_id, source_table, source_id, created_by)
    VALUES (v_when::date, 'income', 'business',
            CASE WHEN s.fulfillment = 'cargo' THEN 'cargo_fee' ELSE 'delivery_fee' END,
            'Fulfilment fee collected on ' || s.sale_no, v_fee_part, v_fee_part, _account_id,
            'sales', _sale_id, auth.uid());
    v_left := v_left - v_fee_part;
  END IF;

  IF v_left > 0 THEN
    IF s.customer_id IS NULL THEN RAISE EXCEPTION 'Only credit sales with a customer can be collected'; END IF;
    PERFORM public.record_collection(s.customer_id, v_left, v_when::date, _method, _account_id, _sale_id,
                                     NULL, COALESCE(_note, 'Collected on delivery'));
  END IF;

  INSERT INTO public.fulfillment_events (sale_id, delivery_id, kind, status, driver_id, amount_collected,
                                         note, occurred_at, created_by)
  VALUES (_sale_id, d.id, s.fulfillment, _status, COALESCE(_driver_id, d.driver_id),
          COALESCE(_amount_collected,0), _note, v_when, auth.uid())
  RETURNING id INTO v_id;

  IF d.id IS NOT NULL THEN
    UPDATE public.deliveries SET
      status = CASE
        WHEN _status IN ('assigned','picked_up','in_transit','delivered','failed','returned','pending')
          THEN _status::public.delivery_status
        WHEN _status IN ('arrived','customer_received','collected') THEN 'delivered'::public.delivery_status
        WHEN _status IN ('handed_to_cargo','sent') THEN 'in_transit'::public.delivery_status
        ELSE status END,
      driver_id = COALESCE(_driver_id, driver_id),
      delivered_at = CASE WHEN _status IN ('delivered','customer_received','collected')
                          THEN v_when ELSE delivered_at END,
      cod_collected = CASE WHEN (SELECT GREATEST(balance,0) + GREATEST(fee_balance,0)
                                   FROM public.sales WHERE id = _sale_id) <= 0
                           THEN true ELSE cod_collected END,
      cod_amount = (SELECT GREATEST(balance,0) + GREATEST(fee_balance,0) FROM public.sales WHERE id = _sale_id)
     WHERE id = d.id;
  END IF;

  RETURN v_id;
END; $$;

-- ---------- rate lookup ----------
CREATE OR REPLACE FUNCTION public.lookup_delivery_rate(
  _location_id uuid, _company_id uuid DEFAULT NULL, _driver_id uuid DEFAULT NULL, _on date DEFAULT NULL)
RETURNS numeric LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT r.rate FROM public.delivery_rates r
   WHERE r.active AND r.location_id = _location_id
     AND r.effective_from <= COALESCE(_on, CURRENT_DATE)
     AND (r.effective_to IS NULL OR r.effective_to >= COALESCE(_on, CURRENT_DATE))
     AND (( _company_id IS NOT NULL AND r.company_id = _company_id)
       OR ( _driver_id IS NOT NULL AND r.driver_id = _driver_id))
   ORDER BY r.effective_from DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.lookup_cargo_rate(
  _company_id uuid, _location_id uuid, _on date DEFAULT NULL)
RETURNS numeric LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT r.rate FROM public.cargo_rates r
   WHERE r.active AND r.company_id = _company_id AND r.location_id = _location_id
     AND r.effective_from <= COALESCE(_on, CURRENT_DATE)
     AND (r.effective_to IS NULL OR r.effective_to >= COALESCE(_on, CURRENT_DATE))
   ORDER BY r.effective_from DESC LIMIT 1;
$$;

-- ---------- smart defaults from real history ----------
CREATE OR REPLACE FUNCTION public.sales_smart_defaults()
RETURNS jsonb LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'product_id', (SELECT si.product_id FROM public.sale_items si JOIN public.sales s ON s.id = si.sale_id
                    WHERE s.status = 'active' GROUP BY si.product_id ORDER BY count(*) DESC LIMIT 1),
    'payment_method', (SELECT s.payment_method FROM public.sales s WHERE s.status = 'active'
                        GROUP BY s.payment_method ORDER BY count(*) DESC LIMIT 1),
    'delivery_company_id', (SELECT s.delivery_company_id FROM public.sales s
                             WHERE s.delivery_company_id IS NOT NULL
                             GROUP BY s.delivery_company_id ORDER BY count(*) DESC LIMIT 1),
    'driver_id', (SELECT s.driver_id FROM public.sales s WHERE s.driver_id IS NOT NULL
                   GROUP BY s.driver_id ORDER BY count(*) DESC LIMIT 1),
    'location_id', (SELECT s.location_id FROM public.sales s WHERE s.location_id IS NOT NULL
                     GROUP BY s.location_id ORDER BY count(*) DESC LIMIT 1),
    'cargo_company_id', (SELECT s.cargo_company_id FROM public.sales s WHERE s.cargo_company_id IS NOT NULL
                          GROUP BY s.cargo_company_id ORDER BY count(*) DESC LIMIT 1),
    'region_id', (SELECT s.region_id FROM public.sales s WHERE s.region_id IS NOT NULL
                   GROUP BY s.region_id ORDER BY count(*) DESC LIMIT 1),
    'merchant_vat_rate', COALESCE((SELECT value::numeric FROM public.app_settings WHERE key='merchant_vat_rate'),0)
  );
$$;

-- ---------- complete sale statement ----------
CREATE OR REPLACE FUNCTION public.sale_statement(_sale_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'sale', to_jsonb(s) - 'created_by' - 'updated_by'
      || jsonb_build_object(
          'customer_name', c.name, 'customer_phone', c.phone,
          'account_name', pa.name, 'location_name', loc.name, 'region_name', reg.name,
          'delivery_company_name', dc.name, 'driver_name', dr.name, 'driver_phone', dr.phone,
          'cargo_company_name', cc.name,
          'created_by_name', cp.full_name, 'updated_by_name', up.full_name),
    'items', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'product_id', si.product_id, 'name', p.name, 'sku', p.sku, 'barcode', p.barcode,
        'image_url', p.image_url, 'unit', p.unit, 'quantity', si.quantity,
        'unit_price', si.unit_price, 'unit_cost', si.unit_cost, 'line_total', si.line_total)
        ORDER BY p.name) FROM public.sale_items si JOIN public.products p ON p.id = si.product_id
        WHERE si.sale_id = s.id), '[]'::jsonb),
    'collections', COALESCE((SELECT jsonb_agg(to_jsonb(cpm) ORDER BY cpm.payment_date)
        FROM public.customer_payments cpm WHERE cpm.sale_id = s.id AND cpm.status = 'active'), '[]'::jsonb),
    'returns', COALESCE((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.return_date)
        FROM public.sales_returns r WHERE r.sale_id = s.id), '[]'::jsonb),
    'events', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'id', e.id, 'status', e.status, 'kind', e.kind, 'amount_collected', e.amount_collected,
        'note', e.note, 'occurred_at', e.occurred_at, 'driver_name', edr.name, 'actor', ep.full_name)
        ORDER BY e.occurred_at)
        FROM public.fulfillment_events e
        LEFT JOIN public.drivers edr ON edr.id = e.driver_id
        LEFT JOIN public.profiles ep ON ep.id = e.created_by
        WHERE e.sale_id = s.id), '[]'::jsonb),
    'delivery', (SELECT to_jsonb(d) FROM public.deliveries d WHERE d.sale_id = s.id
                  ORDER BY d.created_at DESC LIMIT 1),
    'audit', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'action', a.action, 'entity_table', a.entity_table, 'created_at', a.created_at,
        'actor', ap.full_name, 'reason', a.reason, 'old_value', a.old_value, 'new_value', a.new_value)
        ORDER BY a.created_at DESC)
        FROM public.financial_audit_log a LEFT JOIN public.profiles ap ON ap.id = a.actor
        WHERE a.entity_id = s.id), '[]'::jsonb)
  )
  FROM public.sales s
  LEFT JOIN public.customers c ON c.id = s.customer_id
  LEFT JOIN public.payment_accounts pa ON pa.id = s.account_id
  LEFT JOIN public.locations loc ON loc.id = s.location_id
  LEFT JOIN public.locations reg ON reg.id = s.region_id
  LEFT JOIN public.delivery_companies dc ON dc.id = s.delivery_company_id
  LEFT JOIN public.drivers dr ON dr.id = s.driver_id
  LEFT JOIN public.cargo_companies cc ON cc.id = s.cargo_company_id
  LEFT JOIN public.profiles cp ON cp.id = s.created_by
  LEFT JOIN public.profiles up ON up.id = s.updated_by
  WHERE s.id = _sale_id;
$$;

-- ---------- sales_overview with the new fields ----------
DROP VIEW IF EXISTS public.sales_overview;
CREATE VIEW public.sales_overview
WITH (security_invoker = true) AS
SELECT s.id, s.sale_no, s.sale_date, s.sale_time, s.customer_id,
  c.name AS customer_name, c.phone AS customer_phone,
  s.subtotal, s.discount, s.vat_rate, s.vat_amount, s.total, s.paid_amount, s.advance_amount,
  s.returned_total, s.balance, s.delivery_fee, s.cargo_fee, s.fee_paid, s.fee_balance,
  s.fulfillment, s.recipient_name, s.recipient_phone, s.address,
  s.location_id, loc.name AS location_name, s.region_id, reg.name AS region_name,
  s.delivery_company_id, dc.name AS delivery_company_name,
  s.driver_id, dr.name AS driver_name, dr.phone AS driver_phone,
  s.cargo_company_id, cc.name AS cargo_company_name,
  s.payment_method, s.payment_status, s.account_id, pa.name AS account_name,
  s.status, s.note, s.created_at,
  d.status AS delivery_status, d.id AS delivery_id, d.delivery_no, d.delivered_at,
  COALESCE(i.item_count, 0::bigint) AS item_count,
  COALESCE(i.quantity_total, 0::numeric) AS quantity_total,
  COALESCE(i.cogs_total, 0::numeric) AS cogs_total,
  s.total - COALESCE(i.cogs_total, 0::numeric) AS gross_profit
FROM public.sales s
LEFT JOIN public.customers c ON c.id = s.customer_id
LEFT JOIN public.payment_accounts pa ON pa.id = s.account_id
LEFT JOIN public.locations loc ON loc.id = s.location_id
LEFT JOIN public.locations reg ON reg.id = s.region_id
LEFT JOIN public.delivery_companies dc ON dc.id = s.delivery_company_id
LEFT JOIN public.drivers dr ON dr.id = s.driver_id
LEFT JOIN public.cargo_companies cc ON cc.id = s.cargo_company_id
LEFT JOIN LATERAL (SELECT * FROM public.deliveries dd WHERE dd.sale_id = s.id
                    ORDER BY dd.created_at DESC LIMIT 1) d ON true
LEFT JOIN (SELECT sale_items.sale_id, count(*) AS item_count,
                  sum(sale_items.quantity) AS quantity_total,
                  sum(sale_items.quantity * sale_items.unit_cost) AS cogs_total
             FROM public.sale_items GROUP BY sale_items.sale_id) i ON i.sale_id = s.id;
GRANT SELECT ON public.sales_overview TO authenticated;
GRANT ALL ON public.sales_overview TO service_role;
