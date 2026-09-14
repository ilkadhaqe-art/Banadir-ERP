-- ===== PHASE 7: SUPPLIERS, PURCHASES, EXPENSES, OTHER INCOME =====

CREATE TYPE public.purchase_payment_status AS ENUM ('full_paid','partial','full_debt');

-- ---------- suppliers ----------
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  contact_person text,
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers readable" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers managed" ON public.suppliers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- purchases ----------
CREATE SEQUENCE public.purchase_number_seq;
CREATE OR REPLACE FUNCTION public.next_purchase_number()
RETURNS text LANGUAGE sql SET search_path = public AS $$
  SELECT 'P-' || to_char(CURRENT_DATE,'YYMM') || '-' || lpad(nextval('public.purchase_number_seq')::text, 5, '0');
$$;

CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_no text NOT NULL UNIQUE DEFAULT public.next_purchase_number(),
  supplier_id uuid REFERENCES public.suppliers(id),
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  invoice_no text,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  extra_cost numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  returned_total numeric(14,2) NOT NULL DEFAULT 0,
  balance numeric(14,2) GENERATED ALWAYS AS (total - returned_total - paid_amount) STORED,
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  payment_status public.purchase_payment_status NOT NULL DEFAULT 'full_paid',
  account_id uuid REFERENCES public.payment_accounts(id),
  status public.txn_status NOT NULL DEFAULT 'active',
  note text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases readable" ON public.purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchases managed" ON public.purchases FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER purchases_updated_at BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX purchases_date_idx ON public.purchases(purchase_date DESC);

CREATE TABLE public.purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity numeric(14,2) NOT NULL,
  unit_cost numeric(14,2) NOT NULL,
  line_total numeric(14,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_items TO authenticated;
GRANT ALL ON public.purchase_items TO service_role;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase items readable" ON public.purchase_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchase items managed" ON public.purchase_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));
CREATE INDEX purchase_items_purchase_idx ON public.purchase_items(purchase_id);

CREATE TABLE public.purchase_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.purchases(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  total numeric(14,2) NOT NULL DEFAULT 0,
  refund_amount numeric(14,2) NOT NULL DEFAULT 0,
  refund_method public.payment_method,
  account_id uuid REFERENCES public.payment_accounts(id),
  note text,
  status public.txn_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_returns TO authenticated;
GRANT ALL ON public.purchase_returns TO service_role;
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase returns readable" ON public.purchase_returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchase returns managed" ON public.purchase_returns FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));

CREATE TABLE public.purchase_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.purchase_returns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity numeric(14,2) NOT NULL,
  unit_cost numeric(14,2) NOT NULL,
  line_total numeric(14,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_return_items TO authenticated;
GRANT ALL ON public.purchase_return_items TO service_role;
ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase return items readable" ON public.purchase_return_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchase return items managed" ON public.purchase_return_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));

CREATE TABLE public.supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  purchase_id uuid REFERENCES public.purchases(id),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(14,2) NOT NULL,
  method public.payment_method NOT NULL DEFAULT 'cash',
  account_id uuid REFERENCES public.payment_accounts(id),
  reference text,
  note text,
  status public.txn_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_payments TO authenticated;
GRANT ALL ON public.supplier_payments TO service_role;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supplier payments readable" ON public.supplier_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "supplier payments managed" ON public.supplier_payments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));

-- ---------- expense / income categories ----------
CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  scope public.financial_scope NOT NULL DEFAULT 'business',
  kind text NOT NULL DEFAULT 'expense',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, scope, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense categories readable" ON public.expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "expense categories managed" ON public.expense_categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));
CREATE TRIGGER expense_categories_updated_at BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.expense_categories (name, scope, kind, sort_order) VALUES
  ('Rent','business','expense',1), ('Salaries','business','expense',2),
  ('Electricity','business','expense',3), ('Transport','business','expense',4),
  ('Marketing','business','expense',5), ('Other business','business','expense',9),
  ('Food','personal','expense',1), ('Family','personal','expense',2),
  ('School','personal','expense',3), ('Other personal','personal','expense',9),
  ('Service income','business','income',1), ('Commission','business','income',2),
  ('Other income','business','income',9);

