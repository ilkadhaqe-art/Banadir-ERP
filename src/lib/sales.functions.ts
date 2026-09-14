import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { UntypedDb } from "@/lib/logistics-types";
import type {
  AccountBalance,
  AccountTransfer,
  CollectionInput,
  CreateReturnInput,
  CreateSaleInput,
  Customer,
  CustomerBalance,
  CustomerInput,
  CustomerPayment,
  PaymentAccount,
  PaymentChannel,
  SaleItemWithReturns,
  SaleOverview,
  SalesReturn,
  StatementEntry,
  TransferInput,
  UpdateSaleInput,
} from "@/lib/sales-types";

/**
 * Phase 5 data access. Reads come from the canonical tables and read-model
 * views; every write calls the atomic database function that owns the rule set
 * (stock, credit limits, over-return / over-refund guards, financial engine
 * rebuild). No business rule is re-implemented here.
 */

/** ---- Reads ---- */

export const listSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (
      input:
        | {
            from?: string;
            to?: string;
            customer_id?: string;
            payment_status?: string;
            limit?: number;
          }
        | undefined,
    ) => input ?? {},
  )
  .handler(async ({ data, context }): Promise<SaleOverview[]> => {
    let query = context.supabase
      .from("sales_overview")
      .select("*")
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 500));
    if (data.from) query = query.gte("sale_date", data.from);
    if (data.to) query = query.lte("sale_date", data.to);
    if (data.customer_id) query = query.eq("customer_id", data.customer_id);
    if (data.payment_status) query = query.eq("payment_status", data.payment_status as never);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as SaleOverview[];
  });

/** Sale lines with the database-derived remaining returnable quantity. */
/** One sale row from the read model — used by the receipt. */
export const getSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sale_id: string }) => input)
  .handler(async ({ data, context }): Promise<SaleOverview | null> => {
    const { data: row, error } = await context.supabase
      .from("sales_overview")
      .select("*")
      .eq("id", data.sale_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row ?? null) as unknown as SaleOverview | null;
  });

export const listSaleItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sale_id: string }) => input)
  .handler(async ({ data, context }): Promise<SaleItemWithReturns[]> => {
    const [items, returned] = await Promise.all([
      context.supabase
        .from("sale_items")
        .select("id,sale_id,product_id,quantity,unit_price,unit_cost,line_total,products(name)")
        .eq("sale_id", data.sale_id),
      context.supabase
        .from("sales_return_items")
        .select("product_id,quantity,sales_returns!inner(sale_id,status)")
        .eq("sales_returns.sale_id", data.sale_id)
        .eq("sales_returns.status", "active"),
    ]);
    if (items.error) throw new Error(items.error.message);
    if (returned.error) throw new Error(returned.error.message);

    const returnedByProduct = new Map<string, number>();
    for (const row of (returned.data ?? []) as { product_id: string; quantity: number }[]) {
      returnedByProduct.set(
        row.product_id,
        (returnedByProduct.get(row.product_id) ?? 0) + Number(row.quantity),
      );
    }

    return (
      (items.data ?? []) as unknown as (SaleItemWithReturns & {
        products: { name: string } | null;
      })[]
    ).map((row) => {
      const returnedQty = returnedByProduct.get(row.product_id) ?? 0;
      return {
        id: row.id,
        sale_id: row.sale_id,
        product_id: row.product_id,
        quantity: Number(row.quantity),
        unit_price: Number(row.unit_price),
        unit_cost: Number(row.unit_cost),
        line_total: Number(row.line_total),
        product_name: row.products?.name ?? "Product",
        returned_quantity: returnedQty,
        returnable_quantity: Number(row.quantity) - returnedQty,
      };
    });
  });

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Customer[]> => {
    const { data, error } = await context.supabase
      .from("customers")
      .select("id,name,phone,email,address,credit_limit,notes,active,created_at")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Customer[];
  });

