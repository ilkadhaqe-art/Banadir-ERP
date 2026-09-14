/**
 * Phase 7 server functions: suppliers, purchases, purchase returns, supplier
 * payments, expenses and other income.
 *
 * Thin wrappers only — reads hit the Phase 7 read-model views, writes call the
 * atomic RPCs (create_purchase, create_purchase_return,
 * record_supplier_payment, record_expense, record_income,
 * void_financial_transaction) that own every money and stock rule.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  CreatePurchaseInput,
  ExpenseCategory,
  LedgerEntry,
  MoneyEntryInput,
  PurchaseItemDetail,
  PurchaseOverview,
  PurchaseReturnInput,
  Supplier,
  SupplierBalance,
  SupplierInput,
  SupplierPayment,
  SupplierPaymentInput,
  UntypedDb,
} from "@/lib/procurement-types";

/** ---- Reads ---- */

export const listSuppliers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Supplier[]> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data, error } = await s
      .from("suppliers")
      .select("id,name,phone,email,address,contact_person,opening_balance,notes,active,created_at")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Supplier[];
  });

/** Payables truth from the supplier_balances view. */
export const listSupplierBalances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SupplierBalance[]> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data, error } = await s
      .from("supplier_balances")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as SupplierBalance[];
  });

export const listPurchases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        from: z.string().optional(),
        to: z.string().optional(),
        supplier_id: z.string().optional(),
        payment_status: z.string().optional(),
        limit: z.number().int().positive().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<PurchaseOverview[]> => {
    const s = context.supabase as unknown as UntypedDb;
    let q = s
      .from("purchases_overview")
      .select("*")
      .order("purchase_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (data.from) q = q.gte("purchase_date", data.from);
    if (data.to) q = q.lte("purchase_date", data.to);
    if (data.supplier_id) q = q.eq("supplier_id", data.supplier_id);
    if (data.payment_status && data.payment_status !== "all")
      q = q.eq("payment_status", data.payment_status);
    q = q.limit(Math.min(data.limit ?? 200, 500));
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as PurchaseOverview[];
  });

/** Purchase lines with the remaining returnable quantity computed in SQL reads. */
export const listPurchaseItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ purchase_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<PurchaseItemDetail[]> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data: rows, error } = await s
      .from("purchase_items")
      .select("id,product_id,quantity,unit_cost,line_total,products(name,sku,unit)")
      .eq("purchase_id", data.purchase_id);
    if (error) throw new Error(error.message);
    return (
      (rows ?? []) as {
        id: string;
        product_id: string;
        quantity: number;
        unit_cost: number;
        line_total: number;
        products: { name: string; sku: string | null; unit: string | null } | null;
      }[]
    ).map((row) => ({
      id: row.id,
      product_id: row.product_id,
      product_name: row.products?.name ?? "Product",
      sku: row.products?.sku ?? null,
      unit: row.products?.unit ?? null,
      quantity: Number(row.quantity),
      unit_cost: Number(row.unit_cost),
      line_total: Number(row.line_total),
    }));
  });

export const listSupplierPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        supplier_id: z.string().optional(),
        limit: z.number().int().positive().optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<SupplierPayment[]> => {
    const s = context.supabase as unknown as UntypedDb;
    let q = s
      .from("supplier_payments")
      .select(
        "id,supplier_id,purchase_id,payment_date,amount,method,account_id,reference,note,status,created_at,suppliers(name),payment_accounts(name)",
      )
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (data.supplier_id) q = q.eq("supplier_id", data.supplier_id);
    q = q.limit(Math.min(data.limit ?? 200, 500));
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (
      (rows ?? []) as (SupplierPayment & {
        suppliers: { name: string } | null;
        payment_accounts: { name: string } | null;
      })[]
    ).map((row) => ({
      id: row.id,
      supplier_id: row.supplier_id,
      supplier_name: row.suppliers?.name ?? null,
      purchase_id: row.purchase_id,
      payment_date: row.payment_date,
      amount: Number(row.amount),
      method: row.method,
      account_id: row.account_id,
      account_name: row.payment_accounts?.name ?? null,
      reference: row.reference,
      note: row.note,
      status: row.status,
      created_at: row.created_at,
    }));
  });

