CREATE TYPE public.stock_movement_type AS ENUM ('opening','purchase','sale','return_in','return_out','adjustment','damage','loss','transfer');

CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY pc_select ON public.product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY pc_write ON public.product_categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));

CREATE TABLE public.product_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_brands TO authenticated;
GRANT ALL ON public.product_brands TO service_role;
ALTER TABLE public.product_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY pb_select ON public.product_brands FOR SELECT TO authenticated USING (true);
CREATE POLICY pb_write ON public.product_brands FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text NOT NULL UNIQUE,
  barcode text UNIQUE,
  category_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
  brand_id uuid REFERENCES public.product_brands(id) ON DELETE SET NULL,
  unit text NOT NULL DEFAULT 'pcs',
  cost_price numeric(14,2) NOT NULL DEFAULT 0,
  sell_price numeric(14,2) NOT NULL DEFAULT 0,
  reorder_level numeric(14,2) NOT NULL DEFAULT 0,
  opening_stock numeric(14,2) NOT NULL DEFAULT 0,
  image_url text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON public.products(category_id);
CREATE INDEX products_brand_idx ON public.products(brand_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_select ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY p_write ON public.products FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));

CREATE TABLE public.product_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  cost_price numeric(14,2) NOT NULL,
  sell_price numeric(14,2) NOT NULL,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  changed_by uuid REFERENCES auth.users,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pph_product_idx ON public.product_price_history(product_id, effective_from DESC);
GRANT SELECT ON public.product_price_history TO authenticated;
GRANT ALL ON public.product_price_history TO service_role;
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY pph_select ON public.product_price_history FOR SELECT TO authenticated USING (true);

CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  movement_type public.stock_movement_type NOT NULL,
  quantity numeric(14,2) NOT NULL,
  unit_cost numeric(14,2) NOT NULL DEFAULT 0,
  reference text,
  note text,
  source_table text,
  source_id uuid,
  created_by uuid REFERENCES auth.users,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX im_product_idx ON public.inventory_movements(product_id, movement_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY im_select ON public.inventory_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY im_write ON public.inventory_movements FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));

CREATE TRIGGER product_categories_updated_at BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER product_brands_updated_at BEFORE UPDATE ON public.product_brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.product_price_history_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.product_price_history (product_id, cost_price, sell_price, changed_by, note)
    VALUES (NEW.id, NEW.cost_price, NEW.sell_price, NEW.created_by, 'initial price');
    IF NEW.opening_stock <> 0 THEN
      INSERT INTO public.inventory_movements (product_id, movement_type, quantity, unit_cost, note, created_by)
      VALUES (NEW.id, 'opening', NEW.opening_stock, NEW.cost_price, 'opening stock', NEW.created_by);
    END IF;
  ELSIF NEW.cost_price IS DISTINCT FROM OLD.cost_price OR NEW.sell_price IS DISTINCT FROM OLD.sell_price THEN
    INSERT INTO public.product_price_history (product_id, cost_price, sell_price, changed_by, note)
    VALUES (NEW.id, NEW.cost_price, NEW.sell_price, auth.uid(), 'price change');
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER products_price_history AFTER INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.product_price_history_log();

CREATE VIEW public.product_stock
WITH (security_invoker = true) AS
SELECT
  p.id AS product_id,
  p.name,
  p.sku,
  p.barcode,
  p.unit,
  p.category_id,
  p.brand_id,
  p.cost_price,
  p.sell_price,
  p.reorder_level,
  p.active,
  COALESCE(SUM(
    CASE WHEN m.movement_type IN ('sale','damage','loss','return_out','transfer')
      THEN -ABS(m.quantity) ELSE ABS(m.quantity) END
  ), 0)::numeric(14,2) AS stock_on_hand,
  (COALESCE(SUM(
    CASE WHEN m.movement_type IN ('sale','damage','loss','return_out','transfer')
      THEN -ABS(m.quantity) ELSE ABS(m.quantity) END
  ), 0) * p.cost_price)::numeric(14,2) AS stock_value,
  (COALESCE(SUM(
    CASE WHEN m.movement_type IN ('sale','damage','loss','return_out','transfer')
      THEN -ABS(m.quantity) ELSE ABS(m.quantity) END
  ), 0) <= p.reorder_level) AS is_low_stock
FROM public.products p
LEFT JOIN public.inventory_movements m ON m.product_id = p.id
GROUP BY p.id;

GRANT SELECT ON public.product_stock TO authenticated;
GRANT SELECT ON public.product_stock TO service_role;
REVOKE ALL ON FUNCTION public.product_price_history_log() FROM PUBLIC, anon, authenticated;