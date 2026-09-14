CREATE OR REPLACE FUNCTION public.__restore_exec(sql text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN EXECUTE sql; END; $$;
REVOKE ALL ON FUNCTION public.__restore_exec(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.__restore_exec(text) TO service_role;