-- ---------- read-model views ----------
CREATE VIEW public.purchases_overview
WITH (security_invoker = true) AS
SELECT p.id, p.purchase_no, p.purchase_date, p.invoice_no, p.supplier_id, s.name AS supplier_name,
       s.phone AS supplier_phone, p.subtotal, p.discount, p.extra_cost, p.total,
       p.paid_amount, p.returned_total, p.balance, p.payment_method, p.payment_status,
       p.account_id, a.name AS account_name, p.status, p.note, p.created_at,
       COALESCE(i.item_count,0)::int AS item_count,
       COALESCE(i.quantity_total,0)::numeric AS quantity_total
FROM public.purchases p
LEFT JOIN public.suppliers s ON s.id = p.supplier_id
LEFT JOIN public.payment_accounts a ON a.id = p.account_id
LEFT JOIN LATERAL (
  SELECT count(*) AS item_count, SUM(pi.quantity) AS quantity_total
  FROM public.purchase_items pi WHERE pi.purchase_id = p.id
) i ON true;
GRANT SELECT ON public.purchases_overview TO authenticated;

CREATE VIEW public.supplier_balances
WITH (security_invoker = true) AS
SELECT s.id AS supplier_id, s.name, s.phone, s.active,
       s.opening_balance,
       COALESCE(p.purchased,0)::numeric(14,2) AS purchased,
       COALESCE(p.returned,0)::numeric(14,2) AS returned,
       COALESCE(p.paid,0)::numeric(14,2) AS paid,
       (s.opening_balance + COALESCE(p.purchased,0) - COALESCE(p.returned,0) - COALESCE(p.paid,0))::numeric(14,2) AS balance
FROM public.suppliers s
LEFT JOIN LATERAL (
  SELECT
    (SELECT COALESCE(SUM(total),0) FROM public.purchases WHERE supplier_id = s.id AND status='active') AS purchased,
    (SELECT COALESCE(SUM(total),0) FROM public.purchase_returns WHERE supplier_id = s.id AND status='active') AS returned,
    (SELECT COALESCE(SUM(paid_amount),0) FROM public.purchases WHERE supplier_id = s.id AND status='active') AS paid
) p ON true;
GRANT SELECT ON public.supplier_balances TO authenticated;

-- ---------- RPCs ----------
CREATE OR REPLACE FUNCTION public.create_purchase(
  _purchase_date date, _supplier_id uuid, _items jsonb, _discount numeric DEFAULT 0,
  _extra_cost numeric DEFAULT 0, _paid_amount numeric DEFAULT 0,
  _payment_method public.payment_method DEFAULT 'cash', _account_id uuid DEFAULT NULL,
  _invoice_no text DEFAULT NULL, _note text DEFAULT NULL, _update_cost boolean DEFAULT true)
RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE it jsonb; v_id uuid; v_sub numeric(14,2) := 0; v_total numeric(14,2);
        v_qty numeric; v_cost numeric; v_product record; v_status public.purchase_payment_status; v_date date;
