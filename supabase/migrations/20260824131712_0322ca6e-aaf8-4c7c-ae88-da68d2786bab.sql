DO $mig$
DECLARE v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='factory_reset';
  v_def := regexp_replace(v_def, 'DELETE FROM (public\.[a-z_]+);', 'DELETE FROM \1 WHERE true;', 'g');
  EXECUTE v_def;
END $mig$;