CREATE TYPE public.financial_scope AS ENUM ('business','personal');
CREATE TYPE public.rule_kind AS ENUM ('obligation','guaranteed_income');
CREATE TYPE public.rule_frequency AS ENUM ('daily','friday','weekly','monthly','yearly');
CREATE TYPE public.txn_type AS ENUM ('sale','expense','income','collection','capital','transfer','adjustment');
CREATE TYPE public.txn_status AS ENUM ('active','void');
CREATE TYPE public.period_status AS ENUM ('open','closed');

CREATE TABLE public.financial_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.financial_settings TO authenticated;
GRANT ALL ON public.financial_settings TO service_role;
ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY fs_select ON public.financial_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY fs_write ON public.financial_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER financial_settings_updated_at BEFORE UPDATE ON public.financial_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'cash',
  scope public.financial_scope NOT NULL DEFAULT 'business',
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_accounts TO authenticated;
GRANT ALL ON public.payment_accounts TO service_role;
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY pa_select ON public.payment_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY pa_write ON public.payment_accounts FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER payment_accounts_updated_at BEFORE UPDATE ON public.payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.financial_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  scope public.financial_scope NOT NULL,
  kind public.rule_kind NOT NULL DEFAULT 'obligation',
  category text,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  frequency public.rule_frequency NOT NULL DEFAULT 'daily',
  skip_friday boolean NOT NULL DEFAULT false,
  effective_from date NOT NULL,
  effective_to date,
  active boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 100,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX financial_rules_lookup_idx ON public.financial_rules (active, kind, frequency, effective_from, effective_to);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_rules TO authenticated;
GRANT ALL ON public.financial_rules TO service_role;
ALTER TABLE public.financial_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY fr_select ON public.financial_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY fr_write ON public.financial_rules FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER financial_rules_updated_at BEFORE UPDATE ON public.financial_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txn_date date NOT NULL,
  type public.txn_type NOT NULL,
  scope public.financial_scope NOT NULL DEFAULT 'business',
  category text,
  description text,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  cogs numeric(14,2) NOT NULL DEFAULT 0 CHECK (cogs >= 0),
  amount_paid numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  account_id uuid REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
  settles_rule_id uuid REFERENCES public.financial_rules(id) ON DELETE SET NULL,
  source_table text,
  source_id uuid,
  status public.txn_status NOT NULL DEFAULT 'active',
  voided_at timestamptz,
  voided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT paid_not_over_amount CHECK (amount_paid <= amount)
);
CREATE INDEX ft_date_idx ON public.financial_transactions (txn_date);
CREATE INDEX ft_type_idx ON public.financial_transactions (type, status, txn_date);
CREATE UNIQUE INDEX ft_source_idx ON public.financial_transactions (source_table, source_id)
  WHERE source_table IS NOT NULL AND source_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_transactions TO authenticated;
GRANT ALL ON public.financial_transactions TO service_role;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ft_select ON public.financial_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY ft_write ON public.financial_transactions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER financial_transactions_updated_at BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.financial_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date date NOT NULL UNIQUE,
  end_date date NOT NULL,
  status public.period_status NOT NULL DEFAULT 'open',
  opening_carry_deficit numeric(14,2) NOT NULL DEFAULT 0,
  closing_deficit numeric(14,2) NOT NULL DEFAULT 0,
  surplus numeric(14,2) NOT NULL DEFAULT 0,
  capital_added numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.financial_periods TO authenticated;
