import { createFileRoute } from "@tanstack/react-router";
import { Boxes, History, Package, Pencil, Plus, Search, Tag } from "lucide-react";
import { useMemo, useState } from "react";

import { PriceHistoryDialog } from "@/components/catalog/PriceHistoryDialog";
import { ProductDialog } from "@/components/catalog/ProductDialog";
import { Panel, StatTile } from "@/components/command-center/Panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBrands,
  useCategories,
  useCreateBrand,
  useCreateCategory,
  useDeactivateProduct,
  useProductStock,
  useProducts,
} from "@/hooks/useCatalog";
import type { Product } from "@/lib/catalog-types";
import { formatMoney, formatNumber } from "@/lib/format";
import { useSignedImageUrls } from "@/lib/product-images";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({
    meta: [
      { title: "Products — Banadir Online FOS" },
      {
        name: "description",
        content:
          "Manage the Banadir Online FOS product catalog: SKUs, pricing, stock levels and price history.",
      },
      { property: "og:title", content: "Products — Banadir Online FOS" },
      {
        property: "og:description",
        content: "Catalog management with canonical stock levels and price history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductsPage,
});

const ALL = "__all__";

function ProductsPage() {
  const { data: products, isPending, isError } = useProducts();
  const imageUrl = useSignedImageUrls((products ?? []).map((p) => p.image_url));
  const { data: stock } = useProductStock();
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const deactivate = useDeactivateProduct();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [brand, setBrand] = useState(ALL);
  const [status, setStatus] = useState("active");
  const [editing, setEditing] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyFor, setHistoryFor] = useState<Product | null>(null);
  const [taxonomyOpen, setTaxonomyOpen] = useState(false);

  const stockById = useMemo(
    () => new Map((stock ?? []).map((row) => [row.product_id, row])),
    [stock],
  );
  const categoryById = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c.name])),
    [categories],
  );
  const brandById = useMemo(() => new Map((brands ?? []).map((b) => [b.id, b.name])), [brands]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (products ?? []).filter((product) => {
      if (status === "active" && !product.active) return false;
      if (status === "inactive" && product.active) return false;
      if (category !== ALL && product.category_id !== category) return false;
      if (brand !== ALL && product.brand_id !== brand) return false;
      if (!term) return true;
      return (
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        (product.barcode ?? "").toLowerCase().includes(term)
      );
    });
  }, [products, search, category, brand, status]);

  const activeCount = (products ?? []).filter((p) => p.active).length;
  const lowCount = (stock ?? []).filter((row) => row.is_low_stock && row.active).length;
  const stockValue = (stock ?? []).reduce((sum, row) => sum + Number(row.stock_value ?? 0), 0);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">CATALOG</p>
          <h1 className="text-xl font-bold sm:text-2xl">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Canonical product records. Stock comes from the inventory ledger.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setTaxonomyOpen(true)}>
            <Tag className="size-4" /> Categories & brands
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" /> Add product
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Active products" value={formatNumber(activeCount)} />
        <StatTile label="Total products" value={formatNumber((products ?? []).length)} />
        <StatTile
          label="Low stock"
          value={formatNumber(lowCount)}
          tone={lowCount > 0 ? "warning" : "default"}
        />
        <StatTile label="Stock value" value={formatMoney(stockValue)} />
      </div>

      <Panel icon={Boxes} title="Product list" subtitle="Search and filter the catalog">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name, SKU, barcode"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search products"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger aria-label="Filter by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {(categories ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger aria-label="Filter by brand">
              <SelectValue placeholder="All brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All brands</SelectItem>
              {(brands ?? []).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="inactive">Inactive only</SelectItem>
              <SelectItem value={ALL}>All statuses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4">
          {isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              Catalog unavailable — read failed.
            </p>
          ) : isPending ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No products match these filters.
            </p>
          ) : (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-semibold">Product</th>
                    <th className="px-3 py-2 font-semibold">Category</th>
                    <th className="px-3 py-2 font-semibold">Brand</th>
                    <th className="px-3 py-2 text-right font-semibold">Cost</th>
                    <th className="px-3 py-2 text-right font-semibold">Selling</th>
                    <th className="px-3 py-2 text-right font-semibold">Stock</th>
                    <th className="px-3 py-2 text-right font-semibold">Reorder</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-4 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((product) => {
                    const row = stockById.get(product.id);
                    return (
                      <tr key={product.id} className="hover:bg-accent/30">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            {imageUrl(product.image_url) ? (
                              <img
                                src={imageUrl(product.image_url) as string}
                                alt={product.name}
                                loading="lazy"
                                className="size-9 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                                <Package className="size-4" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-medium">{product.name}</p>
                              <p className="num truncate text-xs text-muted-foreground">
                                {product.sku}
                                {product.barcode ? ` · ${product.barcode}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {product.category_id
                            ? (categoryById.get(product.category_id) ?? "—")
                            : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {product.brand_id ? (brandById.get(product.brand_id) ?? "—") : "—"}
                        </td>
                        <td className="num whitespace-nowrap px-3 py-2.5 text-right">
                          {formatMoney(product.cost_price)}
                        </td>
                        <td className="num whitespace-nowrap px-3 py-2.5 text-right font-medium">
                          {formatMoney(product.sell_price)}
                        </td>
                        <td className="num whitespace-nowrap px-3 py-2.5 text-right">
                          {row ? formatNumber(row.stock_on_hand) : "—"}
                          {row?.is_low_stock ? (
                            <Badge variant="destructive" className="ml-2">
                              Low
                            </Badge>
                          ) : null}
                        </td>
                        <td className="num whitespace-nowrap px-3 py-2.5 text-right text-muted-foreground">
                          {formatNumber(product.reorder_level)}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={product.active ? "secondary" : "outline"}>
                            {product.active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Price history for ${product.name}`}
                            onClick={() => setHistoryFor(product)}
                          >
                            <History className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Edit ${product.name}`}
                            onClick={() => {
                              setEditing(product);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          {product.active ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={deactivate.isPending}
                              onClick={() => deactivate.mutate(product.id)}
                            >
                              Deactivate
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      <ProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editing} />
      <PriceHistoryDialog
        open={Boolean(historyFor)}
        onOpenChange={(open) => !open && setHistoryFor(null)}
        product={historyFor}
      />
      <TaxonomyDialog open={taxonomyOpen} onOpenChange={setTaxonomyOpen} />
    </div>
  );
}

function TaxonomyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createCategory = useCreateCategory();
  const createBrand = useCreateBrand();
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const [categoryName, setCategoryName] = useState("");
  const [brandName, setBrandName] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Categories & brands</DialogTitle>
          <DialogDescription>Add catalog taxonomy used by product records.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="new-category">New category</Label>
            <div className="flex gap-2">
              <Input
                id="new-category"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g. Beverages"
              />
              <Button
                disabled={!categoryName.trim() || createCategory.isPending}
                onClick={async () => {
                  try {
                    await createCategory.mutateAsync({ name: categoryName.trim() });
                    setCategoryName("");
                  } catch {
                    // error surfaced via toast
                  }
                }}
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {(categories ?? []).map((c) => c.name).join(" · ") || "No categories yet."}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-brand">New brand</Label>
            <div className="flex gap-2">
              <Input
                id="new-brand"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Coca-Cola"
              />
              <Button
                disabled={!brandName.trim() || createBrand.isPending}
                onClick={async () => {
                  try {
                    await createBrand.mutateAsync({ name: brandName.trim() });
                    setBrandName("");
                  } catch {
                    // error surfaced via toast
                  }
                }}
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {(brands ?? []).map((b) => b.name).join(" · ") || "No brands yet."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
