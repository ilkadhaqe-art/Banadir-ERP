/**
 * Phase 6 server functions: orders, deliveries, drivers, zones, cargo.
 *
 * Thin wrappers only — reads hit the Phase 6 read-model views, writes call the
 * atomic RPCs (create_order, convert_order_to_sale, create_delivery,
 * update_delivery_status, record_driver_handover) or update pure master-data
 * tables (zones, cargo companies, rates, drivers) that carry no money
 * invariants. Every function requires an authenticated session; RLS enforces
 * the role split in the database.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  CargoCompany,
  CargoCompanyInput,
  CargoRate,
  CargoRateInput,
  ConvertOrderInput,
  CreateDeliveryInput,
  CreateOrderInput,
  DeliveryCollection,
  DeliveryDetail,
  DeliveryOverview,
  DeliverySaleLink,
  DeliveryZone,
  DeliveryZoneInput,
  Driver,
  DriverBalance,
  DriverHandover,
  DriverInput,
  DriverPerformance,
  HandoverInput,
  OrderItemDetail,
  OrderOverview,
  UntypedDb,
} from "@/lib/logistics-types";

/** ---- Reads ---- */

export const listOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ status: z.string().optional(), limit: z.number().int().positive().optional() })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<OrderOverview[]> => {
    const s = context.supabase as unknown as UntypedDb;
    let q = s.from("orders_overview").select("*").order("created_at", { ascending: false });
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    q = q.limit(data.limit ?? 300);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as OrderOverview[];
  });

export const getOrderDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ order_id: z.string().uuid() }).parse(data))
  .handler(
    async ({ data, context }): Promise<{ order: OrderOverview; items: OrderItemDetail[] }> => {
      const s = context.supabase as unknown as UntypedDb;
      const { data: order, error: oErr } = await s
        .from("orders_overview")
        .select("*")
        .eq("id", data.order_id)
        .single();
      if (oErr) throw new Error(oErr.message);
      const { data: items, error: iErr } = await s
        .from("order_items")
        .select(
          "id, product_id, quantity, unit_price, unit_cost, line_total, products(name, sku, unit)",
        )
        .eq("order_id", data.order_id)
        .order("created_at", { ascending: true });
      if (iErr) throw new Error(iErr.message);
      return {
        order: order as OrderOverview,
        items: ((items ?? []) as Record<string, unknown>[]).map((r) => {
          const p = (r["products"] ?? {}) as {
            name?: string;
            sku?: string | null;
            unit?: string | null;
          };
          return {
            id: r["id"] as string,
            product_id: r["product_id"] as string,
            product_name: p.name ?? "—",
            sku: p.sku ?? null,
            unit: p.unit ?? null,
            quantity: Number(r["quantity"]),
            unit_price: Number(r["unit_price"]),
            unit_cost: Number(r["unit_cost"]),
            line_total: Number(r["line_total"]),
          } satisfies OrderItemDetail;
        }),
      };
    },
  );

export const listDeliveries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ status: z.string().optional(), limit: z.number().int().positive().optional() })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<DeliveryOverview[]> => {
    const s = context.supabase as unknown as UntypedDb;
    let q = s.from("deliveries_overview").select("*").order("created_at", { ascending: false });
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    q = q.limit(data.limit ?? 300);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as DeliveryOverview[];
  });

export const listDeliveryZones = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeliveryZone[]> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data, error } = await s
      .from("delivery_zones")
      .select("id, name, district, default_fee, active, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as DeliveryZone[];
  });

export const listCargoCompanies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CargoCompany[]> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data, error } = await s
      .from("cargo_companies")
      .select("id, name, phone, contact_person, notes, active")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as CargoCompany[];
  });

export const listCargoRates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CargoRate[]> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data, error } = await s
      .from("cargo_rates")
      .select(
        "id, company_id, zone_id, destination, rate, effective_from, effective_to, active, cargo_companies(name), delivery_zones(name)",
      )
      .order("effective_from", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r["id"] as string,
      company_id: r["company_id"] as string,
      company_name: ((r["cargo_companies"] ?? {}) as { name?: string }).name ?? null,
      zone_id: r["zone_id"] as string,
      zone_name: ((r["delivery_zones"] ?? {}) as { name?: string }).name ?? null,
      destination: (r["destination"] as string | null) ?? null,
      rate: Number(r["rate"]),
      effective_from: r["effective_from"] as string,
      effective_to: (r["effective_to"] as string | null) ?? null,
      active: Boolean(r["active"]),
    }));
  });

export const listDrivers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Driver[]> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data, error } = await s
      .from("drivers")
      .select("id, name, phone, company_id, vehicle_type, license_no, active, notes, created_at")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Driver[];
  });

export const listDriverBalances = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DriverBalance[]> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data, error } = await s
      .from("driver_balances")
      .select("*")
      .order("outstanding", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as DriverBalance[];
  });

export const listDriverPerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DriverPerformance[]> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data, error } = await s
      .from("driver_performance")
      .select("*")
      .order("deliveries_total", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as DriverPerformance[];
  });

export const listDriverHandovers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        driver_id: z.string().uuid().optional(),
        limit: z.number().int().positive().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<DriverHandover[]> => {
    const s = context.supabase as unknown as UntypedDb;
    let q = s
      .from("driver_handovers")
      .select(
        "id, driver_id, handover_date, amount, method, account_id, reference, note, status, created_at, drivers(name), payment_accounts(name)",
      )
      .order("created_at", { ascending: false });
    if (data.driver_id) q = q.eq("driver_id", data.driver_id);
    q = q.limit(data.limit ?? 100);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r["id"] as string,
      driver_id: r["driver_id"] as string,
      driver_name: ((r["drivers"] ?? {}) as { name?: string }).name ?? null,
      handover_date: r["handover_date"] as string,
      amount: Number(r["amount"]),
      method: r["method"] as string,
      account_id: (r["account_id"] as string | null) ?? null,
      account_name: ((r["payment_accounts"] ?? {}) as { name?: string }).name ?? null,
      reference: (r["reference"] as string | null) ?? null,
      note: (r["note"] as string | null) ?? null,
      status: r["status"] as "active" | "void",
      created_at: r["created_at"] as string,
    }));
  });

