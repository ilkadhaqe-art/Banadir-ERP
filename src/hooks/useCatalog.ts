import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  createBrand,
  createCategory,
  createMovement,
  createProduct,
  deleteProduct,
  listBrands,
  listCategories,
  listMovements,
  listPriceHistory,
  listProductStock,
  listProducts,
  updateProduct,
} from "@/lib/catalog.functions";
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

/**
 * Catalog & inventory reads. All business truth (stock on hand, low stock,
 * price history) is produced by the database — these hooks only cache it.
 */

const STALE = 30_000;

function mutationError(error: Error) {
  const message = /row-level security/i.test(error.message)
    ? "You do not have permission to perform this action. Ask an admin or manager for access."
    : error.message;
  toast.error(message);
}

export function useProducts() {
  const fn = useServerFn(listProducts);
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => fn(),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

/** Canonical stock state from the product_stock view. Never recomputed here. */
export function useProductStock() {
  const fn = useServerFn(listProductStock);
  return useQuery<ProductStock[]>({
    queryKey: ["product-stock"],
    queryFn: () => fn(),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useCategories() {
  const fn = useServerFn(listCategories);
  return useQuery<ProductCategory[]>({
    queryKey: ["product-categories"],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useBrands() {
  const fn = useServerFn(listBrands);
  return useQuery<ProductBrand[]>({
    queryKey: ["product-brands"],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}

export function usePriceHistory(productId: string | null) {
  const fn = useServerFn(listPriceHistory);
  return useQuery<PriceHistoryEntry[]>({
    queryKey: ["product-price-history", productId],
    queryFn: () => fn({ data: { product_id: productId as string } }),
    enabled: Boolean(productId),
    staleTime: STALE,
  });
}

export function useMovements(params?: { product_id?: string; type?: string; limit?: number }) {
  const fn = useServerFn(listMovements);
  return useQuery<InventoryMovement[]>({
    queryKey: ["inventory-movements", params ?? null],
    queryFn: () => fn({ data: params ?? {} }),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

/** ---- Mutations ---- */

function useCatalogInvalidation() {
  const queryClient = useQueryClient();
  return async (opts?: { stock?: boolean; prices?: boolean }) => {
    await queryClient.invalidateQueries({ queryKey: ["products"] });
    if (opts?.stock !== false) {
      await queryClient.invalidateQueries({ queryKey: ["product-stock"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-movements"] });
    }
    if (opts?.prices !== false) {
      await queryClient.invalidateQueries({ queryKey: ["product-price-history"] });
    }
  };
}

export function useCreateProduct() {
  const fn = useServerFn(createProduct);
  const invalidate = useCatalogInvalidation();
  return useMutation({
    mutationFn: (input: ProductInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Product created");
    },
    onError: mutationError,
  });
}

export function useUpdateProduct() {
  const fn = useServerFn(updateProduct);
  const invalidate = useCatalogInvalidation();
  return useMutation({
    mutationFn: (input: Partial<ProductInput> & { id: string }) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Product updated");
    },
    onError: mutationError,
  });
}

export function useDeactivateProduct() {
  const fn = useServerFn(deleteProduct);
  const invalidate = useCatalogInvalidation();
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Product deactivated");
    },
    onError: mutationError,
  });
}

export function useCreateCategory() {
  const fn = useServerFn(createCategory);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string | null }) => fn({ data: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Category created");
    },
    onError: mutationError,
  });
}

export function useCreateBrand() {
  const fn = useServerFn(createBrand);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string | null }) => fn({ data: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["product-brands"] });
      toast.success("Brand created");
    },
    onError: mutationError,
  });
}

/** Every stock change is an inventory_movements row — no silent stock edits. */
export function useCreateMovement() {
  const fn = useServerFn(createMovement);
  const invalidate = useCatalogInvalidation();
  return useMutation({
    mutationFn: (input: MovementInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate({ prices: false });
      toast.success("Stock movement recorded");
    },
    onError: mutationError,
  });
}
