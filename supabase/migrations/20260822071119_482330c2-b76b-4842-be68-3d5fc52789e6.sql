-- ===== PHASE 8: REPORTS, AUDIT, SETTINGS, ADMIN =====

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings managed by admins" ON public.app_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (key, value, description) VALUES
  ('business_name','My Business','Name shown on receipts and reports'),
  ('currency','USD','Currency code used across the app'),
  ('receipt_footer','Thank you for your business','Footer line printed on receipts'),
  ('low_stock_alerts','true','Show low stock alerts on the dashboard');

-- ---------- reporting views ----------
CREATE VIEW public.sales_daily_report
WITH (security_invoker = true) AS
SELECT s.sale_date AS day,
       count(*)::int AS sales_count,
       SUM(s.total)::numeric(14,2) AS sales_total,
       SUM(s.discount)::numeric(14,2) AS discount_total,
       SUM(s.paid_amount)::numeric(14,2) AS paid_total,
       SUM(s.total - s.returned_total - s.paid_amount)::numeric(14,2) AS debt_total,
       COALESCE(SUM(ci.cogs),0)::numeric(14,2) AS cogs_total,
       (SUM(s.total) - SUM(s.returned_total) - COALESCE(SUM(ci.cogs),0))::numeric(14,2) AS gross_profit
FROM public.sales s
LEFT JOIN LATERAL (
  SELECT SUM(si.quantity * si.unit_cost) AS cogs FROM public.sale_items si WHERE si.sale_id = s.id
) ci ON true
WHERE s.status = 'active'
GROUP BY s.sale_date;
GRANT SELECT ON public.sales_daily_report TO authenticated;

CREATE VIEW public.product_sales_report
WITH (security_invoker = true) AS
SELECT p.id AS product_id, p.name, p.sku, p.unit,
       COALESCE(SUM(si.quantity),0)::numeric(14,2) AS quantity_sold,
       COALESCE(SUM(si.quantity * si.unit_price),0)::numeric(14,2) AS revenue,
       COALESCE(SUM(si.quantity * si.unit_cost),0)::numeric(14,2) AS cost,
       COALESCE(SUM(si.quantity * (si.unit_price - si.unit_cost)),0)::numeric(14,2) AS profit,
       MAX(s.sale_date) AS last_sold_on
FROM public.products p
LEFT JOIN public.sale_items si ON si.product_id = p.id
LEFT JOIN public.sales s ON s.id = si.sale_id AND s.status = 'active'
GROUP BY p.id, p.name, p.sku, p.unit;
GRANT SELECT ON public.product_sales_report TO authenticated;

CREATE VIEW public.customer_sales_report
WITH (security_invoker = true) AS
SELECT c.id AS customer_id, c.name, c.phone, c.active,
       count(s.id)::int AS sales_count,
       COALESCE(SUM(s.total),0)::numeric(14,2) AS sales_total,
       COALESCE(SUM(s.paid_amount),0)::numeric(14,2) AS paid_total,
       COALESCE(SUM(s.total - s.returned_total - s.paid_amount),0)::numeric(14,2) AS outstanding,
       MAX(s.sale_date) AS last_sale_on
FROM public.customers c
LEFT JOIN public.sales s ON s.customer_id = c.id AND s.status = 'active'
GROUP BY c.id, c.name, c.phone, c.active;
GRANT SELECT ON public.customer_sales_report TO authenticated;

CREATE VIEW public.expense_report
WITH (security_invoker = true) AS
SELECT t.txn_date AS day, t.scope, COALESCE(t.category,'other') AS category,
       SUM(t.amount)::numeric(14,2) AS amount, count(*)::int AS entries
FROM public.financial_transactions t
WHERE t.status = 'active' AND t.type = 'expense'
GROUP BY t.txn_date, t.scope, COALESCE(t.category,'other');
GRANT SELECT ON public.expense_report TO authenticated;

CREATE VIEW public.income_report
WITH (security_invoker = true) AS
SELECT t.txn_date AS day, t.scope, COALESCE(t.category,'other') AS category,
       SUM(t.amount)::numeric(14,2) AS amount, count(*)::int AS entries
FROM public.financial_transactions t
WHERE t.status = 'active' AND t.type = 'income'
GROUP BY t.txn_date, t.scope, COALESCE(t.category,'other');
GRANT SELECT ON public.income_report TO authenticated;

CREATE VIEW public.inventory_valuation_report
WITH (security_invoker = true) AS
SELECT p.id AS product_id, p.name, p.sku, p.unit, p.reorder_level,
       COALESCE(ps.stock_on_hand,0)::numeric(14,2) AS stock_on_hand,
       p.cost_price, p.sell_price,
       (COALESCE(ps.stock_on_hand,0) * p.cost_price)::numeric(14,2) AS stock_value,
       (COALESCE(ps.stock_on_hand,0) * p.sell_price)::numeric(14,2) AS retail_value,
       (COALESCE(ps.stock_on_hand,0) <= p.reorder_level) AS low_stock
FROM public.products p
LEFT JOIN public.product_stock ps ON ps.product_id = p.id
WHERE p.active;
GRANT SELECT ON public.inventory_valuation_report TO authenticated;

CREATE VIEW public.account_balances_report
WITH (security_invoker = true) AS
SELECT a.id AS account_id, a.name, a.kind, a.scope, a.active,
       ab.balance::numeric(14,2) AS balance
