import { useEffect, useState } from "react";

import { ImageUploadField } from "@/components/catalog/ImageUploadField";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useBrands, useCategories, useCreateProduct, useUpdateProduct } from "@/hooks/useCatalog";
import type { Product } from "@/lib/catalog-types";

const NONE = "__none__";

type FormState = {
  name: string;
  sku: string;
  barcode: string;
  category_id: string;
  brand_id: string;
  unit: string;
  cost_price: string;
  sell_price: string;
  reorder_level: string;
  opening_stock: string;
  image_url: string;
  notes: string;
  active: boolean;
};

function emptyForm(): FormState {
  return {
    name: "",
    sku: "",
    barcode: "",
    category_id: NONE,
    brand_id: NONE,
    unit: "pcs",
    cost_price: "",
    sell_price: "",
    reorder_level: "0",
    opening_stock: "0",
    image_url: "",
    notes: "",
    active: true,
  };
}

function fromProduct(product: Product): FormState {
  return {
    name: product.name,
    sku: product.sku,
    barcode: product.barcode ?? "",
    category_id: product.category_id ?? NONE,
    brand_id: product.brand_id ?? NONE,
    unit: product.unit,
    cost_price: String(product.cost_price),
    sell_price: String(product.sell_price),
    reorder_level: String(product.reorder_level),
    opening_stock: String(product.opening_stock),
    image_url: product.image_url ?? "",
    notes: product.notes ?? "",
    active: product.active,
  };
}

/**
 * Create / edit a product through the existing server functions. Price changes
 * are captured by the database price-history trigger — never written here.
 */
export function ProductDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState<FormState>(emptyForm);
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(product ? fromProduct(product) : emptyForm());
  }, [open, product]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || null,
      category_id: form.category_id === NONE ? null : form.category_id,
      brand_id: form.brand_id === NONE ? null : form.brand_id,
      unit: form.unit.trim() || "pcs",
      cost_price: Number(form.cost_price) || 0,
      sell_price: Number(form.sell_price) || 0,
      reorder_level: Number(form.reorder_level) || 0,
      image_url: form.image_url.trim() || null,
      notes: form.notes.trim() || null,
      active: form.active,
    };
    if (!payload.name || !payload.sku) return;

    try {
      if (isEdit && product) {
        await update.mutateAsync({ id: product.id, ...payload });
      } else {
        await create.mutateAsync({ ...payload, opening_stock: Number(form.opening_stock) || 0 });
      }
      onOpenChange(false);
    } catch {
      // error surfaced via toast in the mutation hook; keep the dialog open
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Changes are written to the canonical product record. Price edits are logged automatically."
              : "Opening stock is posted as an opening inventory movement by the database."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="p-name">Product name</Label>
            <Input
              id="p-name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="p-sku">SKU</Label>
            <Input
              id="p-sku"
              required
              value={form.sku}
              onChange={(e) => set("sku", e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="p-barcode">Barcode</Label>
            <Input
              id="p-barcode"
              value={form.barcode}
              onChange={(e) => set("barcode", e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Category</Label>
            <Select value={form.category_id} onValueChange={(v) => set("category_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Uncategorised" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Uncategorised</SelectItem>
                {(categories ?? []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Brand</Label>
            <Select value={form.brand_id} onValueChange={(v) => set("brand_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="No brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No brand</SelectItem>
                {(brands ?? []).map((brand) => (
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="p-unit">Unit</Label>
            <Input id="p-unit" value={form.unit} onChange={(e) => set("unit", e.target.value)} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="p-reorder">Reorder level</Label>
            <Input
              id="p-reorder"
              type="number"
              min="0"
              step="1"
              value={form.reorder_level}
              onChange={(e) => set("reorder_level", e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="p-cost">Cost price</Label>
            <Input
              id="p-cost"
              type="number"
              min="0"
              step="0.01"
              value={form.cost_price}
              onChange={(e) => set("cost_price", e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="p-sell">Selling price</Label>
            <Input
              id="p-sell"
              type="number"
              min="0"
              step="0.01"
              value={form.sell_price}
              onChange={(e) => set("sell_price", e.target.value)}
            />
          </div>

          {!isEdit ? (
            <div className="grid gap-1.5">
              <Label htmlFor="p-opening">Opening stock</Label>
              <Input
                id="p-opening"
                type="number"
                min="0"
                step="1"
                value={form.opening_stock}
                onChange={(e) => set("opening_stock", e.target.value)}
              />
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <ImageUploadField
              label="Product image"
              value={form.image_url}
              onChange={(path) => set("image_url", path)}
            />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="p-notes">Notes</Label>
            <Textarea
              id="p-notes"
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5 sm:col-span-2">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">
                Inactive products stay in history but leave the active catalog.
              </p>
            </div>
            <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
          </div>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
