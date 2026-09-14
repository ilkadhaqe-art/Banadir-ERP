REVOKE EXECUTE ON FUNCTION public.rebuild_financial_chain(date) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_financial_periods(date, date) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.financial_start_date() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.financial_txn_rebuild() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.financial_rule_rebuild() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.financial_txn_audit() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;