FROM public.payment_accounts a
LEFT JOIN public.account_balances ab ON ab.account_id = a.id;
GRANT SELECT ON public.account_balances_report TO authenticated;

CREATE VIEW public.profit_loss_report
WITH (security_invoker = true) AS
SELECT d.day,
       d.sales_net, d.cogs, d.gross_profit,
       d.business_expenses, d.personal_expenses,
       d.other_income, d.guaranteed_income,
       d.business_net_profit AS net_profit,
       d.target, d.achievement, d.plus_amount, d.minus_amount,
       d.cash_balance, d.receivables
FROM public.daily_financial_states d;
GRANT SELECT ON public.profit_loss_report TO authenticated;

-- ---------- admin: user directory + role management ----------
CREATE VIEW public.app_users
WITH (security_invoker = true) AS
SELECT p.id AS user_id, p.full_name, p.avatar_url, p.created_at,
       COALESCE(r.roles, ARRAY[]::public.app_role[]) AS roles
FROM public.profiles p
LEFT JOIN LATERAL (
  SELECT array_agg(ur.role ORDER BY ur.role) AS roles
  FROM public.user_roles ur WHERE ur.user_id = p.id
) r ON true;
GRANT SELECT ON public.app_users TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _role public.app_role, _enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only owners and admins can change roles';
  END IF;
  IF _user_id = auth.uid() AND _role IN ('owner','admin') AND NOT _enabled THEN
    RAISE EXCEPTION 'You cannot remove your own admin access';
  END IF;

  IF _enabled THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    IF _role = 'owner' AND (SELECT count(*) FROM public.user_roles WHERE role = 'owner') <= 1 THEN
      RAISE EXCEPTION 'The last owner cannot be removed';
    END IF;
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role;
  END IF;

  INSERT INTO public.financial_audit_log (actor, action, entity_table, entity_id, new_value)
  VALUES (auth.uid(), CASE WHEN _enabled THEN 'ROLE_GRANT' ELSE 'ROLE_REVOKE' END,
          'user_roles', _user_id, jsonb_build_object('role', _role));
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role, boolean) FROM PUBLIC, anon;

-- ---------- audit trail view ----------
CREATE VIEW public.audit_log_view
WITH (security_invoker = true) AS
SELECT l.id, l.created_at, l.action, l.entity_table, l.entity_id, l.affected_date,
       l.actor, p.full_name AS actor_name, l.reason, l.old_value, l.new_value
FROM public.financial_audit_log l
LEFT JOIN public.profiles p ON p.id = l.actor;
GRANT SELECT ON public.audit_log_view TO authenticated;

-- ---------- generic audit trigger for key business tables ----------
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.financial_audit_log (actor, action, entity_table, entity_id, old_value, new_value)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME,
          COALESCE((to_jsonb(NEW)->>'id')::uuid, (to_jsonb(OLD)->>'id')::uuid),
          CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
          CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END);
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.audit_row_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER purchases_audit AFTER INSERT OR UPDATE OR DELETE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER supplier_payments_audit AFTER INSERT OR UPDATE OR DELETE ON public.supplier_payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER driver_handovers_audit AFTER INSERT OR UPDATE OR DELETE ON public.driver_handovers
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER app_settings_audit AFTER INSERT OR UPDATE OR DELETE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- ---------- dashboard rollup RPC ----------
CREATE OR REPLACE FUNCTION public.business_overview(_from date DEFAULT NULL, _to date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE f date; t date; res jsonb;
BEGIN
  t := COALESCE(_to, CURRENT_DATE);
  f := COALESCE(_from, t - 29);
  SELECT jsonb_build_object(
    'from', f, 'to', t,
    'sales', COALESCE((SELECT SUM(sales_total) FROM public.sales_daily_report WHERE day BETWEEN f AND t),0),
    'gross_profit', COALESCE((SELECT SUM(gross_profit) FROM public.sales_daily_report WHERE day BETWEEN f AND t),0),
    'expenses', COALESCE((SELECT SUM(amount) FROM public.expense_report WHERE day BETWEEN f AND t),0),
    'income', COALESCE((SELECT SUM(amount) FROM public.income_report WHERE day BETWEEN f AND t),0),
    'receivables', COALESCE((SELECT SUM(balance) FROM public.customer_balances),0),
    'payables', COALESCE((SELECT SUM(balance) FROM public.supplier_balances),0),
    'stock_value', COALESCE((SELECT SUM(stock_value) FROM public.inventory_valuation_report),0),
    'low_stock_count', COALESCE((SELECT count(*) FROM public.inventory_valuation_report WHERE low_stock),0),
    'cash_total', COALESCE((SELECT SUM(balance) FROM public.account_balances_report),0),
    'open_orders', COALESCE((SELECT count(*) FROM public.orders WHERE status IN ('pending','confirmed','ready','out_for_delivery')),0),
    'active_deliveries', COALESCE((SELECT count(*) FROM public.deliveries WHERE status IN ('pending','assigned','picked_up','in_transit')),0),
    'driver_cash_outstanding', COALESCE((SELECT SUM(outstanding) FROM public.driver_balances),0)
  ) INTO res;
  RETURN res;
END; $$;
REVOKE EXECUTE ON FUNCTION public.business_overview(date,date) FROM PUBLIC, anon;