/**
 * Phase 8 server functions: reporting views, audit trail, app settings and the
 * business_overview rollup. Reads only — nothing is recomputed in React.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  AccountBalanceReportRow,
  AppSetting,
  AuditLogRow,
  BusinessOverview,
  CustomerSalesReportRow,
  InventoryValuationRow,
  MoneyReportRow,
  ProductSalesReportRow,
  ProfitLossRow,
  SalesDailyReportRow,
  UntypedDb,
} from "@/lib/reports-types";

const rangeSchema = z
  .object({ from: z.string().optional(), to: z.string().optional() })
  .default({});

export const getBusinessOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => rangeSchema.parse(data ?? {}))
  .handler(async ({ data, context }): Promise<BusinessOverview> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data: row, error } = await s.rpc("business_overview", {
      _from: data.from ?? null,
      _to: data.to ?? null,
    });
    if (error) throw new Error(error.message);
    return row as BusinessOverview;
  });

export const listSalesDailyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => rangeSchema.parse(data ?? {}))
  .handler(async ({ data, context }): Promise<SalesDailyReportRow[]> => {
    const s = context.supabase as unknown as UntypedDb;
    let q = s.from("sales_daily_report").select("*").order("day", { ascending: false });
    if (data.from) q = q.gte("day", data.from);
    if (data.to) q = q.lte("day", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as SalesDailyReportRow[];
  });

export const listProductSalesReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProductSalesReportRow[]> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data, error } = await s
      .from("product_sales_report")
      .select("*")
      .order("revenue", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ProductSalesReportRow[];
  });

export const listCustomerSalesReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CustomerSalesReportRow[]> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data, error } = await s
      .from("customer_sales_report")
      .select("*")
      .order("sales_total", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as CustomerSalesReportRow[];
  });

export const listMoneyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        kind: z.enum(["expense", "income"]),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<MoneyReportRow[]> => {
    const s = context.supabase as unknown as UntypedDb;
    let q = s
      .from(data.kind === "expense" ? "expense_report" : "income_report")
      .select("*")
      .order("day", { ascending: false });
    if (data.from) q = q.gte("day", data.from);
    if (data.to) q = q.lte("day", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as MoneyReportRow[];
  });

export const listInventoryValuation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InventoryValuationRow[]> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data, error } = await s
      .from("inventory_valuation_report")
      .select("*")
      .order("stock_value", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as InventoryValuationRow[];
  });

export const listAccountBalancesReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountBalanceReportRow[]> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data, error } = await s
      .from("account_balances_report")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as AccountBalanceReportRow[];
  });

export const listProfitLoss = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => rangeSchema.parse(data ?? {}))
  .handler(async ({ data, context }): Promise<ProfitLossRow[]> => {
    const s = context.supabase as unknown as UntypedDb;
    let q = s.from("profit_loss_report").select("*").order("day", { ascending: false });
    if (data.from) q = q.gte("day", data.from);
    if (data.to) q = q.lte("day", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as ProfitLossRow[];
  });

/** Audit trail — RLS on financial_audit_log keeps this admin-only. */
export const listAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ limit: z.number().int().positive().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<AuditLogRow[]> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data: rows, error } = await s
      .from("audit_log_view")
      .select("id,created_at,action,entity_table,entity_id,affected_date,actor,actor_name,reason")
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 500));
    if (error) throw new Error(error.message);
    return (rows ?? []) as AuditLogRow[];
  });

export const listAppSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AppSetting[]> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data, error } = await s
      .from("app_settings")
      .select("key,value,description,updated_at")
      .order("key", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as AppSetting[];
  });

/** Admin-only through the app_settings RLS policy. */
export const saveAppSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ key: z.string().min(1), value: z.string() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ key: string }> => {
    const s = context.supabase as unknown as UntypedDb;
    const { error } = await s
      .from("app_settings")
      .update({ value: data.value, updated_by: context.userId })
      .eq("key", data.key);
    if (error) throw new Error(error.message);
    return { key: data.key };
  });

/** Owner-only factory reset. The database function enforces the role and the confirmation word. */
export const factoryReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ confirm: z.string().min(1), include_masters: z.boolean().optional() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; include_masters: boolean }> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data: result, error } = await s.rpc("factory_reset", {
      _confirm: data.confirm,
      _include_masters: data.include_masters ?? false,
    });
    if (error) throw new Error(error.message);
    return result as { ok: boolean; include_masters: boolean };
  });