/** Receivables truth from the customer_balances view. */
export const listCustomerBalances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CustomerBalance[]> => {
    const { data, error } = await context.supabase
      .from("customer_balances")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as CustomerBalance[];
  });

/** Ledger with SQL-computed running balance. */
export const getCustomerStatement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { customer_id: string }) => input)
  .handler(async ({ data, context }): Promise<StatementEntry[]> => {
    const { data: rows, error } = await context.supabase.rpc("customer_statement", {
      _customer_id: data.customer_id,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as StatementEntry[];
  });

export const listCollections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { customer_id?: string; limit?: number } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<CustomerPayment[]> => {
    let query = context.supabase
      .from("customer_payments")
      .select(
        "id,customer_id,sale_id,payment_date,amount,method,account_id,reference,note,status,created_at",
      )
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 500));
    if (data.customer_id) query = query.eq("customer_id", data.customer_id);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as CustomerPayment[];
  });

export const listSalesReturns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sale_id?: string; limit?: number } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<SalesReturn[]> => {
    let query = context.supabase
      .from("sales_returns")
      .select(
        "id,sale_id,customer_id,return_date,total,cogs,refund_amount,refund_method,account_id,restock,note,status,created_at",
      )
      .order("return_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 500));
    if (data.sale_id) query = query.eq("sale_id", data.sale_id);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as SalesReturn[];
  });

export const listPaymentAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PaymentAccount[]> => {
    const { data, error } = await context.supabase
      .from("payment_accounts")
      .select("id,name,kind,scope,opening_balance,active,sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as PaymentAccount[];
  });

/** Grouped payment channels (wallets / merchants / banks) from the database. */
export const listPaymentChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PaymentChannel[]> => {
    const s = context.supabase as unknown as UntypedDb;
    const { data, error } = await s
      .from("payment_channels")
      .select("id,name,group_name,method,requires_bank_name,is_default,sort_order,active")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as PaymentChannel[];
  });

/** Preview of the next S00001-style reference; the field stays editable. */
export const peekNextSaleNo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ sale_no: string }> => {
    const { data, error } = await context.supabase
      .from("sales")
      .select("sale_no")
      .like("sale_no", "S%")
      .order("sale_no", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    const last = data?.[0]?.sale_no ?? "";
    const digits = Number(last.replace(/[^0-9]/g, "")) || 0;
    return { sale_no: `S${String(digits + 1).padStart(5, "0")}` };
  });

/** Canonical account balances from the account_balances view. */
export const listAccountBalances = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountBalance[]> => {
    const { data, error } = await context.supabase
      .from("account_balances")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as AccountBalance[];
  });

export const listAccountTransfers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<AccountTransfer[]> => {
    const { data: rows, error } = await context.supabase
      .from("account_transfers")
      .select("id,transfer_date,from_account_id,to_account_id,amount,note,status,created_at")
      .order("transfer_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 100, 500));
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as AccountTransfer[];
  });

/** ---- Mutations: every one delegates to the atomic database authority ---- */

/** Every fulfilment, VAT and advance rule is decided inside create_sale(). */
function saleArgs(data: CreateSaleInput) {
  return {
    _sale_date: data.sale_date,
    _items: data.items as unknown as never,
    _discount: data.discount ?? 0,
    _paid_amount: data.paid_amount ?? 0,
    _payment_method: data.payment_method,
    // Walk-in sales legitimately have no customer; SQL accepts NULL here.
    _customer_id: (data.customer_id ?? null) as unknown as string,
    _account_id: data.account_id ?? null,
    _note: data.note ?? null,
    _vat_rate: data.vat_rate ?? 0,
    _advance_amount: data.advance_amount ?? 0,
    _fulfillment: data.fulfillment ?? "pickup",
    _delivery_fee: data.delivery_fee ?? 0,
    _cargo_fee: data.cargo_fee ?? 0,
    _recipient_name: data.recipient_name ?? null,
    _recipient_phone: data.recipient_phone ?? null,
    _address: data.address ?? null,
    _location_id: data.location_id ?? null,
    _region_id: data.region_id ?? null,
    _delivery_company_id: data.delivery_company_id ?? null,
    _driver_id: data.driver_id ?? null,
    _cargo_company_id: data.cargo_company_id ?? null,
    _sale_time: data.sale_time ?? null,
  } as unknown as never;
}