GRANT ALL ON public.financial_periods TO service_role;
ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY fp_select ON public.financial_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY fp_write ON public.financial_periods FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.capital_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_date date NOT NULL,
  amount numeric(14,2) NOT NULL,
  source text NOT NULL DEFAULT 'period_surplus',
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.capital_records TO authenticated;
GRANT ALL ON public.capital_records TO service_role;
ALTER TABLE public.capital_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY cr_select ON public.capital_records FOR SELECT TO authenticated USING (true);
CREATE POLICY cr_write ON public.capital_records FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.daily_financial_states (
  day date PRIMARY KEY,
  period_id uuid REFERENCES public.financial_periods(id) ON DELETE SET NULL,
  is_friday boolean NOT NULL DEFAULT false,
  business_daily_obligation numeric(14,2) NOT NULL DEFAULT 0,
  personal_daily_obligation numeric(14,2) NOT NULL DEFAULT 0,
  friday_extra_obligation numeric(14,2) NOT NULL DEFAULT 0,
  monthly_share_business numeric(14,2) NOT NULL DEFAULT 0,
  monthly_share_personal numeric(14,2) NOT NULL DEFAULT 0,
  guaranteed_income numeric(14,2) NOT NULL DEFAULT 0,
  other_income numeric(14,2) NOT NULL DEFAULT 0,
  collections numeric(14,2) NOT NULL DEFAULT 0,
  sales_net numeric(14,2) NOT NULL DEFAULT 0,
  sales_paid numeric(14,2) NOT NULL DEFAULT 0,
  cogs numeric(14,2) NOT NULL DEFAULT 0,
  gross_profit numeric(14,2) NOT NULL DEFAULT 0,
  business_expenses numeric(14,2) NOT NULL DEFAULT 0,
  personal_expenses numeric(14,2) NOT NULL DEFAULT 0,
  business_net_profit numeric(14,2) NOT NULL DEFAULT 0,
  carry_in numeric(14,2) NOT NULL DEFAULT 0,
  target_base numeric(14,2) NOT NULL DEFAULT 0,
  target numeric(14,2) NOT NULL DEFAULT 0,
  achievement numeric(14,2) NOT NULL DEFAULT 0,
  plus_amount numeric(14,2) NOT NULL DEFAULT 0,
  minus_amount numeric(14,2) NOT NULL DEFAULT 0,
  carry_out numeric(14,2) NOT NULL DEFAULT 0,
  cash_delta numeric(14,2) NOT NULL DEFAULT 0,
  cash_balance numeric(14,2) NOT NULL DEFAULT 0,
  receivables numeric(14,2) NOT NULL DEFAULT 0,
  capital_balance numeric(14,2) NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_financial_states TO authenticated;
GRANT ALL ON public.daily_financial_states TO service_role;
ALTER TABLE public.daily_financial_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY dfs_select ON public.daily_financial_states FOR SELECT TO authenticated USING (true);

CREATE TABLE public.financial_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid,
  action text NOT NULL,
  entity_table text NOT NULL,
  entity_id uuid,
  affected_date date,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fal_entity_idx ON public.financial_audit_log (entity_table, entity_id, created_at DESC);
GRANT SELECT ON public.financial_audit_log TO authenticated;
GRANT ALL ON public.financial_audit_log TO service_role;
ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY fal_select ON public.financial_audit_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ================= ENGINE =================
CREATE OR REPLACE FUNCTION public.financial_start_date()
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT value::date FROM public.financial_settings WHERE key = 'financial_start_date'), CURRENT_DATE);
$$;

