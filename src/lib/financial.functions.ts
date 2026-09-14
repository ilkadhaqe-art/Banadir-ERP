import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  DailyState,
  FinancialRule,
  FinancialSnapshot,
  FinancialTransaction,
  ObligationSummary,
} from "@/lib/financial-types";

/** Canonical engine snapshot — the single source every screen reads. */
export const getFinancialSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { date?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<FinancialSnapshot> => {
    const { data: snapshot, error } = await context.supabase.rpc(
      "financial_snapshot",
      data.date ? { _date: data.date } : {},
    );

    if (error) throw new Error(error.message);
    return snapshot as unknown as FinancialSnapshot;
  });

/** The daily chain (12 Aug onward) used by trend, target and audit views. */
export const listDailyStates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { from?: string; to?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<DailyState[]> => {
    let query = context.supabase
      .from("daily_financial_states")
      .select("*")
      .order("day", { ascending: true });
    if (data.from) query = query.gte("day", data.from);
    if (data.to) query = query.lte("day", data.to);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as DailyState[];
  });

/** Effective-dated rules (obligations + guaranteed income). */
export const listFinancialRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FinancialRule[]> => {
    const { data, error } = await context.supabase
      .from("financial_rules")
      .select(
        "id,name,scope,kind,category,amount,frequency,skip_friday,effective_from,effective_to,active,notes",
      )
      .order("kind", { ascending: true })
      .order("scope", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as FinancialRule[];
  });

/** Obligation roll-up for a given date, derived from the rules in force. */
export const getObligationSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { date?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<ObligationSummary> => {
    const day = data.date ?? new Date().toISOString().slice(0, 10);
    const { data: rows, error } = await context.supabase
      .from("financial_rules")
      .select("scope,kind,amount,frequency,skip_friday,effective_from,effective_to,active")
      .eq("active", true)
      .eq("kind", "obligation")
      .lte("effective_from", day);
    if (error) throw new Error(error.message);

    const isFriday = new Date(`${day}T00:00:00Z`).getUTCDay() === 5;
    const active = (rows ?? []).filter((r) => !r.effective_to || r.effective_to >= day);
    const sum = (fn: (r: (typeof active)[number]) => boolean) =>
      active.filter(fn).reduce((acc, r) => acc + Number(r.amount), 0);

    const business_daily = sum(
      (r) => r.frequency === "daily" && r.scope === "business" && !(isFriday && r.skip_friday),
    );
    const personal_daily = sum(
      (r) => r.frequency === "daily" && r.scope === "personal" && !(isFriday && r.skip_friday),
    );
    const friday_extra = isFriday ? sum((r) => r.frequency === "friday") : 0;
    const business_monthly = sum((r) => r.frequency === "monthly" && r.scope === "business");
    const personal_monthly = sum((r) => r.frequency === "monthly" && r.scope === "personal");

    return {
      business_daily,
      personal_daily,
      friday_extra,
      business_monthly,
      personal_monthly,
      total_daily: business_daily + personal_daily + friday_extra,
      total_monthly: business_monthly + personal_monthly,
    };
  });

/** Recent canonical facts feeding the engine. */
export const listFinancialTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { from?: string; to?: string; type?: string; limit?: number } | undefined) =>
      input ?? {},
  )
  .handler(async ({ data, context }): Promise<FinancialTransaction[]> => {
    let query = context.supabase
      .from("financial_transactions")
      .select(
        "id,txn_date,type,scope,category,description,amount,cogs,amount_paid,account_id,settles_rule_id,status,created_at",
      )
      .eq("status", "active")
      .order("txn_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 100, 500));
    if (data.from) query = query.gte("txn_date", data.from);
    if (data.to) query = query.lte("txn_date", data.to);
    if (data.type) query = query.eq("type", data.type as never);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as FinancialTransaction[];
  });

/** ---- Mutations: every write lands in the canonical tables so the DB engine rebuilds. ---- */

export type TransactionInput = {
  txn_date: string;
  type: "sale" | "expense" | "income" | "collection" | "capital" | "adjustment";
  scope: "business" | "personal";
  category?: string | null;
  description?: string | null;
  amount: number;
  cogs?: number;
  amount_paid?: number;
  account_id?: string | null;
  settles_rule_id?: string | null;
};

export const createTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: TransactionInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: row, error } = await context.supabase
      .from("financial_transactions")
      .insert({
        txn_date: data.txn_date,
        type: data.type,
        scope: data.scope,
        category: data.category ?? null,
        description: data.description ?? null,
        amount: data.amount,
        cogs: data.cogs ?? 0,
        amount_paid: data.amount_paid ?? 0,
        account_id: data.account_id ?? null,
        settles_rule_id: data.settles_rule_id ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<TransactionInput> & { id: string }) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("financial_transactions")
      .update(patch)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { id };
  });

/** Reversal keeps history: the row is marked void and the engine rebuilds from its date. */
export const voidTransaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { error } = await context.supabase
      .from("financial_transactions")
      .update({ status: "void", voided_at: new Date().toISOString(), voided_by: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

/** ---- Financial rule writes (obligations + guaranteed income). ----
 * Rules are canonical inputs to the engine: the financial_rule_rebuild()
 * trigger recomputes the daily chain from the earliest affected date, so no
 * client-side recalculation is ever required.
 */
export type FinancialRuleInput = {
  name: string;
  scope: "business" | "personal";
  kind: "obligation" | "guaranteed_income";
  category?: string | null;
  amount: number;
  frequency: "daily" | "friday" | "weekly" | "monthly" | "yearly";
  skip_friday?: boolean;
  effective_from: string;
  effective_to?: string | null;
  active?: boolean;
  notes?: string | null;
};

export const createFinancialRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: FinancialRuleInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: row, error } = await context.supabase
      .from("financial_rules")
      .insert({
        name: data.name,
        scope: data.scope,
        kind: data.kind,
        category: data.category ?? null,
        amount: data.amount,
        frequency: data.frequency,
        skip_friday: data.skip_friday ?? false,
        effective_from: data.effective_from,
        effective_to: data.effective_to ?? null,
        active: data.active ?? true,
        notes: data.notes ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateFinancialRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<FinancialRuleInput> & { id: string }) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("financial_rules").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { id };
  });

/** Rules are never deleted — they are end-dated / deactivated so history stays intact. */
export const setFinancialRuleActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; active: boolean; effective_to?: string | null }) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const patch: { active: boolean; effective_to?: string | null } = { active: data.active };
    if (data.effective_to !== undefined) patch.effective_to = data.effective_to;
    const { error } = await context.supabase
      .from("financial_rules")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });
