CREATE TYPE public.payment_method AS ENUM ('cash','evc_plus','edahab','merchant','bank');
CREATE TYPE public.sale_payment_status AS ENUM ('full_paid','partial','full_debt');

CREATE OR REPLACE FUNCTION public.can_sell(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(_user_id)
      OR public.has_role(_user_id,'manager')
      OR public.has_role(_user_id,'cashier');
$$;
REVOKE ALL ON FUNCTION public.can_sell(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_sell(uuid) TO authenticated;

-- ================= CUSTOMERS =================
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text UNIQUE,
  email text,
  address text,
  credit_limit numeric(14,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY cu_select ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY cu_write ON public.customers FOR ALL TO authenticated
  USING (public.can_sell(auth.uid())) WITH CHECK (public.can_sell(auth.uid()));
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================= SALES =================
CREATE SEQUENCE public.sale_number_seq;
CREATE OR REPLACE FUNCTION public.next_sale_number()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT 'S-' || to_char(CURRENT_DATE,'YYMM') || '-' || lpad(nextval('public.sale_number_seq')::text, 5, '0');
$$;
REVOKE ALL ON FUNCTION public.next_sale_number() FROM PUBLIC, anon;

CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_no text NOT NULL UNIQUE DEFAULT public.next_sale_number(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE RESTRICT,
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  subtotal numeric(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total numeric(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  paid_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  returned_total numeric(14,2) NOT NULL DEFAULT 0 CHECK (returned_total >= 0),
  balance numeric(14,2) GENERATED ALWAYS AS (total - returned_total - paid_amount) STORED,
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  payment_status public.sale_payment_status NOT NULL DEFAULT 'full_paid',
  account_id uuid REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
  status public.txn_status NOT NULL DEFAULT 'active',
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sales_date_idx ON public.sales (sale_date DESC);
CREATE INDEX sales_customer_idx ON public.sales (customer_id, sale_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY s_select ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY s_write ON public.sales FOR ALL TO authenticated
  USING (public.can_sell(auth.uid())) WITH CHECK (public.can_sell(auth.uid()));
CREATE TRIGGER sales_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity numeric(14,2) NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  line_total numeric(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sale_items_sale_idx ON public.sale_items (sale_id);
CREATE INDEX sale_items_product_idx ON public.sale_items (product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY si_select ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY si_write ON public.sale_items FOR ALL TO authenticated
  USING (public.can_sell(auth.uid())) WITH CHECK (public.can_sell(auth.uid()));

-- ================= COLLECTIONS =================
CREATE TABLE public.customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  method public.payment_method NOT NULL DEFAULT 'cash',
  account_id uuid REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
  reference text,
  note text,
  status public.txn_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cp_customer_idx ON public.customer_payments (customer_id, payment_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_payments TO authenticated;
GRANT ALL ON public.customer_payments TO service_role;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY cp_select ON public.customer_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY cp_write ON public.customer_payments FOR ALL TO authenticated
  USING (public.can_sell(auth.uid())) WITH CHECK (public.can_sell(auth.uid()));

-- ================= RETURNS =================
CREATE TABLE public.sales_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  total numeric(14,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  cogs numeric(14,2) NOT NULL DEFAULT 0 CHECK (cogs >= 0),
  refund_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (refund_amount >= 0),
  refund_method public.payment_method,
  account_id uuid REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
  restock boolean NOT NULL DEFAULT true,
  note text,
  status public.txn_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sr_sale_idx ON public.sales_returns (sale_id);
CREATE INDEX sr_date_idx ON public.sales_returns (return_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_returns TO authenticated;
GRANT ALL ON public.sales_returns TO service_role;
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY sr_select ON public.sales_returns FOR SELECT TO authenticated USING (true);
CREATE POLICY sr_write ON public.sales_returns FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));

CREATE TABLE public.sales_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity numeric(14,2) NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  line_total numeric(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sri_return_idx ON public.sales_return_items (return_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_return_items TO authenticated;
GRANT ALL ON public.sales_return_items TO service_role;
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY sri_select ON public.sales_return_items FOR SELECT TO authenticated USING (true);
CREATE POLICY sri_write ON public.sales_return_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));

-- ================= ACCOUNT TRANSFERS =================
CREATE TABLE public.account_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_date date NOT NULL DEFAULT CURRENT_DATE,
  from_account_id uuid NOT NULL REFERENCES public.payment_accounts(id) ON DELETE RESTRICT,
  to_account_id uuid NOT NULL REFERENCES public.payment_accounts(id) ON DELETE RESTRICT,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  note text,
  status public.txn_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transfer_accounts_differ CHECK (from_account_id <> to_account_id)
);
CREATE INDEX at_date_idx ON public.account_transfers (transfer_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_transfers TO authenticated;
GRANT ALL ON public.account_transfers TO service_role;
ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY at_select ON public.account_transfers FOR SELECT TO authenticated USING (true);
CREATE POLICY at_write ON public.account_transfers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Sales staff post their own sale/collection/return ledger entries and stock lines.
CREATE POLICY ft_sales_pipeline ON public.financial_transactions FOR INSERT TO authenticated
  WITH CHECK (
    public.can_sell(auth.uid())
    AND type IN ('sale','collection','sale_return')
    AND source_table IS NOT NULL AND source_id IS NOT NULL
  );
CREATE POLICY im_sales_pipeline ON public.inventory_movements FOR INSERT TO authenticated
  WITH CHECK (
    public.can_sell(auth.uid())
    AND movement_type IN ('sale','return_in')
    AND source_table IS NOT NULL AND source_id IS NOT NULL
  );

-- ================= READ MODELS =================
CREATE VIEW public.sales_overview WITH (security_invoker = true) AS
SELECT
  s.id, s.sale_no, s.sale_date, s.customer_id, c.name AS customer_name, c.phone AS customer_phone,
  s.subtotal, s.discount, s.total, s.paid_amount, s.returned_total, s.balance,
  s.payment_method, s.payment_status, s.account_id, pa.name AS account_name,
  s.status, s.note, s.created_at,
  COALESCE(i.item_count, 0) AS item_count,
  COALESCE(i.quantity_total, 0) AS quantity_total,
  COALESCE(i.cogs_total, 0) AS cogs_total,
  (s.total - COALESCE(i.cogs_total, 0)) AS gross_profit
FROM public.sales s
LEFT JOIN public.customers c ON c.id = s.customer_id
LEFT JOIN public.payment_accounts pa ON pa.id = s.account_id
LEFT JOIN (
  SELECT sale_id, COUNT(*) AS item_count, SUM(quantity) AS quantity_total,
         SUM(quantity * unit_cost) AS cogs_total
  FROM public.sale_items GROUP BY sale_id
) i ON i.sale_id = s.id;
GRANT SELECT ON public.sales_overview TO authenticated;
GRANT SELECT ON public.sales_overview TO service_role;

CREATE VIEW public.customer_balances WITH (security_invoker = true) AS
SELECT
  c.id AS customer_id, c.name, c.phone, c.email, c.credit_limit, c.active,
  COALESCE(s.sales_total, 0) AS sales_total,
  COALESCE(s.returned_total, 0) AS returned_total,
  COALESCE(s.paid_total, 0) AS paid_total,
  COALESCE(s.balance, 0) AS balance,
  GREATEST(c.credit_limit - COALESCE(s.balance, 0), 0) AS credit_available,
  s.last_sale_date,
  p.last_payment_date
FROM public.customers c
LEFT JOIN (
  SELECT customer_id, SUM(total) AS sales_total, SUM(returned_total) AS returned_total,
         SUM(paid_amount) AS paid_total, SUM(balance) AS balance, MAX(sale_date) AS last_sale_date
  FROM public.sales WHERE status = 'active' AND customer_id IS NOT NULL
  GROUP BY customer_id
) s ON s.customer_id = c.id
LEFT JOIN (
  SELECT customer_id, MAX(payment_date) AS last_payment_date
  FROM public.customer_payments WHERE status = 'active' GROUP BY customer_id
) p ON p.customer_id = c.id;
GRANT SELECT ON public.customer_balances TO authenticated;
GRANT SELECT ON public.customer_balances TO service_role;

CREATE VIEW public.account_balances WITH (security_invoker = true) AS
SELECT
  a.id AS account_id, a.name, a.kind, a.scope, a.active, a.opening_balance,
  (a.opening_balance
    + COALESCE(t.inflow, 0) - COALESCE(t.outflow, 0)
    + COALESCE(tr.transfer_in, 0) - COALESCE(tr.transfer_out, 0))::numeric(14,2) AS balance
FROM public.payment_accounts a
LEFT JOIN (
  SELECT account_id,
    SUM(amount_paid) FILTER (WHERE type = 'sale')
      + SUM(amount) FILTER (WHERE type IN ('collection','income','capital')) AS inflow,
    SUM(amount) FILTER (WHERE type = 'expense')
      + SUM(amount_paid) FILTER (WHERE type = 'sale_return') AS outflow
  FROM public.financial_transactions WHERE status = 'active' AND account_id IS NOT NULL
  GROUP BY account_id
) t ON t.account_id = a.id
LEFT JOIN (
  SELECT acc AS account_id,
    SUM(amount) FILTER (WHERE direction = 'in') AS transfer_in,
    SUM(amount) FILTER (WHERE direction = 'out') AS transfer_out
  FROM (
    SELECT to_account_id AS acc, amount, 'in' AS direction FROM public.account_transfers WHERE status='active'
    UNION ALL
    SELECT from_account_id AS acc, amount, 'out' AS direction FROM public.account_transfers WHERE status='active'
  ) x GROUP BY acc
) tr ON tr.account_id = a.id;
GRANT SELECT ON public.account_balances TO authenticated;
GRANT SELECT ON public.account_balances TO service_role;

CREATE OR REPLACE FUNCTION public.customer_statement(_customer_id uuid)
RETURNS TABLE (
  entry_date date, kind text, reference text, description text,
  debit numeric, credit numeric, running_balance numeric
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH entries AS (
    SELECT s.sale_date AS entry_date, 'sale'::text AS kind, s.sale_no AS reference,
           COALESCE(s.note, 'Sale') AS description, s.total AS debit, 0::numeric AS credit,
           s.created_at AS ordering
    FROM public.sales s
    WHERE s.customer_id = _customer_id AND s.status = 'active'
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
$$;
REVOKE ALL ON FUNCTION public.customer_statement(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_statement(uuid) TO authenticated;