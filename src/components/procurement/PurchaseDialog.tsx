import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useProducts } from "@/hooks/useCatalog";
import { useCreatePurchase, useSuppliers } from "@/hooks/useProcurement";
import { usePaymentAccounts } from "@/hooks/useSales";
import { dayKey, formatMoney } from "@/lib/format";
import type { PaymentMethod } from "@/lib/procurement-types";
import { PAYMENT_METHODS } from "@/lib/procurement-types";

const NO_SUPPLIER = "__walkin__";

type Line = { product_id: string; quantity: string; unit_cost: string };

/**
 * Purchase entry. create_purchase() owns the totals, the stock movements, the
 * cost update and the financial-engine entry.
 */
export function PurchaseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: suppliers } = useSuppliers();
  const { data: products } = useProducts();
  const { data: accounts } = usePaymentAccounts();
  const create = useCreatePurchase();

  const [supplierId, setSupplierId] = useState(NO_SUPPLIER);
  const [date, setDate] = useState(dayKey());
  const [invoice, setInvoice] = useState("");
  const [lines, setLines] = useState<Line[]>([{ product_id: "", quantity: "1", unit_cost: "" }]);
  const [discount, setDiscount] = useState("0");
  const [extra, setExtra] = useState("0");
  const [paid, setPaid] = useState("0");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [accountId, setAccountId] = useState("");
  const [updateCost, setUpdateCost] = useState(true);
  const [note, setNote] = useState("");

  const activeAccounts = useMemo(
    () => (accounts ?? []).filter((a) => a.active && a.scope === "business"),
    [accounts],
  );
  const activeProducts = useMemo(() => (products ?? []).filter((p) => p.active), [products]);

  useEffect(() => {
    if (!open) return;
    setSupplierId(NO_SUPPLIER);
    setDate(dayKey());
    setInvoice("");
    setLines([{ product_id: "", quantity: "1", unit_cost: "" }]);
    setDiscount("0");
    setExtra("0");
    setPaid("0");
    setMethod("cash");
    setUpdateCost(true);
    setNote("");
    setAccountId(activeAccounts[0]?.id ?? "");
  }, [open, activeAccounts]);

  const subtotal = lines.reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_cost) || 0),
    0,
  );
  const total = subtotal - (Number(discount) || 0) + (Number(extra) || 0);
  const paidValue = Number(paid) || 0;

  const validLines = lines.filter(
    (line) => line.product_id && (Number(line.quantity) || 0) > 0 && line.unit_cost !== "",
  );

  const validation = (() => {
    if (validLines.length === 0) return "Add at least one product line.";
    if ((Number(discount) || 0) > subtotal) return "Discount cannot exceed the subtotal.";
    if (paidValue > total) return "Paid amount cannot exceed the purchase total.";
    if (paidValue > 0 && !accountId) return "Choose the account that paid.";
    if (paidValue < total && supplierId === NO_SUPPLIER) return "Credit purchases need a supplier.";
    return null;
  })();

  const setLine = (index: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (create.isPending || validation) return;
    await create.mutateAsync({
      purchase_date: date,
      supplier_id: supplierId === NO_SUPPLIER ? null : supplierId,
      items: validLines.map((line) => ({
        product_id: line.product_id,
        quantity: Number(line.quantity),
        unit_cost: Number(line.unit_cost),
      })),
      discount: Number(discount) || 0,
      extra_cost: Number(extra) || 0,
      paid_amount: paidValue,
      payment_method: method,
      account_id: paidValue > 0 ? accountId : null,
      invoice_no: invoice.trim() || null,
      note: note.trim() || null,
      update_cost: updateCost,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>New purchase</DialogTitle>
          <DialogDescription>
            The database posts the stock movements, updates costs and records the payment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger aria-label="Purchase supplier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SUPPLIER}>No supplier (paid in full)</SelectItem>
                  {(suppliers ?? [])
                    .filter((s) => s.active)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pur-date">Date</Label>
              <Input
                id="pur-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Lines</Label>
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-[minmax(0,1fr)_5rem_6rem_auto] gap-2">
                <Select
                  value={line.product_id}
                  onValueChange={(value) => {
                    const product = activeProducts.find((p) => p.id === value);
                    setLine(index, {
                      product_id: value,
                      unit_cost:
                        line.unit_cost === "" && product
                          ? String(Number(product.cost_price))
                          : line.unit_cost,
                    });
                  }}
                >
                  <SelectTrigger aria-label={`Product for line ${index + 1}`}>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label={`Quantity for line ${index + 1}`}
                  value={line.quantity}
                  onChange={(e) => setLine(index, { quantity: e.target.value })}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label={`Unit cost for line ${index + 1}`}
                  value={line.unit_cost}
                  onChange={(e) => setLine(index, { unit_cost: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove line ${index + 1}`}
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                  disabled={lines.length === 1}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-self-start"
              onClick={() =>
                setLines((prev) => [...prev, { product_id: "", quantity: "1", unit_cost: "" }])
              }
            >
              <Plus className="size-4" /> Add line
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pur-discount">Discount</Label>
              <Input
                id="pur-discount"
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pur-extra">Extra cost</Label>
              <Input
                id="pur-extra"
                type="number"
                min="0"
                step="0.01"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pur-paid">Paid now</Label>
              <Input
                id="pur-paid"
                type="number"
                min="0"
                step="0.01"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger aria-label="Purchase payment method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Paying account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger aria-label="Paying account">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="pur-invoice">Supplier invoice no.</Label>
            <Input id="pur-invoice" value={invoice} onChange={(e) => setInvoice(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={updateCost}
              onCheckedChange={(checked) => setUpdateCost(checked === true)}
            />
            Update product cost price from this purchase
          </label>

          <div className="grid gap-1.5">
            <Label htmlFor="pur-note">Note</Label>
            <Textarea
              id="pur-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="rounded-xl bg-muted/60 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="num font-semibold">{formatMoney(subtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="num font-bold">{formatMoney(total)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-muted-foreground">Balance after payment</span>
              <span className="num font-semibold">{formatMoney(total - paidValue)}</span>
            </div>
          </div>

          {validation ? <p className="text-xs text-destructive">{validation}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || Boolean(validation)}>
              Record purchase
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
