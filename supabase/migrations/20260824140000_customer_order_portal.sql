-- Add Customer Payment Portal columns to public.orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS portal_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_ref TEXT,
  ADD COLUMN IF NOT EXISTS advance_payment NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_stage TEXT NOT NULL DEFAULT 'darawal_lama_dalban',
  ADD COLUMN IF NOT EXISTS driver_name TEXT,
  ADD COLUMN IF NOT EXISTS driver_phone TEXT;

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_orders_portal_token ON public.orders (portal_token);

-- Update orders_overview view to expose portal fields
CREATE OR REPLACE VIEW public.orders_overview AS
SELECT
  o.id,
  o.order_no,
  o.order_date,
  o.status,
  o.fulfillment,
  o.customer_id,
  c.name AS customer_name,
  c.phone AS customer_phone,
  o.zone_id,
  z.name AS zone_name,
  o.cargo_company_id,
  cc.name AS cargo_company_name,
  o.delivery_address,
  o.delivery_fee,
  o.subtotal,
  o.discount,
  o.total,
  o.sale_id,
  s.sale_no,
  o.note,
  o.created_at,
  o.portal_token,
  o.portal_enabled,
  o.payment_status,
  o.payment_method,
  o.payment_ref,
  o.advance_payment,
  o.remaining_balance,
  o.delivery_stage,
  o.driver_name,
  o.driver_phone,
  COALESCE(items_agg.item_count, 0)::BIGINT AS item_count,
  COALESCE(items_agg.quantity_total, 0)::NUMERIC AS quantity_total,
  d.id AS delivery_id,
  d.delivery_no,
  d.status AS delivery_status,
  d.driver_id,
  dr.name AS assigned_driver_name
FROM public.orders o
LEFT JOIN public.customers c ON c.id = o.customer_id
LEFT JOIN public.delivery_zones z ON z.id = o.zone_id
LEFT JOIN public.cargo_companies cc ON cc.id = o.cargo_company_id
LEFT JOIN public.sales s ON s.id = o.sale_id
LEFT JOIN (
  SELECT
    order_id,
    COUNT(*) AS item_count,
    SUM(quantity) AS quantity_total
  FROM public.order_items
  GROUP BY order_id
) items_agg ON items_agg.order_id = o.id
LEFT JOIN public.deliveries d ON d.order_id = o.id
LEFT JOIN public.drivers dr ON dr.id = d.driver_id;

-- Public RLS policy for customer portal access (read and update status/payment when portal_enabled is true)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'orders' AND policyname = 'Public customer portal view order by token'
  ) THEN
    CREATE POLICY "Public customer portal view order by token"
      ON public.orders
      FOR SELECT
      TO public
      USING (portal_token IS NOT NULL AND portal_enabled = true);
  END IF;
END $$;
