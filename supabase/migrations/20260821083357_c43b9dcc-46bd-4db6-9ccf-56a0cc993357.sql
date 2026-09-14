REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.rebuild_financial_chain(date) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_financial_periods(date, date) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.financial_start_date() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.financial_txn_rebuild() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.financial_rule_rebuild() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.financial_txn_audit() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE ALL ON FUNCTION public.product_price_history_log() FROM PUBLIC, anon, authenticated;

UPDATE public.financial_transactions SET status='active', voided_at=NULL, voided_by=NULL WHERE txn_date='2026-08-16' AND type='expense' AND amount=35.00;
DELETE FROM public.financial_transactions WHERE txn_date='2026-08-20' AND type='income' AND amount=7.00 AND status='void';
SELECT public.rebuild_financial_chain('2026-08-16'::date);