export const listExpenseCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ExpenseCategory[]> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data, error } = await s
      .from("expense_categories")
      .select("id,name,scope,kind,active,sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as ExpenseCategory[];
  });

/** Money ledger for the Expenses / Income screens (canonical transactions). */
export const listMoneyLedger = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        type: z.enum(["expense", "income"]),
        scope: z.enum(["business", "personal", "all"]).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().positive().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<LedgerEntry[]> => {
    const s = context.supabase as unknown as UntypedDb;
    let q = s
      .from("financial_transactions")
      .select(
        "id,txn_date,type,scope,category,description,amount,account_id,status,created_at,payment_accounts(name)",
      )
      .eq("type", data.type)
      .order("txn_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (data.scope && data.scope !== "all") q = q.eq("scope", data.scope);
    if (data.from) q = q.gte("txn_date", data.from);
    if (data.to) q = q.lte("txn_date", data.to);
    q = q.limit(Math.min(data.limit ?? 300, 500));
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (
      (rows ?? []) as (LedgerEntry & {
        payment_accounts: { name: string } | null;
      })[]
    ).map((row) => ({
      id: row.id,
      txn_date: row.txn_date,
      type: row.type,
      scope: row.scope,
      category: row.category,
      description: row.description,
      amount: Number(row.amount),
      account_id: row.account_id,
      account_name: row.payment_accounts?.name ?? null,
      status: row.status,
      created_at: row.created_at,
    }));
  });

/** ---- Mutations: every one delegates to the database authority ---- */

export const createSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SupplierInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data: row, error } = await s
      .from("suppliers")
      .insert({
        name: data.name,
        phone: data.phone ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
        contact_person: data.contact_person ?? null,
        opening_balance: data.opening_balance ?? 0,
        notes: data.notes ?? null,
        active: data.active ?? true,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string }).id };
  });

export const updateSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<SupplierInput> & { id: string }) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const s = context.supabase as unknown as UntypedDb;
    const { id, ...patch } = data;
    const { error } = await s.from("suppliers").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { id };
  });

export const createPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreatePurchaseInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data: id, error } = await s.rpc("create_purchase", {
      _purchase_date: data.purchase_date,
      _supplier_id: data.supplier_id ?? null,
      _items: data.items,
      _discount: data.discount ?? 0,
      _extra_cost: data.extra_cost ?? 0,
      _paid_amount: data.paid_amount ?? 0,
      _payment_method: data.payment_method,
      _account_id: data.account_id ?? null,
      _invoice_no: data.invoice_no ?? null,
      _note: data.note ?? null,
      _update_cost: data.update_cost ?? true,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const createPurchaseReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: PurchaseReturnInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data: id, error } = await s.rpc("create_purchase_return", {
      _purchase_id: data.purchase_id,
      _items: data.items,
      _return_date: data.return_date ?? null,
      _refund_amount: data.refund_amount ?? 0,
      _refund_method: data.refund_method ?? null,
      _account_id: data.account_id ?? null,
      _note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const recordSupplierPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SupplierPaymentInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data: id, error } = await s.rpc("record_supplier_payment", {
      _supplier_id: data.supplier_id,
      _amount: data.amount,
      _account_id: data.account_id,
      _payment_date: data.payment_date,
      _method: data.method,
      _purchase_id: data.purchase_id ?? null,
      _reference: data.reference ?? null,
      _note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const recordExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: MoneyEntryInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data: id, error } = await s.rpc("record_expense", {
      _amount: data.amount,
      _category: data.category,
      _scope: data.scope,
      _txn_date: data.txn_date,
      _account_id: data.account_id,
      _description: data.description ?? null,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const recordIncome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: MoneyEntryInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data: id, error } = await s.rpc("record_income", {
      _amount: data.amount,
      _category: data.category,
      _scope: data.scope,
      _txn_date: data.txn_date,
      _account_id: data.account_id,
      _description: data.description ?? null,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

/** Reversal stays in the database: the row is voided and the engine rebuilds. */
export const voidMoneyEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), reason: z.string().optional() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const s = context.supabase as unknown as UntypedDb;
    const { error } = await s.rpc("void_financial_transaction", {
      _txn_id: data.id,
      _reason: data.reason ?? null,
    });
    if (error) throw new Error(error.message);
    return { id: data.id };
  });