async function applyExtras(
  supabase: unknown,
  saleId: string,
  data: CreateSaleInput,
): Promise<void> {
  if (!data.sale_no && !data.payment_channel_id && !data.bank_name) return;
  const { error } = await (supabase as UntypedDb).rpc("set_sale_extras", {
    _sale_id: saleId,
    _sale_no: data.sale_no ?? null,
    _payment_channel_id: data.payment_channel_id ?? null,
    _bank_name: data.bank_name ?? null,
  });
  if (error) throw new Error(error.message);
}

export const createSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateSaleInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: id, error } = await context.supabase.rpc("create_sale", saleArgs(data));
    if (error) throw new Error(error.message);
    const saleId = id as unknown as string;
    await applyExtras(context.supabase, saleId, data);
    return { id: saleId };
  });

/** Edits re-post the sale and rebuild the engine from the earliest date. */
export const updateSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UpdateSaleInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { sale_id, ...rest } = data;
    const { error } = await (context.supabase as unknown as UntypedDb).rpc("update_sale", {
      _sale_id: sale_id,
      ...(saleArgs(rest) as unknown as Record<string, unknown>),
    });
    if (error) throw new Error(error.message);
    await applyExtras(context.supabase, sale_id, rest);
    return { id: sale_id };
  });

export const reverseSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sale_id: string; reason?: string | null }) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { error } = await (context.supabase as unknown as UntypedDb).rpc("reverse_sale", {
      _sale_id: data.sale_id,
      _reason: data.reason ?? null,
    });
    if (error) throw new Error(error.message);
    return { id: data.sale_id };
  });

export const recordCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CollectionInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: id, error } = await context.supabase.rpc("record_collection", {
      _customer_id: data.customer_id,
      _amount: data.amount,
      _payment_date: data.payment_date,
      _method: data.method,
      _account_id: data.account_id,
      ...(data.sale_id ? { _sale_id: data.sale_id } : {}),
      ...(data.reference ? { _reference: data.reference } : {}),
      ...(data.note ? { _note: data.note } : {}),
    });
    if (error) throw new Error(error.message);
    return { id: id as unknown as string };
  });

export const createSaleReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateReturnInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: id, error } = await context.supabase.rpc("create_sale_return", {
      _sale_id: data.sale_id,
      _items: data.items as unknown as never,
      _return_date: data.return_date,
      _restock: data.restock,
      _refund_amount: data.refund_amount ?? 0,
      ...(data.refund_method ? { _refund_method: data.refund_method } : {}),
      ...(data.account_id ? { _account_id: data.account_id } : {}),
      ...(data.note ? { _note: data.note } : {}),
    });
    if (error) throw new Error(error.message);
    return { id: id as unknown as string };
  });

export const createAccountTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: TransferInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: id, error } = await context.supabase.rpc("create_account_transfer", {
      _from_account_id: data.from_account_id,
      _to_account_id: data.to_account_id,
      _amount: data.amount,
      _transfer_date: data.transfer_date,
      ...(data.note ? { _note: data.note } : {}),
    });
    if (error) throw new Error(error.message);
    return { id: id as unknown as string };
  });

export const createCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CustomerInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: row, error } = await context.supabase
      .from("customers")
      .insert({
        name: data.name,
        phone: data.phone ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
        credit_limit: data.credit_limit ?? 0,
        notes: data.notes ?? null,
        active: data.active ?? true,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<CustomerInput> & { id: string }) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("customers").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { id };
  });
