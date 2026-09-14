CREATE OR REPLACE VIEW public.driver_balances AS
 SELECT dr.id AS driver_id,
    dr.name,
    dr.phone,
    dr.vehicle_type,
    dr.active,
    COALESCE(dl.cod_total, 0::numeric)::numeric(14,2) AS cod_total,
    COALESCE(ev.collected, 0::numeric)::numeric(14,2) AS cod_collected,
    COALESCE(h.handed_over, 0::numeric)::numeric(14,2) AS handed_over,
    (COALESCE(ev.collected, 0::numeric) - COALESCE(h.handed_over, 0::numeric))::numeric(14,2) AS outstanding
   FROM public.drivers dr
     LEFT JOIN LATERAL ( SELECT sum(d.cod_amount) AS cod_total
           FROM public.deliveries d
          WHERE d.driver_id = dr.id AND d.status NOT IN ('failed'::delivery_status,'returned'::delivery_status)) dl ON true
     LEFT JOIN LATERAL ( SELECT sum(e.amount_collected) AS collected
           FROM public.fulfillment_events e
          WHERE e.driver_id = dr.id) ev ON true
     LEFT JOIN LATERAL ( SELECT sum(hh.amount) AS handed_over
           FROM public.driver_handovers hh
          WHERE hh.driver_id = dr.id AND hh.status = 'active'::txn_status) h ON true;