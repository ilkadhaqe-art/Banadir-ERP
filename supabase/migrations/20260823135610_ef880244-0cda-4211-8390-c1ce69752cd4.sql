CREATE TABLE IF NOT EXISTS public.payment_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  group_name text NOT NULL,
  method payment_method NOT NULL,
  requires_bank_name boolean NOT NULL DEFAULT false,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_name, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_channels TO authenticated;
GRANT ALL ON public.payment_channels TO service_role;

ALTER TABLE public.payment_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_channels_read" ON public.payment_channels;
CREATE POLICY "payment_channels_read" ON public.payment_channels
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "payment_channels_write" ON public.payment_channels;
CREATE POLICY "payment_channels_write" ON public.payment_channels
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS payment_channels_updated_at ON public.payment_channels;
CREATE TRIGGER payment_channels_updated_at BEFORE UPDATE ON public.payment_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.payment_channels (name, group_name, method, requires_bank_name, is_default, sort_order) VALUES
  ('Cash', 'Cash', 'cash', false, false, 0),
  ('EVC Plus', 'Wallets', 'evc_plus', false, true, 10),
  ('Premier Wallet', 'Wallets', 'evc_plus', false, false, 11),
  ('Ebessa', 'Wallets', 'edahab', false, false, 12),
  ('Hormuud', 'Merchants', 'merchant', false, false, 20),
  ('Somtel', 'Merchants', 'merchant', false, false, 21),
  ('MyCash', 'Merchants', 'merchant', false, false, 22),
  ('Premier Bank', 'Merchants', 'merchant', false, false, 23),
  ('Salaam Somali Bank', 'Banks', 'bank', false, false, 30),
  ('Premier Bank', 'Banks', 'bank', false, false, 31),
  ('MyBank', 'Banks', 'bank', false, false, 32),
  ('IBS', 'Banks', 'bank', false, false, 33),
  ('SomBank', 'Banks', 'bank', false, false, 34),
  ('Amal Bank', 'Banks', 'bank', false, false, 35),
  ('Amaana Bank', 'Banks', 'bank', false, false, 36),
  ('Other Banks', 'Banks', 'bank', true, false, 99)
ON CONFLICT (group_name, name) DO NOTHING;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS payment_channel_id uuid REFERENCES public.payment_channels(id),
  ADD COLUMN IF NOT EXISTS bank_name text;

CREATE UNIQUE INDEX IF NOT EXISTS sales_sale_no_key ON public.sales (sale_no);

CREATE OR REPLACE FUNCTION public.set_sale_extras(
  _sale_id uuid,
  _sale_no text DEFAULT NULL,
  _payment_channel_id uuid DEFAULT NULL,
  _bank_name text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.sales
     SET sale_no = COALESCE(NULLIF(btrim(_sale_no), ''), sale_no),
         payment_channel_id = _payment_channel_id,
         bank_name = NULLIF(btrim(COALESCE(_bank_name, '')), ''),
         updated_at = now()
   WHERE id = _sale_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Ref NO % is already used by another sale.', _sale_no;
END;
$$;

CREATE OR REPLACE VIEW public.sales_overview AS
 SELECT s.id,
    s.sale_no,
    s.sale_date,
    s.sale_time,
    s.customer_id,
    c.name AS customer_name,
    c.phone AS customer_phone,
    s.subtotal,
    s.discount,
    s.vat_rate,
    s.vat_amount,
    s.total,
    s.paid_amount,
    s.advance_amount,
    s.returned_total,
    s.balance,
    s.delivery_fee,
    s.cargo_fee,
    s.fee_paid,
    s.fee_balance,
    s.fulfillment,
    s.recipient_name,
    s.recipient_phone,
    s.address,
    s.location_id,
    loc.name AS location_name,
    s.region_id,
    reg.name AS region_name,
    s.delivery_company_id,
    dc.name AS delivery_company_name,
    s.driver_id,
    dr.name AS driver_name,
    dr.phone AS driver_phone,
    s.cargo_company_id,
    cc.name AS cargo_company_name,
    s.payment_method,
    s.payment_status,
    s.account_id,
    pa.name AS account_name,
    s.status,
    s.note,
    s.created_at,
    d.status AS delivery_status,
    d.id AS delivery_id,
    d.delivery_no,
    d.delivered_at,
    COALESCE(i.item_count, 0::bigint) AS item_count,
    COALESCE(i.quantity_total, 0::numeric) AS quantity_total,
    COALESCE(i.cogs_total, 0::numeric) AS cogs_total,
    s.total - COALESCE(i.cogs_total, 0::numeric) AS gross_profit,
    s.payment_channel_id,
    pch.name AS payment_channel_name,
    s.bank_name,
    c.address AS customer_address
   FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     LEFT JOIN payment_accounts pa ON pa.id = s.account_id
     LEFT JOIN payment_channels pch ON pch.id = s.payment_channel_id
     LEFT JOIN locations loc ON loc.id = s.location_id
     LEFT JOIN locations reg ON reg.id = s.region_id
     LEFT JOIN delivery_companies dc ON dc.id = s.delivery_company_id
     LEFT JOIN drivers dr ON dr.id = s.driver_id
     LEFT JOIN cargo_companies cc ON cc.id = s.cargo_company_id
     LEFT JOIN LATERAL ( SELECT dd.id, dd.delivery_no, dd.status, dd.delivered_at
           FROM deliveries dd
          WHERE dd.sale_id = s.id
          ORDER BY dd.created_at DESC
         LIMIT 1) d ON true
     LEFT JOIN ( SELECT sale_items.sale_id,
            count(*) AS item_count,
            sum(sale_items.quantity) AS quantity_total,
            sum(sale_items.quantity * sale_items.unit_cost) AS cogs_total
           FROM sale_items
          GROUP BY sale_items.sale_id) i ON i.sale_id = s.id;

GRANT SELECT ON public.sales_overview TO authenticated;
GRANT ALL ON public.sales_overview TO service_role;

INSERT INTO public.app_settings (key, value, description) VALUES
  ('receipt_business_name', 'Banadir Online', 'Business name printed on receipts'),
  ('receipt_tagline', 'Your trusted online shop', 'Tagline under the business name'),
  ('receipt_logo_url', '', 'Logo image URL shown on receipts'),
  ('receipt_phone', '', 'Phone number printed on receipts'),
  ('receipt_whatsapp', '', 'WhatsApp number used to send receipts'),
  ('receipt_address', '', 'Address printed on receipts'),
  ('receipt_email', '', 'Email printed on receipts'),
  ('receipt_header', 'RECEIPT', 'Header text on the receipt'),
  ('receipt_footer', 'THANK YOU FOR YOUR PURCHASE!', 'Footer text on the receipt'),
  ('receipt_notes', 'We appreciate your trust in us. Please come again.', 'Notes under the footer'),
  ('receipt_terms', '', 'Terms printed at the bottom of the receipt'),
  ('receipt_payment_info', '', 'Payment information printed on the receipt')
ON CONFLICT (key) DO NOTHING;