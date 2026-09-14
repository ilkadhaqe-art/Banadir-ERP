CREATE OR REPLACE FUNCTION public.factory_reset(_confirm text, _include_masters boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_actor, 'owner') THEN
    RAISE EXCEPTION 'Only the owner can run a factory reset';
  END IF;
  IF _confirm IS DISTINCT FROM 'RESET' THEN
    RAISE EXCEPTION 'Type RESET to confirm the factory reset';
  END IF;

  DELETE FROM public.fulfillment_events;
  DELETE FROM public.driver_handovers;
  DELETE FROM public.deliveries;
  DELETE FROM public.order_items;
  DELETE FROM public.orders;
  DELETE FROM public.sales_return_items;
  DELETE FROM public.sales_returns;
  DELETE FROM public.customer_payments;
  DELETE FROM public.sale_items;
  DELETE FROM public.purchase_return_items;
  DELETE FROM public.purchase_returns;
  DELETE FROM public.supplier_payments;
  DELETE FROM public.purchase_items;
  DELETE FROM public.inventory_movements;
  DELETE FROM public.account_transfers;
  DELETE FROM public.financial_transactions;
  DELETE FROM public.capital_records;
  DELETE FROM public.sales;
  DELETE FROM public.purchases;
  DELETE FROM public.daily_financial_states;
  DELETE FROM public.financial_periods;
  DELETE FROM public.product_price_history;
  DELETE FROM public.financial_audit_log;

  IF _include_masters THEN
    DELETE FROM public.cargo_rates;
    DELETE FROM public.delivery_rates;
    DELETE FROM public.products;
    DELETE FROM public.product_categories;
    DELETE FROM public.product_brands;
    DELETE FROM public.customers;
    DELETE FROM public.suppliers;
    DELETE FROM public.drivers;
    DELETE FROM public.delivery_companies;
    DELETE FROM public.cargo_companies;
    DELETE FROM public.delivery_zones;
    DELETE FROM public.locations;
  END IF;

  PERFORM setval('public.sale_no_seq', 1, false);
  PERFORM setval('public.purchase_no_seq', 1, false);
  PERFORM setval('public.order_no_seq', 1, false);
  PERFORM setval('public.delivery_no_seq', 1, false);

  INSERT INTO public.financial_audit_log (actor, action, entity_table, reason)
  VALUES (v_actor, 'FACTORY_RESET', 'public',
          CASE WHEN _include_masters THEN 'Operational data and master data cleared'
               ELSE 'Operational data cleared' END);

  RETURN jsonb_build_object('ok', true, 'include_masters', COALESCE(_include_masters,false));
END; $$;

REVOKE ALL ON FUNCTION public.factory_reset(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.factory_reset(text, boolean) TO authenticated;