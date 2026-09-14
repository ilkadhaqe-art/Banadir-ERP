CREATE OR REPLACE FUNCTION public.update_delivery_status(_delivery_id uuid, _status delivery_status, _note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
    note = COALESCE(_note, note)
  WHERE id = _delivery_id;

  IF d.order_id IS NOT NULL THEN
    UPDATE public.orders SET status = CASE WHEN _status = 'delivered' THEN 'delivered'::public.order_status
                                           ELSE status END
     WHERE id = d.order_id AND status NOT IN ('converted','cancelled');
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.record_fulfillment_event(_sale_id uuid, _status text, _driver_id uuid DEFAULT NULL::uuid, _amount_collected numeric DEFAULT 0, _account_id uuid DEFAULT NULL::uuid, _method payment_method DEFAULT 'cash'::payment_method, _note text DEFAULT NULL::text, _occurred_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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

  INSERT INTO public.fulfillment_events (sale_id, delivery_id, kind, status, driver_id, amount_collected,
                                         note, occurred_at, created_by)
  VALUES (_sale_id, d.id, s.fulfillment, _status, COALESCE(_driver_id, d.driver_id),
          COALESCE(_amount_collected,0), _note, v_when, auth.uid())
  RETURNING id INTO v_id;

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
            'fulfillment_events', v_id, auth.uid());
    v_left := v_left - v_fee_part;
  END IF;

  IF v_left > 0 THEN
    IF s.customer_id IS NULL THEN RAISE EXCEPTION 'Only credit sales with a customer can be collected'; END IF;
    PERFORM public.record_collection(s.customer_id, v_left, v_when::date, _method, _account_id, _sale_id,
                                     NULL, COALESCE(_note, 'Collected on delivery'));
  END IF;

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
END; $function$;

DO $mig$
DECLARE v_def text; v_extra text;
BEGIN
  v_extra := 'DELETE FROM public.financial_transactions WHERE source_table = ''fulfillment_events'' AND source_id IN (SELECT id FROM public.fulfillment_events WHERE sale_id = _sale_id); DELETE FROM public.financial_transactions WHERE source_table IN (''sales'',''sales_fee'') AND source_id = _sale_id';
  SELECT pg_get_functiondef(p.oid) INTO v_def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='reverse_sale';
  v_def := replace(v_def, 'DELETE FROM public.financial_transactions WHERE source_table IN (''sales'',''sales_fee'') AND source_id = _sale_id', v_extra);
  EXECUTE v_def;

  SELECT pg_get_functiondef(p.oid) INTO v_def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='update_sale';
  v_def := replace(v_def, 'DELETE FROM public.financial_transactions WHERE source_table IN (''sales'',''sales_fee'') AND source_id = _sale_id', v_extra);
  EXECUTE v_def;
END $mig$;