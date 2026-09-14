CREATE POLICY fal_insert_self ON public.financial_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (actor = auth.uid());
GRANT INSERT ON public.financial_audit_log TO authenticated;