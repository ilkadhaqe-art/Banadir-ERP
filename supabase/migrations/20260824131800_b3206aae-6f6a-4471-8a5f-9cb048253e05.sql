DO $mig$
DECLARE v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='factory_reset';
  v_def := replace(v_def, 'public.sale_no_seq', 'public.sale_number_seq');
  v_def := replace(v_def, 'public.purchase_no_seq', 'public.purchase_number_seq');
  v_def := replace(v_def, 'public.order_no_seq', 'public.order_number_seq');
  v_def := replace(v_def, 'public.delivery_no_seq', 'public.delivery_number_seq');
  EXECUTE v_def;
END $mig$;