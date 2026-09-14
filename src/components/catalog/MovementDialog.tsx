import { useEffect, useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { useCreateMovement, useProductStock } from "@/hooks/useCatalog";
import type { StockMovementType } from "@/lib/catalog-types";
import { OUTGOING_MOVEMENTS } from "@/lib/catalog-types";
import { dayKey, formatNumber } from "@/lib/format";

export const MOVEMENT_LABELS: Record<StockMovementType, string> = {
  opening: "Opening stock",
  purchase: "Purchase",
  sale: "Sale",
  return_in: "Return in",
  return_out: "Return out",
  adjustment: "Adjustment",
  damage: "Damage",
  loss: "Loss",
  transfer: "Transfer",
};

/** Controlled corrections only — every change becomes an inventory movement. */
const ADJUSTMENT_TYPES: StockMovementType[] = ["adjustment", "damage", "loss", "transfer"];

export function MovementDialog({
  open,
  onOpenChange,
  productId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string | null;
}) {
  const { data: stock } = useProductStock();
  const createMovement = useCreateMovement();

  const [product, setProduct] = useState("");
  const [type, setType] = useState<StockMovementType>("adjustment");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(dayKey());
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setProduct(productId ?? "");
    setType("adjustment");
    setQuantity("");
    setDate(dayKey());
    setReference("");
    setNote("");
  }, [open, productId]);

  const selected = (stock ?? []).find((row) => row.product_id === product);
  const outgoing = OUTGOING_MOVEMENTS.includes(type);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const qty = Math.abs(Number(quantity));
    if (!product || !qty || !note.trim()) return;
    await createMovement.mutateAsync({
      product_id: product,
      movement_date: date,
      movement_type: type,
      quantity: qty,
      unit_cost: selected?.cost_price ?? 0,
      reference: reference.trim() || null,
      note: note.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Inventory adjustment</DialogTitle>
          <DialogDescription>
            Stock is never edited directly. This records a canonical movement and the stock view
            recalculates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Product</Label>
            <Select value={product} onValueChange={setProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {(stock ?? []).map((row) => (
                  <SelectItem key={row.product_id} value={row.product_id}>
                    {row.name} · {row.sku}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected ? (
              <p className="text-xs text-muted-foreground">
                Current stock:{" "}
                <span className="num font-medium text-foreground">
                  {formatNumber(selected.stock_on_hand)} {selected.unit}
                </span>
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Movement type</Label>
              <Select value={type} onValueChange={(v) => setType(v as StockMovementType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_TYPES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {MOVEMENT_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {outgoing ? "Reduces stock on hand." : "Increases stock on hand."}
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="m-qty">Quantity</Label>
              <Input
                id="m-qty"
                type="number"
                min="0"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="m-date">Date</Label>
              <Input
                id="m-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="m-ref">Reference</Label>
              <Input
                id="m-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Doc / ticket no."
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="m-note">Reason</Label>
            <Textarea
              id="m-note"
              required
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why is this correction being made?"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMovement.isPending || !product}>
              {createMovement.isPending ? "Recording…" : "Record movement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