/** ---- Order writes (atomic RPCs) ---- */

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        order_date: z.string().min(4),
        customer_id: z.string().uuid().nullish(),
        items: z
          .array(
            z.object({
              product_id: z.string().uuid(),
              quantity: z.number().positive(),
              unit_price: z.number().min(0),
            }),
          )
          .min(1),
        discount: z.number().min(0).optional(),
        fulfillment: z.enum(["pickup", "delivery", "cargo"]),
        delivery_fee: z.number().min(0).optional(),
        zone_id: z.string().uuid().nullish(),
        cargo_company_id: z.string().uuid().nullish(),
        address: z.string().nullish(),
        note: z.string().nullish(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as UntypedDb;
    const input = data as CreateOrderInput;
    const { data: id, error } = await s.rpc("create_order", {
      _order_date: input.order_date,
      _customer_id: input.customer_id ?? null,
      _items: input.items,
      _discount: input.discount ?? 0,
      _fulfillment: input.fulfillment,
      _delivery_fee: input.delivery_fee ?? 0,
      _zone_id: input.zone_id ?? null,
      _cargo_company_id: input.cargo_company_id ?? null,
      _address: input.address ?? null,
      _note: input.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ order_id: z.string().uuid(), status: z.enum(["confirmed", "ready"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as UntypedDb;
    const { data: order, error: readErr } = await s
      .from("orders")
      .select("id, status, sale_id")
      .eq("id", data.order_id)
      .single();
    if (readErr) throw new Error(readErr.message);
    if (order.sale_id || order.status === "converted" || order.status === "cancelled") {
      throw new Error("This order can no longer change status");
    }
    const { error } = await s
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.order_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ order_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as UntypedDb;
    const { error } = await s.rpc("cancel_order", { _order_id: data.order_id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const convertOrderToSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        order_id: z.string().uuid(),
        paid_amount: z.number().min(0).optional(),
        payment_method: z.enum(["cash", "evc_plus", "edahab", "merchant", "bank"]),
        account_id: z.string().uuid().nullish(),
        sale_date: z.string().min(4).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as UntypedDb;
    const input = data as ConvertOrderInput;
    const { data: saleId, error } = await s.rpc("convert_order_to_sale", {
      _order_id: input.order_id,
      _paid_amount: input.paid_amount ?? 0,
      _payment_method: input.payment_method,
      _account_id: input.account_id ?? null,
      _sale_date: input.sale_date ?? null,
    });
    if (error) throw new Error(error.message);
    return { sale_id: saleId as string };
  });

/** ---- Delivery writes (atomic RPCs) ---- */

export const createDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        order_id: z.string().uuid().nullish(),
        sale_id: z.string().uuid().nullish(),
        driver_id: z.string().uuid().nullish(),
        zone_id: z.string().uuid().nullish(),
        cargo_company_id: z.string().uuid().nullish(),
        fee: z.number().min(0).optional(),
        cod_amount: z.number().min(0).optional(),
        recipient_name: z.string().nullish(),
        recipient_phone: z.string().nullish(),
        address: z.string().nullish(),
        note: z.string().nullish(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as UntypedDb;
    const input = data as CreateDeliveryInput;
    if (!input.order_id && !input.sale_id) {
      throw new Error("A delivery needs an order or a sale");
    }
    const { data: id, error } = await s.rpc("create_delivery", {
      _order_id: input.order_id ?? null,
      _sale_id: input.sale_id ?? null,
      _driver_id: input.driver_id ?? null,
      _zone_id: input.zone_id ?? null,
      _cargo_company_id: input.cargo_company_id ?? null,
      _fee: input.fee ?? 0,
      _cod_amount: input.cod_amount ?? 0,
      _recipient_name: input.recipient_name ?? null,
      _recipient_phone: input.recipient_phone ?? null,
      _address: input.address ?? null,
      _note: input.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const assignDeliveryDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ delivery_id: z.string().uuid(), driver_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as UntypedDb;
    const { data: row, error: readErr } = await s
      .from("deliveries")
      .select("id, status")
      .eq("id", data.delivery_id)
      .single();
    if (readErr) throw new Error(readErr.message);
    if (row.status === "delivered" || row.status === "failed" || row.status === "returned") {
      throw new Error("This delivery is already closed");
    }
    const { error } = await s
      .from("deliveries")
      .update({ driver_id: data.driver_id, status: "assigned" })
      .eq("id", data.delivery_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setDeliveryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        delivery_id: z.string().uuid(),
        status: z.enum(["assigned", "picked_up", "in_transit", "delivered", "failed", "returned"]),
        note: z.string().nullish(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as UntypedDb;
    const { error } = await s.rpc("update_delivery_status", {
      _delivery_id: data.delivery_id,
      _status: data.status,
      _note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** ---- Driver handover (atomic RPC) ---- */

export const recordDriverHandover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        driver_id: z.string().uuid(),
        amount: z.number().positive(),
        account_id: z.string().uuid(),
        method: z.enum(["cash", "evc_plus", "edahab", "merchant", "bank"]),
        handover_date: z.string().min(4),
        reference: z.string().nullish(),
        note: z.string().nullish(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as UntypedDb;
    const input = data as HandoverInput;
    const { data: id, error } = await s.rpc("record_driver_handover", {
      _driver_id: input.driver_id,
      _amount: input.amount,
      _account_id: input.account_id,
      _method: input.method,
      _handover_date: input.handover_date,
      _reference: input.reference ?? null,
      _note: input.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

/** ---- Master data (zones, cargo companies, rates, drivers) ---- */

export const saveDeliveryZone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        district: z.string().nullish(),
        default_fee: z.number().min(0).optional(),
        active: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as UntypedDb;
    const input = data as DeliveryZoneInput & { id?: string };
    const payload = {
      name: input.name.trim(),
      district: input.district?.trim() || null,
      default_fee: input.default_fee ?? 0,
      active: input.active ?? true,
    };
    const { error } = input.id
      ? await s.from("delivery_zones").update(payload).eq("id", input.id)
      : await s.from("delivery_zones").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveCargoCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        phone: z.string().nullish(),
        contact_person: z.string().nullish(),
        notes: z.string().nullish(),
        active: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as UntypedDb;
    const input = data as CargoCompanyInput & { id?: string };
    const payload = {
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      contact_person: input.contact_person?.trim() || null,
      notes: input.notes?.trim() || null,
      active: input.active ?? true,
    };
    const { error } = input.id
      ? await s.from("cargo_companies").update(payload).eq("id", input.id)
      : await s.from("cargo_companies").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveCargoRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        company_id: z.string().uuid(),
        zone_id: z.string().uuid(),
        destination: z.string().nullish(),
        rate: z.number().min(0),
        effective_from: z.string().min(4).optional(),
        active: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as UntypedDb;
    const input = data as CargoRateInput & { id?: string };
    const payload = {
      company_id: input.company_id,
      zone_id: input.zone_id,
      destination: input.destination?.trim() || null,
      rate: input.rate,
      active: input.active ?? true,
    };
    const { error } = input.id
      ? await s.from("cargo_rates").update(payload).eq("id", input.id)
      : await s
          .from("cargo_rates")
          .insert({ ...payload, effective_from: input.effective_from ?? undefined });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1),
        phone: z.string().nullish(),
        vehicle_type: z.string().optional(),
        license_no: z.string().nullish(),
        notes: z.string().nullish(),
        active: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as UntypedDb;
    const input = data as DriverInput & { id?: string };
    const payload = {
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      vehicle_type: input.vehicle_type || "motorcycle",
      license_no: input.license_no?.trim() || null,
      notes: input.notes?.trim() || null,
      active: input.active ?? true,
    };
    const { error } = input.id
      ? await s.from("drivers").update(payload).eq("id", input.id)
      : await s.from("drivers").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** ---- Delivery & Cargo operations center ---- */

export const getDeliveryDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ delivery_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<DeliveryDetail> => {
    const s = context.supabase as unknown as UntypedDb;

    const { data: delivery, error: dErr } = await s
      .from("deliveries_overview")
      .select("*")
      .eq("id", data.delivery_id)
      .single();
    if (dErr) throw new Error(dErr.message);
    const row = delivery as DeliveryOverview;

    let order: OrderOverview | null = null;
    let items: OrderItemDetail[] = [];
    if (row.order_id) {
      const { data: o } = await s
        .from("orders_overview")
        .select("*")
        .eq("id", row.order_id)
        .maybeSingle();
      order = (o as OrderOverview | null) ?? null;
      const { data: rawItems, error: iErr } = await s
        .from("order_items")
        .select(
          "id, product_id, quantity, unit_price, unit_cost, line_total, products(name, sku, unit)",
        )
        .eq("order_id", row.order_id)
        .order("created_at", { ascending: true });
      if (iErr) throw new Error(iErr.message);
      items = ((rawItems ?? []) as Record<string, unknown>[]).map((r) => {
        const p = (r["products"] ?? {}) as {
          name?: string;
          sku?: string | null;
          unit?: string | null;
        };
        return {
          id: r["id"] as string,
          product_id: r["product_id"] as string,
          product_name: p.name ?? "—",
          sku: p.sku ?? null,
          unit: p.unit ?? null,
          quantity: Number(r["quantity"]),
          unit_price: Number(r["unit_price"]),
          unit_cost: Number(r["unit_cost"]),
          line_total: Number(r["line_total"]),
        } satisfies OrderItemDetail;
      });
    }

    const saleId = row.sale_id ?? order?.sale_id ?? null;
    let sale: DeliverySaleLink | null = null;
    if (saleId) {
      const { data: sRow } = await s
        .from("sales_overview")
        .select(
          "id, sale_no, sale_date, total, paid_amount, returned_total, balance, payment_status, status",
        )
        .eq("id", saleId)
        .maybeSingle();
      if (sRow) {
        const r = sRow as Record<string, unknown>;
        sale = {
          id: r["id"] as string,
          sale_no: r["sale_no"] as string,
          sale_date: r["sale_date"] as string,
          total: Number(r["total"]),
          paid_amount: Number(r["paid_amount"]),
          returned_total: Number(r["returned_total"]),
          balance: Number(r["balance"]),
          payment_status: r["payment_status"] as string,
          status: r["status"] as string,
        };
      }
      if (!items.length) {
        const { data: sItems } = await s
          .from("sale_items")
          .select(
            "id, product_id, quantity, unit_price, unit_cost, line_total, products(name, sku, unit)",
          )
          .eq("sale_id", saleId);
        items = ((sItems ?? []) as Record<string, unknown>[]).map((r) => {
          const p = (r["products"] ?? {}) as {
            name?: string;
            sku?: string | null;
            unit?: string | null;
          };
          return {
            id: r["id"] as string,
            product_id: r["product_id"] as string,
            product_name: p.name ?? "—",
            sku: p.sku ?? null,
            unit: p.unit ?? null,
            quantity: Number(r["quantity"]),
            unit_price: Number(r["unit_price"]),
            unit_cost: Number(r["unit_cost"]),
            line_total: Number(r["line_total"]),
          } satisfies OrderItemDetail;
        });
      }
    }

    const customerId = row.customer_id ?? order?.customer_id ?? null;
    let customer: DeliveryDetail["customer"] = null;
    if (customerId) {
      const { data: cRow } = await s
        .from("customer_balances")
        .select("customer_id, name, phone, balance")
        .eq("customer_id", customerId)
        .maybeSingle();
      if (cRow) {
        const r = cRow as Record<string, unknown>;
        customer = {
          id: r["customer_id"] as string,
          name: r["name"] as string,
          phone: (r["phone"] as string | null) ?? null,
          balance: Number(r["balance"]),
        };
      }
    }

    let collections: DeliveryCollection[] = [];
    if (saleId) {
      const { data: pays, error: pErr } = await s
        .from("customer_payments")
        .select(
          "id, payment_date, amount, method, account_id, reference, note, created_at, payment_accounts(name)",
        )
        .eq("sale_id", saleId)
        .order("created_at", { ascending: true });
      if (pErr) throw new Error(pErr.message);
      collections = ((pays ?? []) as Record<string, unknown>[]).map((r) => ({
        id: r["id"] as string,
        payment_date: r["payment_date"] as string,
        amount: Number(r["amount"]),
        method: r["method"] as string,
        account_id: (r["account_id"] as string | null) ?? null,
        account_name: ((r["payment_accounts"] ?? {}) as { name?: string }).name ?? null,
        reference: (r["reference"] as string | null) ?? null,
        note: (r["note"] as string | null) ?? null,
        created_at: r["created_at"] as string,
      }));
    }

    let rateCard: CargoRate | null = null;
    if (row.zone_id && row.cargo_company_id) {
      const { data: rate } = await s
        .from("cargo_rates")
        .select(
          "id, company_id, zone_id, destination, rate, effective_from, effective_to, active, cargo_companies(name), delivery_zones(name)",
        )
        .eq("zone_id", row.zone_id)
        .eq("company_id", row.cargo_company_id)
        .eq("active", true)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (rate) {
        const r = rate as Record<string, unknown>;
        rateCard = {
          id: r["id"] as string,
          company_id: r["company_id"] as string,
          company_name: ((r["cargo_companies"] ?? {}) as { name?: string }).name ?? null,
          zone_id: r["zone_id"] as string,
          zone_name: ((r["delivery_zones"] ?? {}) as { name?: string }).name ?? null,
          destination: (r["destination"] as string | null) ?? null,
          rate: Number(r["rate"]),
          effective_from: r["effective_from"] as string,
          effective_to: (r["effective_to"] as string | null) ?? null,
          active: Boolean(r["active"]),
        };
      }
    }

    return { delivery: row, order, items, sale, customer, collections, rate_card: rateCard };
  });

export const collectDeliveryPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        delivery_id: z.string().uuid(),
        amount: z.number().positive(),
        method: z.enum(["cash", "evc_plus", "edahab", "merchant", "bank"]),
        account_id: z.string().uuid(),
        payment_date: z.string().min(4),
        reference: z.string().nullish(),
        note: z.string().nullish(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const s = context.supabase as unknown as UntypedDb;

    const { data: delivery, error: dErr } = await s
      .from("deliveries")
      .select("id, delivery_no, order_id, sale_id, status, cod_amount")
      .eq("id", data.delivery_id)
      .single();
    if (dErr) throw new Error(dErr.message);

    let saleId: string | null = (delivery.sale_id as string | null) ?? null;
    if (!saleId && delivery.order_id) {
      const { data: order, error: oErr } = await s
        .from("orders")
        .select("sale_id")
        .eq("id", delivery.order_id)
        .single();
      if (oErr) throw new Error(oErr.message);
      saleId = (order.sale_id as string | null) ?? null;
    }
    if (!saleId) {
      throw new Error(
        "This delivery has no sale yet — convert the order to a sale before collecting.",
      );
    }

    const { data: sale, error: sErr } = await s
      .from("sales")
      .select("id, customer_id, balance, status")
      .eq("id", saleId)
      .single();
    if (sErr) throw new Error(sErr.message);
    if (sale.status !== "active")
      throw new Error("This sale is voided — collection is not allowed.");
    if (!sale.customer_id) throw new Error("Walk-in sales have no receivable to collect.");
    const balance = Number(sale.balance);
    if (balance <= 0) throw new Error("This order is already fully collected.");
    if (data.amount > balance) {
      throw new Error(`Collection exceeds the outstanding balance (${balance}).`);
    }

    const { data: paymentId, error } = await s.rpc("record_collection", {
      _customer_id: sale.customer_id,
      _amount: data.amount,
      _payment_date: data.payment_date,
      _method: data.method,
      _account_id: data.account_id,
      _sale_id: saleId,
      _reference: data.reference ?? (delivery.delivery_no as string),
      _note: data.note ?? null,
    });
    if (error) throw new Error(error.message);

    if (data.amount >= balance) {
      const { error: upErr } = await s
        .from("deliveries")
        .update({ cod_collected: true })
        .eq("id", data.delivery_id);
      if (upErr) throw new Error(upErr.message);
    }

    return { id: paymentId as string, remaining: Number((balance - data.amount).toFixed(2)) };
  });
