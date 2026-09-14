import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  DeliveryCompany,
  DeliveryCompanyInput,
  DeliveryRate,
  DeliveryRateInput,
  FulfillmentEventInput,
  LocationInput,
  LocationRow,
  SaleStatement,
  SmartDefaults,
} from "@/lib/fulfillment-types";
import type { UntypedDb } from "@/lib/logistics-types";

/**
 * Locations, delivery companies, rate cards, tracking events, smart defaults
 * and the complete sale statement. Every rule lives in the database function
 * being called; this module only passes values through.
 */

export const listLocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LocationRow[]> => {
    const db = context.supabase as unknown as UntypedDb;
    const { data, error } = await db
      .from("locations")
      .select("id,name,level,parent_id,active,sort_order,notes")
      .order("level", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as LocationRow[];
  });

export const saveLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: LocationInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const db = context.supabase as unknown as UntypedDb;
    const patch = {
      name: data.name,
      level: data.level,
      parent_id: data.parent_id ?? null,
      active: data.active ?? true,
      sort_order: data.sort_order ?? 0,
      notes: data.notes ?? null,
    };
    if (data.id) {
      const { error } = await db.from("locations").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await db
      .from("locations")
      .insert({ ...patch, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const listDeliveryCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeliveryCompany[]> => {
    const db = context.supabase as unknown as UntypedDb;
    const { data, error } = await db
      .from("delivery_companies")
      .select("id,name,phone,contact_person,notes,active")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as DeliveryCompany[];
  });

export const saveDeliveryCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: DeliveryCompanyInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const db = context.supabase as unknown as UntypedDb;
    const patch = {
      name: data.name,
      phone: data.phone ?? null,
      contact_person: data.contact_person ?? null,
      notes: data.notes ?? null,
      active: data.active ?? true,
    };
    if (data.id) {
      const { error } = await db.from("delivery_companies").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await db
      .from("delivery_companies")
      .insert({ ...patch, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const listDeliveryRates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeliveryRate[]> => {
    const db = context.supabase as unknown as UntypedDb;
    const { data, error } = await db
      .from("delivery_rates")
      .select(
        "id,company_id,driver_id,location_id,rate,effective_from,effective_to,active," +
          "delivery_companies(name),drivers(name),locations(name)",
      )
      .order("effective_from", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Record<string, never>[]).map((row) => {
      const r = row as unknown as DeliveryRate & {
        delivery_companies: { name: string } | null;
        drivers: { name: string } | null;
        locations: { name: string } | null;
      };
      return {
        id: r.id,
        company_id: r.company_id,
        company_name: r.delivery_companies?.name ?? null,
        driver_id: r.driver_id,
        driver_name: r.drivers?.name ?? null,
        location_id: r.location_id,
        location_name: r.locations?.name ?? null,
        rate: Number(r.rate),
        effective_from: r.effective_from,
        effective_to: r.effective_to,
        active: r.active,
      };
    });
  });

export const saveDeliveryRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: DeliveryRateInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const db = context.supabase as unknown as UntypedDb;
    const patch = {
      company_id: data.company_id ?? null,
      driver_id: data.driver_id ?? null,
      location_id: data.location_id,
      rate: data.rate,
      effective_from: data.effective_from,
      effective_to: data.effective_to ?? null,
      active: data.active ?? true,
    };
    if (data.id) {
      const { error } = await db.from("delivery_rates").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await db
      .from("delivery_rates")
      .insert({ ...patch, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

/** Applicable rate for a company/driver and location on a date. */
export const lookupRate = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      kind: "delivery" | "cargo";
      location_id: string;
      company_id?: string | null;
      driver_id?: string | null;
      on?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<number | null> => {
    const db = context.supabase as unknown as UntypedDb;
    const { data: rate, error } =
      data.kind === "cargo"
        ? await db.rpc("lookup_cargo_rate", {
            _company_id: data.company_id ?? null,
            _location_id: data.location_id,
            _on: data.on ?? null,
          })
        : await db.rpc("lookup_delivery_rate", {
            _location_id: data.location_id,
            _company_id: data.company_id ?? null,
            _driver_id: data.driver_id ?? null,
            _on: data.on ?? null,
          });
    if (error) throw new Error(error.message);
    return rate === null || rate === undefined ? null : Number(rate);
  });

/** Most-used product, payment method, company, driver, district and region. */
export const getSmartDefaults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SmartDefaults> => {
    const db = context.supabase as unknown as UntypedDb;
    const { data, error } = await db.rpc("sales_smart_defaults");
    if (error) throw new Error(error.message);
    return data as SmartDefaults;
  });

/** Complete record of one sale: items, money, fulfilment, tracking, audit. */
export const getSaleStatement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sale_id: string }) => input)
  .handler(async ({ data, context }): Promise<SaleStatement | null> => {
    const db = context.supabase as unknown as UntypedDb;
    const { data: row, error } = await db.rpc("sale_statement", { _sale_id: data.sale_id });
    if (error) throw new Error(error.message);
    if (!row) return null;
    // Audit snapshots are free-form JSON; keep them as text across the wire.
    const audit = ((row.audit ?? []) as Record<string, unknown>[]).map((entry) => ({
      action: String(entry["action"] ?? ""),
      entity_table: String(entry["entity_table"] ?? ""),
      created_at: String(entry["created_at"] ?? ""),
      actor: (entry["actor"] as string | null) ?? null,
      reason: (entry["reason"] as string | null) ?? null,
      old_value: entry["old_value"] ? JSON.stringify(entry["old_value"]) : null,
      new_value: entry["new_value"] ? JSON.stringify(entry["new_value"]) : null,
    }));
    return { ...(row as SaleStatement), audit };
  });

/** Tracking update; any money collected is applied by the database. */
export const recordFulfillmentEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: FulfillmentEventInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const db = context.supabase as unknown as UntypedDb;
    const { data: id, error } = await db.rpc("record_fulfillment_event", {
      _sale_id: data.sale_id,
      _status: data.status,
      _driver_id: data.driver_id ?? null,
      _amount_collected: data.amount_collected ?? 0,
      _account_id: data.account_id ?? null,
      _method: data.method ?? "cash",
      _note: data.note ?? null,
      _occurred_at: data.occurred_at ?? null,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });
