DO $mig$
DECLARE r record; v_def text; v_type text;
BEGIN
  FOR r IN SELECT p.oid, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.proname IN ('record_collection','create_sale_return','record_supplier_payment','create_purchase_return')
  LOOP
    v_type := CASE WHEN r.proname IN ('record_collection','create_sale_return') THEN 'sale_payment_status' ELSE 'purchase_payment_status' END;
    v_def := pg_get_functiondef(r.oid);
    v_def := replace(v_def, 'ELSE ''full_debt'' END', 'ELSE ''full_debt'' END::public.' || v_type);
    v_def := replace(v_def, 'END::public.' || v_type || '::public.' || v_type, 'END::public.' || v_type);
    EXECUTE v_def;
  END LOOP;
END $mig$;