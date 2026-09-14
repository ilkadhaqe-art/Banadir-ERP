-- ============ 1. Sale reference format S00001 ============
CREATE OR REPLACE FUNCTION public.next_sale_number()
RETURNS text LANGUAGE sql SET search_path TO 'public' AS $$
  SELECT 'S' || lpad(nextval('public.sale_number_seq')::text, 5, '0');
$$;

-- ============ 2. Canonical location dataset ============
DO $$ BEGIN
  CREATE TYPE public.location_level AS ENUM ('district','region');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  level public.location_level NOT NULL DEFAULT 'district',
  parent_id uuid REFERENCES public.locations(id),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "locations readable" ON public.locations;
CREATE POLICY "locations readable" ON public.locations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "locations managed" ON public.locations;
CREATE POLICY "locations managed" ON public.locations FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));
DROP TRIGGER IF EXISTS trg_locations_updated ON public.locations;
CREATE TRIGGER trg_locations_updated BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.locations (id, name, level, active, sort_order)
SELECT z.id, z.name, 'district', z.active, z.sort_order FROM public.delivery_zones z
ON CONFLICT (id) DO NOTHING;

-- ============ 3. Delivery companies + rates ============
CREATE TABLE IF NOT EXISTS public.delivery_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  contact_person text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_companies TO authenticated;
GRANT ALL ON public.delivery_companies TO service_role;
ALTER TABLE public.delivery_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "delivery companies readable" ON public.delivery_companies;
CREATE POLICY "delivery companies readable" ON public.delivery_companies FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "delivery companies managed" ON public.delivery_companies;
CREATE POLICY "delivery companies managed" ON public.delivery_companies FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));
DROP TRIGGER IF EXISTS trg_delivery_companies_updated ON public.delivery_companies;
CREATE TRIGGER trg_delivery_companies_updated BEFORE UPDATE ON public.delivery_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.delivery_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.delivery_companies(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id),
  rate numeric(14,2) NOT NULL DEFAULT 0,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_rates TO authenticated;
GRANT ALL ON public.delivery_rates TO service_role;
ALTER TABLE public.delivery_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "delivery rates readable" ON public.delivery_rates;
CREATE POLICY "delivery rates readable" ON public.delivery_rates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "delivery rates managed" ON public.delivery_rates;
CREATE POLICY "delivery rates managed" ON public.delivery_rates FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'manager'));
DROP TRIGGER IF EXISTS trg_delivery_rates_updated ON public.delivery_rates;
CREATE TRIGGER trg_delivery_rates_updated BEFORE UPDATE ON public.delivery_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.cargo_rates ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id);
ALTER TABLE public.cargo_rates ALTER COLUMN zone_id DROP NOT NULL;
UPDATE public.cargo_rates SET location_id = zone_id WHERE location_id IS NULL;

-- ============ 4. Independent drivers ============
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS company_phone text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.delivery_companies(id);

-- ============ 5. Sale columns ============
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS sale_time timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS vat_rate numeric(6,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fulfillment public.fulfillment_type NOT NULL DEFAULT 'pickup',
  ADD COLUMN IF NOT EXISTS delivery_fee numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cargo_fee numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_paid numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recipient_name text,
  ADD COLUMN IF NOT EXISTS recipient_phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id),
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES public.locations(id),
  ADD COLUMN IF NOT EXISTS delivery_company_id uuid REFERENCES public.delivery_companies(id),
  ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES public.drivers(id),
  ADD COLUMN IF NOT EXISTS cargo_company_id uuid REFERENCES public.cargo_companies(id),
  ADD COLUMN IF NOT EXISTS updated_by uuid;

ALTER TABLE public.sales DROP COLUMN IF EXISTS fee_balance;
ALTER TABLE public.sales
  ADD COLUMN fee_balance numeric(14,2)
  GENERATED ALWAYS AS ((delivery_fee + cargo_fee) - fee_paid) STORED;

-- ============ 6. Fulfilment tracking events ============
CREATE TABLE IF NOT EXISTS public.fulfillment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
  delivery_id uuid REFERENCES public.deliveries(id) ON DELETE SET NULL,
  kind public.fulfillment_type NOT NULL DEFAULT 'delivery',
  status text NOT NULL,
  driver_id uuid REFERENCES public.drivers(id),
  amount_collected numeric(14,2) NOT NULL DEFAULT 0,
  note text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fulfillment_events_sale ON public.fulfillment_events(sale_id, occurred_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fulfillment_events TO authenticated;
GRANT ALL ON public.fulfillment_events TO service_role;
ALTER TABLE public.fulfillment_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fulfillment events readable" ON public.fulfillment_events;
CREATE POLICY "fulfillment events readable" ON public.fulfillment_events FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "fulfillment events writable" ON public.fulfillment_events;
CREATE POLICY "fulfillment events writable" ON public.fulfillment_events FOR ALL TO authenticated
  USING (public.can_sell(auth.uid()) OR public.has_role(auth.uid(),'driver'))
  WITH CHECK (public.can_sell(auth.uid()) OR public.has_role(auth.uid(),'driver'));

-- ============ 7. VAT setting ============
INSERT INTO public.app_settings (key, value, description)
VALUES ('merchant_vat_rate','0.05','VAT applied automatically to merchant payments')
ON CONFLICT (key) DO NOTHING;

-- ============ 8. Audit coverage ============
DROP TRIGGER IF EXISTS trg_audit_sales ON public.sales;
CREATE TRIGGER trg_audit_sales AFTER INSERT OR UPDATE OR DELETE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
DROP TRIGGER IF EXISTS trg_audit_deliveries ON public.deliveries;
CREATE TRIGGER trg_audit_deliveries AFTER INSERT OR UPDATE OR DELETE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
DROP TRIGGER IF EXISTS trg_audit_fulfillment_events ON public.fulfillment_events;
CREATE TRIGGER trg_audit_fulfillment_events AFTER INSERT OR UPDATE OR DELETE ON public.fulfillment_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
DROP TRIGGER IF EXISTS trg_audit_delivery_rates ON public.delivery_rates;
CREATE TRIGGER trg_audit_delivery_rates AFTER INSERT OR UPDATE OR DELETE ON public.delivery_rates
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
DROP TRIGGER IF EXISTS trg_audit_cargo_rates ON public.cargo_rates;
CREATE TRIGGER trg_audit_cargo_rates AFTER INSERT OR UPDATE OR DELETE ON public.cargo_rates
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
DROP TRIGGER IF EXISTS trg_audit_customer_payments ON public.customer_payments;
CREATE TRIGGER trg_audit_customer_payments AFTER INSERT OR UPDATE OR DELETE ON public.customer_payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
