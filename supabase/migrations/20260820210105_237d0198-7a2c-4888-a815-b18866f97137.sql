UPDATE public.financial_transactions SET status='active', voided_at=NULL, voided_by=NULL WHERE txn_date='2026-08-16' AND type='expense' AND amount=35.00;
DELETE FROM public.financial_transactions WHERE txn_date='2026-08-20' AND type='income' AND amount=7.00 AND status='void';
SELECT public.rebuild_financial_chain('2026-08-16'::date);