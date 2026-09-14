DO $mig$
DECLARE v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='apply_sale';
  v_def := regexp_replace(v_def, 'v_fee_paid, v_fee_paid, _account_id,\s*''sales''', 'v_fee_paid, v_fee_paid, _account_id, ''sales_fee''');
  IF position('sales_fee' in v_def) = 0 THEN RAISE EXCEPTION 'apply_sale patch did not apply'; END IF;
  EXECUTE v_def;

  SELECT pg_get_functiondef(p.oid) INTO v_def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='update_sale';
  v_def := replace(v_def, 'source_table = ''sales'' AND source_id = _sale_id', 'source_table IN (''sales'',''sales_fee'') AND source_id = _sale_id');
  EXECUTE v_def;

  SELECT pg_get_functiondef(p.oid) INTO v_def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='reverse_sale';
  v_def := replace(v_def, 'source_table = ''sales'' AND source_id = _sale_id', 'source_table IN (''sales'',''sales_fee'') AND source_id = _sale_id');
  EXECUTE v_def;
END $mig$;

CREATE OR REPLACE FUNCTION public.customer_statement(_customer_id uuid)
 RETURNS TABLE(entry_date date, kind text, reference text, description text, debit numeric, credit numeric, running_balance numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH entries AS (
    SELECT s.sale_date AS entry_date, 'sale'::text AS kind, s.sale_no AS reference,
           COALESCE(s.note, 'Sale') AS description, s.total AS debit, 0::numeric AS credit,
           s.created_at AS ordering
    FROM public.sales s
    WHERE s.customer_id = _customer_id AND s.status = 'active'
    UNION ALL
    SELECT s.sale_date, 'sale_payment', s.sale_no, 'Paid at sale', 0::numeric, s.paid_amount, s.created_at
    FROM public.sales s
    WHERE s.customer_id = _customer_id AND s.status = 'active' AND s.paid_amount > 0
    UNION ALL
    SELECT r.return_date, 'return', s.sale_no, COALESCE(r.note, 'Sales return'), 0::numeric, r.total, r.created_at
    FROM public.sales_returns r
    JOIN public.sales s ON s.id = r.sale_id
    WHERE r.customer_id = _customer_id AND r.status = 'active'
    UNION ALL
    SELECT p.payment_date, 'payment', COALESCE(p.reference, ''), COALESCE(p.note, 'Collection'), 0::numeric, p.amount, p.created_at
    FROM public.customer_payments p
    WHERE p.customer_id = _customer_id AND p.status = 'active'
  )
  SELECT entry_date, kind, reference, description, debit, credit,
         SUM(debit - credit) OVER (ORDER BY entry_date, ordering
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)::numeric(14,2)
  FROM entries
  ORDER BY entry_date, ordering;
$function$;