BEGIN
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'A purchase needs at least one line item';
  END IF;
  IF COALESCE(_discount,0) < 0 OR COALESCE(_extra_cost,0) < 0 OR COALESCE(_paid_amount,0) < 0 THEN
    RAISE EXCEPTION 'Amounts cannot be negative';
  END IF;
  v_date := COALESCE(_purchase_date, CURRENT_DATE);

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (it->>'quantity')::numeric; v_cost := (it->>'unit_cost')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'Every line needs a quantity above zero'; END IF;
    IF v_cost IS NULL OR v_cost < 0 THEN RAISE EXCEPTION 'Every line needs a valid cost'; END IF;
    SELECT id, name INTO v_product FROM public.products WHERE id = (it->>'product_id')::uuid;
    IF v_product.id IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
    v_sub := v_sub + (v_qty * v_cost);
  END LOOP;

  IF COALESCE(_discount,0) > v_sub THEN RAISE EXCEPTION 'Discount cannot exceed the subtotal'; END IF;
  v_total := v_sub - COALESCE(_discount,0) + COALESCE(_extra_cost,0);
  IF COALESCE(_paid_amount,0) > v_total THEN RAISE EXCEPTION 'Paid amount cannot exceed the purchase total'; END IF;
  IF COALESCE(_paid_amount,0) > 0 AND _account_id IS NULL THEN RAISE EXCEPTION 'Choose the account that paid'; END IF;
  IF COALESCE(_paid_amount,0) < v_total AND _supplier_id IS NULL THEN RAISE EXCEPTION 'Credit purchases need a supplier'; END IF;

  v_status := CASE WHEN COALESCE(_paid_amount,0) = 0 AND v_total > 0 THEN 'full_debt'
                   WHEN COALESCE(_paid_amount,0) < v_total THEN 'partial' ELSE 'full_paid' END;

  INSERT INTO public.purchases (purchase_date, supplier_id, invoice_no, subtotal, discount, extra_cost,
                                total, paid_amount, payment_method, payment_status, account_id, note, created_by)
  VALUES (v_date, _supplier_id, _invoice_no, v_sub, COALESCE(_discount,0), COALESCE(_extra_cost,0),
          v_total, COALESCE(_paid_amount,0), _payment_method, v_status, _account_id, _note, auth.uid())
  RETURNING id INTO v_id;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (it->>'quantity')::numeric; v_cost := (it->>'unit_cost')::numeric;
    INSERT INTO public.purchase_items (purchase_id, product_id, quantity, unit_cost)
    VALUES (v_id, (it->>'product_id')::uuid, v_qty, v_cost);

    INSERT INTO public.inventory_movements (product_id, movement_date, movement_type, quantity,
                                            unit_cost, reference, note, source_table, source_id, created_by)
    VALUES ((it->>'product_id')::uuid, v_date, 'purchase', v_qty, v_cost,
            (SELECT purchase_no FROM public.purchases WHERE id = v_id), 'Purchase line',
            'purchases', v_id, auth.uid());

    IF COALESCE(_update_cost, true) THEN
      UPDATE public.products SET cost_price = v_cost WHERE id = (it->>'product_id')::uuid;
    END IF;
  END LOOP;

  INSERT INTO public.financial_transactions (txn_date, type, scope, category, description, amount,
                                             amount_paid, account_id, source_table, source_id, created_by)
  VALUES (v_date, 'expense', 'business', 'inventory_purchase',
          'Purchase ' || (SELECT purchase_no FROM public.purchases WHERE id = v_id),
          COALESCE(_paid_amount,0), COALESCE(_paid_amount,0), _account_id, 'purchases', v_id, auth.uid());

  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.create_purchase_return(
  _purchase_id uuid, _items jsonb, _return_date date DEFAULT NULL,
  _refund_amount numeric DEFAULT 0, _refund_method public.payment_method DEFAULT NULL,
  _account_id uuid DEFAULT NULL, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE p record; it jsonb; v_id uuid; v_total numeric(14,2) := 0; v_qty numeric;
        v_item record; v_bought numeric; v_returned numeric; v_date date; v_refund numeric(14,2);
BEGIN
  SELECT * INTO p FROM public.purchases WHERE id = _purchase_id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Purchase not found'; END IF;
  IF p.status <> 'active' THEN RAISE EXCEPTION 'This purchase is voided'; END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'A return needs at least one line item';
  END IF;
  v_date := COALESCE(_return_date, CURRENT_DATE);
  v_refund := COALESCE(_refund_amount,0);

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (it->>'quantity')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'Every returned line needs a quantity above zero'; END IF;
    SELECT product_id, quantity, unit_cost INTO v_item FROM public.purchase_items
      WHERE purchase_id = _purchase_id AND product_id = (it->>'product_id')::uuid;
    IF v_item.product_id IS NULL THEN RAISE EXCEPTION 'That product was not part of this purchase'; END IF;
    v_bought := v_item.quantity;
    SELECT COALESCE(SUM(ri.quantity),0) INTO v_returned FROM public.purchase_return_items ri
      JOIN public.purchase_returns r ON r.id = ri.return_id
      WHERE r.purchase_id = _purchase_id AND r.status = 'active' AND ri.product_id = v_item.product_id;
    IF v_qty > (v_bought - v_returned) THEN
      RAISE EXCEPTION 'Cannot return more than was purchased (% remaining)', (v_bought - v_returned);
    END IF;
    IF COALESCE((SELECT stock_on_hand FROM public.product_stock WHERE product_id = v_item.product_id),0) < v_qty THEN
      RAISE EXCEPTION 'Not enough stock on hand to return';
    END IF;
    v_total := v_total + (v_qty * v_item.unit_cost);
  END LOOP;

  IF v_refund > v_total THEN RAISE EXCEPTION 'Refund cannot exceed the returned value'; END IF;
  IF v_refund > p.paid_amount THEN RAISE EXCEPTION 'Refund cannot exceed what was already paid'; END IF;
  IF v_refund > 0 AND _account_id IS NULL THEN RAISE EXCEPTION 'Choose the account receiving the refund'; END IF;

  INSERT INTO public.purchase_returns (purchase_id, supplier_id, return_date, total, refund_amount,
                                       refund_method, account_id, note, created_by)
  VALUES (_purchase_id, p.supplier_id, v_date, v_total, v_refund, _refund_method, _account_id, _note, auth.uid())
  RETURNING id INTO v_id;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_qty := (it->>'quantity')::numeric;
    SELECT product_id, unit_cost INTO v_item FROM public.purchase_items
      WHERE purchase_id = _purchase_id AND product_id = (it->>'product_id')::uuid;
    INSERT INTO public.purchase_return_items (return_id, product_id, quantity, unit_cost)
    VALUES (v_id, v_item.product_id, v_qty, v_item.unit_cost);

    INSERT INTO public.inventory_movements (product_id, movement_date, movement_type, quantity,
                                            unit_cost, reference, note, source_table, source_id, created_by)
    VALUES (v_item.product_id, v_date, 'return_out', v_qty, v_item.unit_cost, p.purchase_no,
            'Purchase return', 'purchase_returns', v_id, auth.uid());
  END LOOP;

  UPDATE public.purchases SET
    returned_total = returned_total + v_total,
    paid_amount = paid_amount - v_refund,
    payment_status = CASE
      WHEN (total - (returned_total + v_total) - (paid_amount - v_refund)) <= 0 THEN 'full_paid'
      WHEN (paid_amount - v_refund) > 0 THEN 'partial' ELSE 'full_debt' END
  WHERE id = _purchase_id;

  IF v_refund > 0 THEN
    INSERT INTO public.financial_transactions (txn_date, type, scope, category, description, amount,
                                               amount_paid, account_id, source_table, source_id, created_by)
    VALUES (v_date, 'income', 'business', 'purchase_return',
            'Refund on ' || p.purchase_no, v_refund, v_refund, _account_id,
            'purchase_returns', v_id, auth.uid());
  END IF;

  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.record_supplier_payment(
  _supplier_id uuid, _amount numeric, _account_id uuid,
  _payment_date date DEFAULT NULL, _method public.payment_method DEFAULT 'cash',
  _purchase_id uuid DEFAULT NULL, _reference text DEFAULT NULL, _note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_id uuid; v_left numeric(14,2); v_balance numeric(14,2); v_apply numeric(14,2); r record; v_date date;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Payment amount must be above zero'; END IF;
  IF _account_id IS NULL THEN RAISE EXCEPTION 'Choose the account paying the supplier'; END IF;
  v_date := COALESCE(_payment_date, CURRENT_DATE);

  SELECT balance INTO v_balance FROM public.supplier_balances WHERE supplier_id = _supplier_id;
  IF v_balance IS NULL THEN RAISE EXCEPTION 'Supplier not found'; END IF;
  IF _amount > v_balance THEN RAISE EXCEPTION 'Payment exceeds the outstanding balance (%)', v_balance; END IF;

  INSERT INTO public.supplier_payments (supplier_id, purchase_id, payment_date, amount, method,
                                        account_id, reference, note, created_by)
  VALUES (_supplier_id, _purchase_id, v_date, _amount, _method, _account_id, _reference, _note, auth.uid())
  RETURNING id INTO v_id;

  v_left := _amount;
  IF _purchase_id IS NOT NULL THEN
    SELECT id, balance INTO r FROM public.purchases WHERE id = _purchase_id AND status='active';
    IF r.id IS NOT NULL AND r.balance > 0 THEN
      v_apply := LEAST(v_left, r.balance);
      UPDATE public.purchases SET paid_amount = paid_amount + v_apply,
        payment_status = CASE WHEN (total - returned_total - (paid_amount + v_apply)) <= 0 THEN 'full_paid'
                              WHEN (paid_amount + v_apply) > 0 THEN 'partial' ELSE 'full_debt' END
      WHERE id = r.id;
      v_left := v_left - v_apply;
    END IF;
  END IF;

  FOR r IN SELECT id, balance FROM public.purchases
           WHERE supplier_id = _supplier_id AND status='active' AND balance > 0
           ORDER BY purchase_date, created_at LOOP
    EXIT WHEN v_left <= 0;
    v_apply := LEAST(v_left, r.balance);
    UPDATE public.purchases SET paid_amount = paid_amount + v_apply,
      payment_status = CASE WHEN (total - returned_total - (paid_amount + v_apply)) <= 0 THEN 'full_paid'
                            WHEN (paid_amount + v_apply) > 0 THEN 'partial' ELSE 'full_debt' END
    WHERE id = r.id;
    v_left := v_left - v_apply;
  END LOOP;

  INSERT INTO public.financial_transactions (txn_date, type, scope, category, description, amount,
                                             amount_paid, account_id, source_table, source_id, created_by)
  VALUES (v_date, 'expense', 'business', 'supplier_payment',
          COALESCE(_note, 'Supplier payment'), _amount, _amount, _account_id,
          'supplier_payments', v_id, auth.uid());

  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.record_expense(
  _amount numeric, _category text, _scope public.financial_scope DEFAULT 'business',
  _txn_date date DEFAULT NULL, _account_id uuid DEFAULT NULL,
  _description text DEFAULT NULL, _settles_rule_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_id uuid; v_date date;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Expense amount must be above zero'; END IF;
  IF _account_id IS NULL THEN RAISE EXCEPTION 'Choose the account paying this expense'; END IF;
  v_date := COALESCE(_txn_date, CURRENT_DATE);

  INSERT INTO public.financial_transactions (txn_date, type, scope, category, description, amount,
                                             amount_paid, account_id, settles_rule_id, created_by)
  VALUES (v_date, 'expense', _scope, COALESCE(_category,'other'), _description, _amount,
          _amount, _account_id, _settles_rule_id, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.record_income(
  _amount numeric, _category text, _scope public.financial_scope DEFAULT 'business',
  _txn_date date DEFAULT NULL, _account_id uuid DEFAULT NULL, _description text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_id uuid; v_date date;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Income amount must be above zero'; END IF;
  IF _account_id IS NULL THEN RAISE EXCEPTION 'Choose the account receiving this income'; END IF;
  v_date := COALESCE(_txn_date, CURRENT_DATE);

  INSERT INTO public.financial_transactions (txn_date, type, scope, category, description, amount,
                                             amount_paid, account_id, created_by)
  VALUES (v_date, 'income', _scope, COALESCE(_category,'other'), _description, _amount,
          _amount, _account_id, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.void_financial_transaction(_txn_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager')) THEN
    RAISE EXCEPTION 'Only managers can void a transaction';
  END IF;
  UPDATE public.financial_transactions
     SET status = 'void', voided_at = now(), voided_by = auth.uid(),
         description = COALESCE(description,'') || CASE WHEN _reason IS NULL THEN '' ELSE ' (void: ' || _reason || ')' END
   WHERE id = _txn_id AND status = 'active';
END; $$;

REVOKE EXECUTE ON FUNCTION public.create_purchase(date,uuid,jsonb,numeric,numeric,numeric,public.payment_method,uuid,text,text,boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_purchase_return(uuid,jsonb,date,numeric,public.payment_method,uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_supplier_payment(uuid,numeric,uuid,date,public.payment_method,uuid,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_expense(numeric,text,public.financial_scope,date,uuid,text,uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_income(numeric,text,public.financial_scope,date,uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.void_financial_transaction(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_purchase_number() FROM PUBLIC, anon;
