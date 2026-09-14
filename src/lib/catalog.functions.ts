/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Catalog and Inventory functions — connected to the real Banadir Online FOS engine.
 */

import { createRpcFn } from "@/lib/rpc-client";
import type {
  CreateBrandInput,
  CreateCategoryInput,
  CreateMovementInput,
  CreateProductInput,
  InventoryMovementRow,
  PriceHistoryRow,
  ProductBrand,
  ProductCategory,
  ProductStockRow,
  UpdateProductInput,
} from "@/lib/catalog-types";

export const listProducts = createRpcFn<
  { category_id?: string; brand_id?: string; active_only?: boolean },
  ProductStockRow[]
>("listProducts");

export const listProductStock = createRpcFn<void, ProductStockRow[]>("listProducts");

export const listCategories = createRpcFn<void, ProductCategory[]>("listCategories");

export const listBrands = createRpcFn<void, ProductBrand[]>("listBrands");

export const listPriceHistory = createRpcFn<{ product_id: string }, PriceHistoryRow[]>(
  "listPriceHistory",
);

export const listMovements = createRpcFn<
  { product_id?: string; limit?: number },
  InventoryMovementRow[]
>("listInventoryMovements");

export const createProduct = createRpcFn<CreateProductInput, any>("saveProduct");

export const updateProduct = createRpcFn<UpdateProductInput, any>("saveProduct");

export const deleteProduct = createRpcFn<{ id: string }, any>("deleteProduct");

export const createCategory = createRpcFn<CreateCategoryInput, any>("saveCategory");

export const createBrand = createRpcFn<CreateBrandInput, any>("saveBrand");

export const createMovement = createRpcFn<CreateMovementInput, any>("adjustInventory");

export const deleteMovement = createRpcFn<{ id: string }, any>("deleteMovement");
