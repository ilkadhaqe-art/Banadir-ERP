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

-- ================= ATOMIC OPERATIONS =================
CREATE OR REPLACE FUNCTION public.create_sale(
  _sale_date date,
  _customer_id uuid,
  _items jsonb,
  _discount numeric DEFAULT 0,
  _paid_amount numeric DEFAULT 0,
  _payment_method public.payment_method DEFAULT 'cash',
  _account_id uuid DEFAULT NULL,
  _note text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  it jsonb; v_sale_id uuid; v_subtotal numeric(14,2) := 0; v_total numeric(14,2);
  v_cogs numeric(14,2) := 0; v_status public.sale_payment_status;
  v_product record; v_qty numeric(14,2); v_price numeric(14,2); v_stock numeric(14,2);
  v_customer record; v_outstanding numeric(14,2);
BEGIN
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'A sale needs at least one line item';
  END IF;
  IF COALESCE(_discount,0) < 0 OR COALESCE(_paid_amount,0) < 0 THEN
    RAISE EXCEPTION 'Discount and paid amount cannot be negative';
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (it->>'quantity')::numeric;
    v_price := (it->>'unit_price')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'Every line needs a quantity above zero'; END IF;
    IF v_price IS NULL OR v_price < 0 THEN RAISE EXCEPTION 'Every line needs a valid price'; END IF;
    SELECT id, name, cost_price, active INTO v_product FROM public.products WHERE id = (it->>'product_id')::uuid;
    IF v_product.id IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
    IF NOT v_product.active THEN RAISE EXCEPTION 'Product % is inactive', v_product.name; END IF;
    SELECT stock_on_hand INTO v_stock FROM public.product_stock WHERE product_id = v_product.id;
    IF COALESCE(v_stock,0) < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for % (on hand %)', v_product.name, COALESCE(v_stock,0);
    END IF;
    v_subtotal := v_subtotal + (v_qty * v_price);
    v_cogs := v_cogs + (v_qty * v_product.cost_price);
  END LOOP;

  IF COALESCE(_discount,0) > v_subtotal THEN RAISE EXCEPTION 'Discount cannot exceed the subtotal'; END IF;
  v_total := v_subtotal - COALESCE(_discount,0);
  IF COALESCE(_paid_amount,0) > v_total THEN RAISE EXCEPTION 'Paid amount cannot exceed the sale total'; END IF;

  IF COALESCE(_paid_amount,0) < v_total THEN
    IF _customer_id IS NULL THEN RAISE EXCEPTION 'Debt sales need a customer'; END IF;
    SELECT * INTO v_customer FROM public.customers WHERE id = _customer_id;
    IF v_customer.id IS NULL THEN RAISE EXCEPTION 'Customer not found'; END IF;
    IF NOT v_customer.active THEN RAISE EXCEPTION 'Customer % is inactive', v_customer.name; END IF;
    IF v_customer.credit_limit > 0 THEN
      SELECT COALESCE(balance,0) INTO v_outstanding FROM public.customer_balances WHERE customer_id = _customer_id;
      IF v_outstanding + (v_total - COALESCE(_paid_amount,0)) > v_customer.credit_limit THEN
        RAISE EXCEPTION 'Credit limit exceeded for % (limit %, outstanding %)',
          v_customer.name, v_customer.credit_limit, v_outstanding;
      END IF;
    END IF;
  END IF;

  IF COALESCE(_paid_amount,0) > 0 AND _account_id IS NULL THEN
    RAISE EXCEPTION 'Choose the account that received the payment';
  END IF;

  v_status := CASE
    WHEN COALESCE(_paid_amount,0) = 0 AND v_total > 0 THEN 'full_debt'
    WHEN COALESCE(_paid_amount,0) < v_total THEN 'partial'
    ELSE 'full_paid' END;

  INSERT INTO public.sales (customer_id, sale_date, subtotal, discount, total, paid_amount,
                            payment_method, payment_status, account_id, note, created_by)
  VALUES (_customer_id, COALESCE(_sale_date, CURRENT_DATE), v_subtotal, COALESCE(_discount,0), v_total,
          COALESCE(_paid_amount,0), _payment_method, v_status, _account_id, _note, auth.uid())
  RETURNING id INTO v_sale_id;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT id, cost_price INTO v_product FROM public.products WHERE id = (it->>'product_id')::uuid;
    v_qty := (it->>'quantity')::numeric;
    v_price := (it->>'unit_price')::numeric;

    INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, unit_cost)
    VALUES (v_sale_id, v_product.id, v_qty, v_price, v_product.cost_price);

    INSERT INTO public.inventory_movements (product_id, movement_date, movement_type, quantity,
                                            unit_cost, reference, note, source_table, source_id, created_by)
    VALUES (v_product.id, COALESCE(_sale_date, CURRENT_DATE), 'sale', v_qty, v_product.cost_price,
            (SELECT sale_no FROM public.sales WHERE id = v_sale_id), 'Sale line',
            'sales', v_sale_id, auth.uid());
  END LOOP;

  INSERT INTO public.financial_transactions (txn_date, type, scope, category, description, amount,
                                             cogs, amount_paid, account_id, source_table, source_id, created_by)
  VALUES (COALESCE(_sale_date, CURRENT_DATE), 'sale', 'business', 'sales',
          'Sale ' || (SELECT sale_no FROM public.sales WHERE id = v_sale_id),
          v_total, v_cogs, COALESCE(_paid_amount,0), _account_id, 'sales', v_sale_id, auth.uid());

  RETURN v_sale_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_sale(date, uuid, jsonb, numeric, numeric, public.payment_method, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_sale(date, uuid, jsonb, numeric, numeric, public.payment_method, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_collection(
  _customer_id uuid,
  _amount numeric,
  _payment_date date DEFAULT NULL,
  _method public.payment_method DEFAULT 'cash',
  _account_id uuid DEFAULT NULL,
  _sale_id uuid DEFAULT NULL,
  _reference text DEFAULT NULL,
  _note text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_payment_id uuid; v_left numeric(14,2); v_outstanding numeric(14,2);
  v_apply numeric(14,2); r record; v_date date;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Collection amount must be above zero'; END IF;
  IF _account_id IS NULL THEN RAISE EXCEPTION 'Choose the account that received the collection'; END IF;
  v_date := COALESCE(_payment_date, CURRENT_DATE);

  SELECT COALESCE(balance,0) INTO v_outstanding FROM public.customer_balances WHERE customer_id = _customer_id;
  IF v_outstanding IS NULL THEN RAISE EXCEPTION 'Customer not found'; END IF;
  IF _amount > v_outstanding THEN
    RAISE EXCEPTION 'Collection exceeds the outstanding balance (%)', v_outstanding;
  END IF;

  INSERT INTO public.customer_payments (customer_id, sale_id, payment_date, amount, method,
                                        account_id, reference, note, created_by)
  VALUES (_customer_id, _sale_id, v_date, _amount, _method, _account_id, _reference, _note, auth.uid())
  RETURNING id INTO v_payment_id;

  v_left := _amount;

  IF _sale_id IS NOT NULL THEN
    SELECT id, balance INTO r FROM public.sales WHERE id = _sale_id AND status = 'active';
    IF r.id IS NOT NULL AND r.balance > 0 THEN
      v_apply := LEAST(v_left, r.balance);
      UPDATE public.sales SET paid_amount = paid_amount + v_apply,
        payment_status = CASE WHEN (total - returned_total - (paid_amount + v_apply)) <= 0 THEN 'full_paid'
                              WHEN (paid_amount + v_apply) > 0 THEN 'partial' ELSE 'full_debt' END
      WHERE id = r.id;
      v_left := v_left - v_apply;
    END IF;
  END IF;

  FOR r IN SELECT id, balance FROM public.sales
           WHERE customer_id = _customer_id AND status = 'active' AND balance > 0
           ORDER BY sale_date, created_at LOOP
    EXIT WHEN v_left <= 0;
    v_apply := LEAST(v_left, r.balance);
    UPDATE public.sales SET paid_amount = paid_amount + v_apply,
      payment_status = CASE WHEN (total - returned_total - (paid_amount + v_apply)) <= 0 THEN 'full_paid'
                            WHEN (paid_amount + v_apply) > 0 THEN 'partial' ELSE 'full_debt' END
    WHERE id = r.id;
    v_left := v_left - v_apply;
  END LOOP;

  INSERT INTO public.financial_transactions (txn_date, type, scope, category, description, amount,
                                             amount_paid, account_id, source_table, source_id, created_by)
  VALUES (v_date, 'collection', 'business', 'debt_collection',
          COALESCE(_note, 'Debt collection'), _amount, _amount, _account_id,
          'customer_payments', v_payment_id, auth.uid());

  RETURN v_payment_id;
END; $$;
REVOKE ALL ON FUNCTION public.record_collection(uuid, numeric, date, public.payment_method, uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_collection(uuid, numeric, date, public.payment_method, uuid, uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_sale_return(
  _sale_id uuid,
  _items jsonb,
  _return_date date DEFAULT NULL,
  _restock boolean DEFAULT true,
  _refund_amount numeric DEFAULT 0,
  _refund_method public.payment_method DEFAULT NULL,
  _account_id uuid DEFAULT NULL,
  _note text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_sale record; it jsonb; v_return_id uuid; v_total numeric(14,2) := 0; v_cogs numeric(14,2) := 0;
  v_qty numeric(14,2); v_price numeric(14,2); v_sold numeric(14,2); v_returned numeric(14,2);
  v_item record; v_date date; v_refund numeric(14,2);
BEGIN
  SELECT * INTO v_sale FROM public.sales WHERE id = _sale_id;
  IF v_sale.id IS NULL THEN RAISE EXCEPTION 'Sale not found'; END IF;
  IF v_sale.status <> 'active' THEN RAISE EXCEPTION 'This sale is voided'; END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'A return needs at least one line item';
  END IF;
  v_date := COALESCE(_return_date, CURRENT_DATE);
  v_refund := COALESCE(_refund_amount, 0);

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (it->>'quantity')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'Every returned line needs a quantity above zero'; END IF;
    SELECT product_id, quantity, unit_price, unit_cost INTO v_item
      FROM public.sale_items WHERE sale_id = _sale_id AND product_id = (it->>'product_id')::uuid;
    IF v_item.product_id IS NULL THEN RAISE EXCEPTION 'That product was not part of this sale'; END IF;
    v_sold := v_item.quantity;
    SELECT COALESCE(SUM(ri.quantity),0) INTO v_returned
      FROM public.sales_return_items ri
      JOIN public.sales_returns r ON r.id = ri.return_id
      WHERE r.sale_id = _sale_id AND r.status = 'active' AND ri.product_id = v_item.product_id;
    IF v_qty > (v_sold - v_returned) THEN
      RAISE EXCEPTION 'Cannot return more than was sold (% remaining)', (v_sold - v_returned);
    END IF;
    v_total := v_total + (v_qty * v_item.unit_price);
    v_cogs := v_cogs + (v_qty * v_item.unit_cost);
  END LOOP;

  IF v_refund > v_total THEN RAISE EXCEPTION 'Refund cannot exceed the returned value'; END IF;
  IF v_refund > v_sale.paid_amount THEN RAISE EXCEPTION 'Refund cannot exceed what the customer already paid'; END IF;
  IF v_refund > 0 AND _account_id IS NULL THEN RAISE EXCEPTION 'Choose the account paying the refund'; END IF;

  INSERT INTO public.sales_returns (sale_id, customer_id, return_date, total, cogs, refund_amount,
                                    refund_method, account_id, restock, note, created_by)
  VALUES (_sale_id, v_sale.customer_id, v_date, v_total, v_cogs, v_refund,
          _refund_method, _account_id, COALESCE(_restock, true), _note, auth.uid())
  RETURNING id INTO v_return_id;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (it->>'quantity')::numeric;
    SELECT product_id, unit_price, unit_cost INTO v_item
      FROM public.sale_items WHERE sale_id = _sale_id AND product_id = (it->>'product_id')::uuid;

    INSERT INTO public.sales_return_items (return_id, product_id, quantity, unit_price, unit_cost)
    VALUES (v_return_id, v_item.product_id, v_qty, v_item.unit_price, v_item.unit_cost);

    IF COALESCE(_restock, true) THEN
      INSERT INTO public.inventory_movements (product_id, movement_date, movement_type, quantity,
                                              unit_cost, reference, note, source_table, source_id, created_by)
      VALUES (v_item.product_id, v_date, 'return_in', v_qty, v_item.unit_cost, v_sale.sale_no,
              'Sales return', 'sales_returns', v_return_id, auth.uid());
    END IF;
  END LOOP;

  UPDATE public.sales SET
    returned_total = returned_total + v_total,
    paid_amount = paid_amount - v_refund,
    payment_status = CASE
      WHEN (total - (returned_total + v_total) - (paid_amount - v_refund)) <= 0 THEN 'full_paid'
      WHEN (paid_amount - v_refund) > 0 THEN 'partial' ELSE 'full_debt' END
  WHERE id = _sale_id;

  INSERT INTO public.financial_transactions (txn_date, type, scope, category, description, amount,
                                             cogs, amount_paid, account_id, source_table, source_id, created_by)
  VALUES (v_date, 'sale_return', 'business', 'sales_return',
          'Return on ' || v_sale.sale_no, v_total, v_cogs, v_refund, _account_id,
          'sales_returns', v_return_id, auth.uid());

  RETURN v_return_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_sale_return(uuid, jsonb, date, boolean, numeric, public.payment_method, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_sale_return(uuid, jsonb, date, boolean, numeric, public.payment_method, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_account_transfer(
  _from_account_id uuid,
  _to_account_id uuid,
  _amount numeric,
  _transfer_date date DEFAULT NULL,
  _note text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_id uuid; v_date date; v_available numeric(14,2);
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Transfer amount must be above zero'; END IF;
  IF _from_account_id = _to_account_id THEN RAISE EXCEPTION 'Choose two different accounts'; END IF;
  v_date := COALESCE(_transfer_date, CURRENT_DATE);

  SELECT balance INTO v_available FROM public.account_balances WHERE account_id = _from_account_id;
  IF v_available IS NULL THEN RAISE EXCEPTION 'Source account not found'; END IF;
  IF _amount > v_available THEN
    RAISE EXCEPTION 'Not enough money in that account (available %)', v_available;
  END IF;

  INSERT INTO public.account_transfers (transfer_date, from_account_id, to_account_id, amount, note, created_by)
  VALUES (v_date, _from_account_id, _to_account_id, _amount, _note, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.financial_transactions (txn_date, type, scope, category, description, amount,
                                             amount_paid, account_id, source_table, source_id, created_by)
  VALUES (v_date, 'transfer', 'business', 'account_transfer',
          COALESCE(_note, 'Account transfer'), _amount, 0, _from_account_id,
          'account_transfers', v_id, auth.uid());

  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.create_account_transfer(uuid, uuid, numeric, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_account_transfer(uuid, uuid, numeric, date, text) TO authenticated;

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
      COALESCE(SUM(amount) FILTER (WHERE type='sale'),0)
        - COALESCE(SUM(amount) FILTER (WHERE type='sale_return'),0) AS sales_net,
      COALESCE(SUM(amount_paid) FILTER (WHERE type='sale'),0)
        - COALESCE(SUM(amount_paid) FILTER (WHERE type='sale_return'),0) AS sales_paid,
      COALESCE(SUM(cogs) FILTER (WHERE type='sale'),0)
        - COALESCE(SUM(cogs) FILTER (WHERE type='sale_return'),0) AS cogs,
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
REVOKE EXECUTE ON FUNCTION public.rebuild_financial_chain(date) FROM authenticated;