CREATE OR REPLACE FUNCTION public.ensure_financial_periods(_from date, _to date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m date;
BEGIN
  m := date_trunc('month', _from)::date;
  WHILE m <= _to LOOP
    INSERT INTO public.financial_periods (start_date, end_date)
    VALUES (m, (m + interval '1 month - 1 day')::date)
    ON CONFLICT (start_date) DO NOTHING;
    m := (m + interval '1 month')::date;
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.rebuild_financial_chain(_from date DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start date; v_end date; v_from date; d date; prev record;
  v_carry numeric(14,2); v_cash numeric(14,2); v_recv numeric(14,2); v_capital numeric(14,2);
  v_period record;
  bd numeric(14,2); pd numeric(14,2); fx numeric(14,2); gi numeric(14,2);
  mb numeric(14,2); mp numeric(14,2);
  mon_b numeric(14,2); mon_p numeric(14,2); paid_b numeric(14,2); paid_p numeric(14,2);
  rem_days int;
  a record;
  gp numeric(14,2); ach numeric(14,2); tb numeric(14,2); tgt numeric(14,2);
  plus_a numeric(14,2); minus_a numeric(14,2); cash_delta numeric(14,2);
BEGIN
  v_start := public.financial_start_date();
  SELECT GREATEST(CURRENT_DATE, COALESCE(MAX(txn_date), v_start)) INTO v_end
    FROM public.financial_transactions WHERE status = 'active';
  v_end := GREATEST(COALESCE(v_end, CURRENT_DATE), v_start);
  v_from := GREATEST(COALESCE(_from, v_start), v_start);

  PERFORM public.ensure_financial_periods(v_start, v_end);

  SELECT * INTO prev FROM public.daily_financial_states WHERE day < v_from ORDER BY day DESC LIMIT 1;
  v_carry   := COALESCE(prev.carry_out, 0);
  v_cash    := COALESCE(prev.cash_balance, (SELECT COALESCE(SUM(opening_balance),0) FROM public.payment_accounts WHERE active));
  v_recv    := COALESCE(prev.receivables, 0);
  v_capital := COALESCE(prev.capital_balance, 0);

  DELETE FROM public.daily_financial_states WHERE day >= v_from;

  FOR d IN SELECT generate_series(v_from, v_end, interval '1 day')::date LOOP
    SELECT * INTO v_period FROM public.financial_periods
      WHERE d BETWEEN start_date AND end_date LIMIT 1;

    IF v_period.start_date = d AND d > v_start THEN
      v_carry := COALESCE(v_period.opening_carry_deficit, 0);
    END IF;

    SELECT
      COALESCE(SUM(amount) FILTER (WHERE scope='business' AND frequency='daily' AND NOT (skip_friday AND EXTRACT(dow FROM d)=5)),0),
      COALESCE(SUM(amount) FILTER (WHERE scope='personal' AND frequency='daily' AND NOT (skip_friday AND EXTRACT(dow FROM d)=5)),0),
      COALESCE(SUM(amount) FILTER (WHERE frequency='friday' AND EXTRACT(dow FROM d)=5),0)
    INTO bd, pd, fx
    FROM public.financial_rules
    WHERE active AND kind='obligation' AND effective_from <= d AND (effective_to IS NULL OR effective_to >= d);

    SELECT COALESCE(SUM(amount),0) INTO gi FROM public.financial_rules
      WHERE active AND kind='guaranteed_income' AND frequency='daily'
        AND effective_from <= d AND (effective_to IS NULL OR effective_to >= d);

    SELECT
      COALESCE(SUM(amount) FILTER (WHERE scope='business'),0),
      COALESCE(SUM(amount) FILTER (WHERE scope='personal'),0)
    INTO mon_b, mon_p
    FROM public.financial_rules
    WHERE active AND kind='obligation' AND frequency='monthly'
      AND effective_from <= v_period.end_date AND (effective_to IS NULL OR effective_to >= v_period.start_date);

    SELECT
      COALESCE(SUM(amount) FILTER (WHERE scope='business'),0),
      COALESCE(SUM(amount) FILTER (WHERE scope='personal'),0)
    INTO paid_b, paid_p
    FROM public.financial_transactions
    WHERE status='active' AND type='expense' AND settles_rule_id IS NOT NULL
      AND txn_date BETWEEN v_period.start_date AND (d - 1);

    rem_days := GREATEST((v_period.end_date - d) + 1, 1);
    mb := ROUND(GREATEST(mon_b - paid_b, 0) / rem_days, 2);
    mp := ROUND(GREATEST(mon_p - paid_p, 0) / rem_days, 2);

    SELECT
      COALESCE(SUM(amount) FILTER (WHERE type='sale'),0) AS sales_net,
      COALESCE(SUM(amount_paid) FILTER (WHERE type='sale'),0) AS sales_paid,
      COALESCE(SUM(cogs) FILTER (WHERE type='sale'),0) AS cogs,
      COALESCE(SUM(amount) FILTER (WHERE type='expense' AND scope='business'),0) AS bex,
      COALESCE(SUM(amount) FILTER (WHERE type='expense' AND scope='personal'),0) AS pex,
      COALESCE(SUM(amount) FILTER (WHERE type='income'),0) AS oinc,
      COALESCE(SUM(amount) FILTER (WHERE type='collection'),0) AS coll,
      COALESCE(SUM(amount) FILTER (WHERE type='capital'),0) AS cap
    INTO a
    FROM public.financial_transactions
    WHERE status='active' AND txn_date = d;

    gp  := a.sales_net - a.cogs;
    ach := gp + gi + a.oinc;
    tb  := bd + pd + fx + mb + mp;
    tgt := tb + v_carry;
    plus_a  := GREATEST(ach - tgt, 0);
    minus_a := GREATEST(tgt - ach, 0);

    cash_delta := a.sales_paid + a.coll + a.oinc + gi + a.cap - a.bex - a.pex;
    v_cash := v_cash + cash_delta;
    v_recv := v_recv + (a.sales_net - a.sales_paid) - a.coll;
    v_capital := v_capital + a.cap
      + COALESCE((SELECT SUM(amount) FROM public.capital_records WHERE effective_date = d), 0);

    INSERT INTO public.daily_financial_states (
      day, period_id, is_friday,
      business_daily_obligation, personal_daily_obligation, friday_extra_obligation,
      monthly_share_business, monthly_share_personal,
      guaranteed_income, other_income, collections,
      sales_net, sales_paid, cogs, gross_profit,
      business_expenses, personal_expenses, business_net_profit,
      carry_in, target_base, target, achievement, plus_amount, minus_amount, carry_out,
      cash_delta, cash_balance, receivables, capital_balance
    ) VALUES (
      d, v_period.id, EXTRACT(dow FROM d) = 5,
      bd, pd, fx, mb, mp,
      gi, a.oinc, a.coll,
      a.sales_net, a.sales_paid, a.cogs, gp,
      a.bex, a.pex, gp - a.bex,
      v_carry, tb, tgt, ach, plus_a, minus_a, minus_a,
      cash_delta, v_cash, v_recv, v_capital
    );

    v_carry := minus_a;
  END LOOP;

  UPDATE public.financial_periods p SET
    surplus = COALESCE(s.total_plus, 0),
    closing_deficit = COALESCE(s.last_carry, 0),
    updated_at = now()
  FROM (
    SELECT period_id,
           SUM(plus_amount) AS total_plus,
           (ARRAY_AGG(carry_out ORDER BY day DESC))[1] AS last_carry
    FROM public.daily_financial_states
    WHERE period_id IS NOT NULL
    GROUP BY period_id
  ) s
  WHERE s.period_id = p.id;
END; $$;

CREATE OR REPLACE FUNCTION public.financial_snapshot(_date date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE d date; s record; p record; pt record;
BEGIN
  d := COALESCE(_date, CURRENT_DATE);
  SELECT * INTO s FROM public.daily_financial_states WHERE day = d;
  IF s IS NULL THEN
    SELECT * INTO s FROM public.daily_financial_states ORDER BY day DESC LIMIT 1;
  END IF;
  SELECT * INTO p FROM public.financial_periods WHERE d BETWEEN start_date AND end_date LIMIT 1;

  SELECT
    COALESCE(SUM(sales_net),0) AS sales, COALESCE(SUM(cogs),0) AS cogs,
    COALESCE(SUM(gross_profit),0) AS gp, COALESCE(SUM(business_expenses),0) AS bex,
    COALESCE(SUM(personal_expenses),0) AS pex, COALESCE(SUM(guaranteed_income),0) AS gi,
    COALESCE(SUM(other_income),0) AS oinc, COALESCE(SUM(collections),0) AS coll,
    COALESCE(SUM(target),0) AS target, COALESCE(SUM(achievement),0) AS achievement,
    COALESCE(SUM(plus_amount),0) AS plus_total, COALESCE(SUM(minus_amount),0) AS minus_total
  INTO pt FROM public.daily_financial_states
  WHERE p.id IS NOT NULL AND day BETWEEN p.start_date AND LEAST(p.end_date, d);

  RETURN jsonb_build_object(
    'current_date', d,
    'financial_start', public.financial_start_date(),
    'financial_period', jsonb_build_object(
      'id', p.id, 'start_date', p.start_date, 'end_date', p.end_date, 'status', p.status,
      'days_total', (p.end_date - p.start_date) + 1,
      'days_elapsed', GREATEST((LEAST(d, p.end_date) - p.start_date) + 1, 0),
      'days_remaining', GREATEST((p.end_date - d) + 1, 0),
      'opening_carry_deficit', p.opening_carry_deficit
    ),
    'today_target', COALESCE(s.target,0),
    'today_target_base', COALESCE(s.target_base,0),
    'today_achievement', COALESCE(s.achievement,0),
    'today_plus', COALESCE(s.plus_amount,0),
    'today_minus', COALESCE(s.minus_amount,0),
    'carry_in', COALESCE(s.carry_in,0),
    'carry_out', COALESCE(s.carry_out,0),
    'progress_percentage', CASE WHEN COALESCE(s.target,0) > 0
      THEN ROUND(LEAST(COALESCE(s.achievement,0) / s.target, 1) * 100, 1) ELSE 100 END,
    'business_obligation_today', COALESCE(s.business_daily_obligation,0) + COALESCE(s.monthly_share_business,0),
    'personal_obligation_today', COALESCE(s.personal_daily_obligation,0) + COALESCE(s.friday_extra_obligation,0) + COALESCE(s.monthly_share_personal,0),
    'today', jsonb_build_object(
      'sales', COALESCE(s.sales_net,0), 'cogs', COALESCE(s.cogs,0),
      'gross_profit', COALESCE(s.gross_profit,0), 'net_profit', COALESCE(s.business_net_profit,0),
      'business_expenses', COALESCE(s.business_expenses,0), 'personal_expenses', COALESCE(s.personal_expenses,0),
      'guaranteed_income', COALESCE(s.guaranteed_income,0), 'other_income', COALESCE(s.other_income,0),
      'collections', COALESCE(s.collections,0), 'is_friday', COALESCE(s.is_friday,false)
    ),
    'period_totals', jsonb_build_object(
      'sales', COALESCE(pt.sales,0), 'cogs', COALESCE(pt.cogs,0), 'gross_profit', COALESCE(pt.gp,0),
      'business_expenses', COALESCE(pt.bex,0), 'personal_expenses', COALESCE(pt.pex,0),
      'net_profit', COALESCE(pt.gp,0) - COALESCE(pt.bex,0),
      'guaranteed_income', COALESCE(pt.gi,0), 'other_income', COALESCE(pt.oinc,0),
      'collections', COALESCE(pt.coll,0), 'target', COALESCE(pt.target,0),
      'achievement', COALESCE(pt.achievement,0), 'plus_total', COALESCE(pt.plus_total,0),
      'minus_total', COALESCE(pt.minus_total,0)
    ),
    'cash_balance', COALESCE(s.cash_balance,0),
    'receivables', COALESCE(s.receivables,0),
    'business_capital', COALESCE(s.capital_balance,0),
    'computed_at', COALESCE(s.computed_at, now())
  );
END; $$;

REVOKE EXECUTE ON FUNCTION public.financial_start_date() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_financial_periods(date, date) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.rebuild_financial_chain(date) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.financial_snapshot(date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.financial_snapshot(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rebuild_financial_chain(date) TO authenticated;

-- ================= SEED (approved baseline) =================
INSERT INTO public.financial_settings (key, value, description) VALUES
  ('financial_start_date','2026-08-12','Effective financial reconstruction start'),
  ('currency','USD','Reporting currency'),
  ('deficit_carry_forward','true','Unresolved period deficit becomes next period opening burden'),
  ('surplus_to_capital','true','Positive period surplus converts to business capital');

INSERT INTO public.payment_accounts (name, kind, scope, sort_order) VALUES
  ('Cash','cash','business',1),
  ('EVC Plus','mobile_money','business',2),
  ('E-Dahab','mobile_money','business',3),
  ('Bank','bank','business',4);

INSERT INTO public.financial_rules (name, scope, kind, category, amount, frequency, skip_friday, effective_from) VALUES
  ('Transportation','business','obligation','transport',1.00,'daily',true,'2026-08-12'),
  ('Lunch','business','obligation','food',1.25,'daily',true,'2026-08-12'),
  ('Home Service','personal','obligation','home',3.50,'daily',false,'2026-08-12'),
  ('Mother Support','personal','obligation','family',3.00,'daily',false,'2026-08-12'),
  ('Friday Food','personal','obligation','food',3.50,'friday',false,'2026-08-12'),
  ('Quran','personal','obligation','education',6.00,'friday',false,'2026-08-12'),
  ('Friday City/Outing Transportation','personal','obligation','transport',2.00,'friday',false,'2026-08-12'),
  ('Grocery','personal','obligation','grocery',70.00,'monthly',false,'2026-08-12'),
  ('Tea','business','obligation','office',5.00,'monthly',false,'2026-08-12'),
  ('Cleaning','business','obligation','office',15.00,'monthly',false,'2026-08-12'),
  ('Electricity','business','obligation','utilities',15.00,'monthly',false,'2026-08-12'),
  ('Maandeeq Data','business','guaranteed_income','data',10.00,'daily',false,'2026-08-20'),
  ('Dhameys Data','business','guaranteed_income','data',2.00,'daily',false,'2026-08-20');

INSERT INTO public.financial_transactions (txn_date, type, scope, category, description, amount, amount_paid, cogs) VALUES
  ('2026-08-20','sale','business','historical','Historical aggregate sales (editable)',80.00,80.00,0),
  ('2026-08-16','expense','business','historical','Recorded business expense',35.00,35.00,0);

-- ================= TRIGGERS =================
CREATE OR REPLACE FUNCTION public.financial_txn_rebuild()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date;
BEGIN
  IF TG_OP = 'DELETE' THEN d := OLD.txn_date;
  ELSIF TG_OP = 'UPDATE' THEN d := LEAST(OLD.txn_date, NEW.txn_date);
  ELSE d := NEW.txn_date; END IF;
  PERFORM public.rebuild_financial_chain(d);
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.financial_rule_rebuild()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date;
BEGIN
  IF TG_OP = 'DELETE' THEN d := OLD.effective_from;
  ELSIF TG_OP = 'UPDATE' THEN d := LEAST(OLD.effective_from, NEW.effective_from);
  ELSE d := NEW.effective_from; END IF;
  PERFORM public.rebuild_financial_chain(d);
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.financial_txn_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.financial_audit_log (actor, action, entity_table, entity_id, affected_date, old_value, new_value)
  VALUES (
    auth.uid(), TG_OP, TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.txn_date, OLD.txn_date),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN NULL;
END; $$;

REVOKE EXECUTE ON FUNCTION public.financial_txn_rebuild() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.financial_rule_rebuild() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.financial_txn_audit() FROM public, anon;

CREATE TRIGGER financial_transactions_rebuild
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.financial_txn_rebuild();
CREATE TRIGGER financial_transactions_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.financial_txn_audit();
CREATE TRIGGER financial_rules_rebuild
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_rules
  FOR EACH ROW EXECUTE FUNCTION public.financial_rule_rebuild();

SELECT public.rebuild_financial_chain(NULL);

REVOKE EXECUTE ON FUNCTION public.rebuild_financial_chain(date) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_financial_periods(date, date) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.financial_start_date() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.financial_txn_rebuild() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.financial_rule_rebuild() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.financial_txn_audit() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;