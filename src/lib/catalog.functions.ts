import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  InventoryMovement,
  MovementInput,
  PriceHistoryEntry,
  Product,
  ProductBrand,
  ProductCategory,
  ProductInput,
  ProductStock,
} from "@/lib/catalog-types";

export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Product[]> => {
    const { data, error } = await context.supabase
      .from("products")
      .select(
        "id,name,sku,barcode,category_id,brand_id,unit,cost_price,sell_price,reorder_level,opening_stock,image_url,notes,active,created_at",
      )
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Product[];
  });

/** Stock on hand / value / low-stock flag, derived by the database view. */
export const listProductStock = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProductStock[]> => {
    const { data, error } = await context.supabase
      .from("product_stock")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ProductStock[];
  });

export const listCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProductCategory[]> => {
    const { data, error } = await context.supabase
      .from("product_categories")
      .select("id,name,description,active,sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ProductCategory[];
  });

export const listBrands = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProductBrand[]> => {
    const { data, error } = await context.supabase
      .from("product_brands")
      .select("id,name,description,active")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ProductBrand[];
  });

export const listPriceHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { product_id: string }) => input)
  .handler(async ({ data, context }): Promise<PriceHistoryEntry[]> => {
    const { data: rows, error } = await context.supabase
      .from("product_price_history")
      .select("id,product_id,cost_price,sell_price,effective_from,note,created_at")
      .eq("product_id", data.product_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as PriceHistoryEntry[];
  });

export const listMovements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { product_id?: string; type?: string; limit?: number } | undefined) => input ?? {},
  )
  .handler(async ({ data, context }): Promise<InventoryMovement[]> => {
    let query = context.supabase
      .from("inventory_movements")
      .select(
        "id,product_id,movement_date,movement_type,quantity,unit_cost,reference,note,created_at",
      )
      .order("movement_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 500));
    if (data.product_id) query = query.eq("product_id", data.product_id);
    if (data.type) query = query.eq("movement_type", data.type as never);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as InventoryMovement[];
  });

/** ---- Mutations ---- */

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ProductInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: row, error } = await context.supabase
      .from("products")
      .insert({
        name: data.name,
        sku: data.sku,
        barcode: data.barcode ?? null,
        category_id: data.category_id ?? null,
        brand_id: data.brand_id ?? null,
        unit: data.unit ?? "pcs",
        cost_price: data.cost_price,
        sell_price: data.sell_price,
        reorder_level: data.reorder_level ?? 0,
        opening_stock: data.opening_stock ?? 0,
        image_url: data.image_url ?? null,
        notes: data.notes ?? null,
        active: data.active ?? true,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<ProductInput> & { id: string }) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("products").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { id };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { error } = await context.supabase
      .from("products")
      .update({ active: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

export const createCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; description?: string | null }) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: row, error } = await context.supabase
      .from("product_categories")
      .insert({
        name: data.name,
        description: data.description ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const createBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; description?: string | null }) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: row, error } = await context.supabase
      .from("product_brands")
      .insert({
        name: data.name,
        description: data.description ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

/** Stock movements: adjustments, damage, loss, purchases-in, returns. */
export const createMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: MovementInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: row, error } = await context.supabase
      .from("inventory_movements")
      .insert({
        product_id: data.product_id,
        movement_date: data.movement_date,
        movement_type: data.movement_type,
        quantity: Math.abs(data.quantity),
        unit_cost: data.unit_cost ?? 0,
        reference: data.reference ?? null,
        note: data.note ?? null,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { error } = await context.supabase.from("inventory_movements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });
