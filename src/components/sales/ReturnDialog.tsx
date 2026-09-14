import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCreateSaleReturn, usePaymentAccounts, useSaleItems } from "@/hooks/useSales";
import { dayKey, formatMoney, formatNumber } from "@/lib/format";
import type { PaymentMethod, SaleOverview } from "@/lib/sales-types";
import { PAYMENT_METHODS } from "@/lib/sales-types";

/**
 * Sales return popup. Returnable quantities come from the database
 * (sale_items minus active return lines); create_sale_return() owns the
 * restock movement, the refund cap and the financial-engine entry.
 */
export function ReturnDialog({
  open,
  onOpenChange,
  sale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleOverview | null;
}) {
  const { data: items, isPending } = useSaleItems(open && sale ? sale.id : null);
  const { data: accounts } = usePaymentAccounts();
  const createReturn = useCreateSaleReturn();

  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [returnDate, setReturnDate] = useState(dayKey());
  const [restock, setRestock] = useState(true);
  const [refund, setRefund] = useState("0");
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("cash");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");

  const activeAccounts = useMemo(
    () => (accounts ?? []).filter((a) => a.active && a.scope === "business"),
    [accounts],
  );

  useEffect(() => {
    if (!open) return;
    setQuantities({});
    setReturnDate(dayKey());
    setRestock(true);
    setRefund("0");
    setRefundMethod((sale?.payment_method ?? "cash") as PaymentMethod);
    setNote("");
    setAccountId(sale?.account_id ?? activeAccounts[0]?.id ?? "");
  }, [open, sale, activeAccounts]);

  const returnable = (items ?? []).filter((item) => Number(item.returnable_quantity) > 0);

  const lines = returnable
    .map((item) => ({ item, qty: Number(quantities[item.product_id] ?? 0) || 0 }))
    .filter((line) => line.qty > 0);

  const returnValue = lines.reduce((sum, line) => sum + line.qty * Number(line.item.unit_price), 0);
  const refundValue = Number(refund) || 0;
  const alreadyPaid = Number(sale?.paid_amount ?? 0);

  const validation = (() => {
    if (!sale) return "No sale selected.";
    if (lines.length === 0) return "Enter at least one returned quantity.";
    const over = lines.find((line) => line.qty > Number(line.item.returnable_quantity));
    if (over)
      return `Cannot return more than ${formatNumber(Number(over.item.returnable_quantity), 2)} of ${over.item.product_name}.`;
    if (refundValue < 0) return "Refund cannot be negative.";
    if (refundValue > returnValue) return "Refund cannot exceed the returned value.";
    if (refundValue > alreadyPaid)
      return `Refund cannot exceed what the customer already paid (${formatMoney(alreadyPaid)}).`;
    if (refundValue > 0 && !accountId) return "Choose the account paying the refund.";
    return null;
  })();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!sale || validation || createReturn.isPending) return;
    await createReturn.mutateAsync({
      sale_id: sale.id,
      items: lines.map((line) => ({ product_id: line.item.product_id, quantity: line.qty })),
      return_date: returnDate,
      restock,
      refund_amount: refundValue,
      refund_method: refundValue > 0 ? refundMethod : null,
      account_id: refundValue > 0 ? accountId : null,
      note: note.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Sales return{sale ? ` — ${sale.sale_no}` : ""}</DialogTitle>
          <DialogDescription>
            Returned quantities, restock movements and refunds are validated and posted by the
            database.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          {isPending ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : returnable.length === 0 ? (
            <p className="rounded-xl bg-muted/60 px-3 py-6 text-center text-sm text-muted-foreground">
              Every line on this sale has already been returned.
            </p>
          ) : (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[460px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-1 py-2 font-semibold">Product</th>
                    <th className="px-1 py-2 text-right font-semibold">Sold</th>
                    <th className="px-1 py-2 text-right font-semibold">Returnable</th>
                    <th className="px-1 py-2 text-right font-semibold">Price</th>
                    <th className="px-1 py-2 text-right font-semibold">Return qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {returnable.map((item) => (
                    <tr key={item.product_id}>
                      <td className="px-1 py-2">{item.product_name}</td>
                      <td className="num px-1 py-2 text-right">
                        {formatNumber(Number(item.quantity), 2)}
                      </td>
                      <td className="num px-1 py-2 text-right">
                        {formatNumber(Number(item.returnable_quantity), 2)}
                      </td>
                      <td className="num px-1 py-2 text-right">
                        {formatMoney(Number(item.unit_price))}
                      </td>
                      <td className="px-1 py-2 text-right">
                        <Input
                          type="number"
                          min="0"
                          max={String(item.returnable_quantity)}
                          step="0.01"
                          className="ml-auto h-9 w-24 text-right"
                          aria-label={`Return quantity for ${item.product_name}`}
                          value={quantities[item.product_id] ?? ""}
                          onChange={(e) =>
                            setQuantities((prev) => ({
                              ...prev,
                              [item.product_id]: e.target.value,
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ret-date">Return date</Label>
              <Input
                id="ret-date"
                type="date"
                required
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ret-refund">Refund amount</Label>
              <Input
                id="ret-refund"
                type="number"
                min="0"
                step="0.01"
                value={refund}
                onChange={(e) => setRefund(e.target.value)}
              />
            </div>
            {refundValue > 0 ? (
              <>
                <div className="grid gap-1.5">
                  <Label>Refund method</Label>
                  <Select
                    value={refundMethod}
                    onValueChange={(v) => setRefundMethod(v as PaymentMethod)}
                  >
                    <SelectTrigger aria-label="Refund method">
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
                <div className="grid gap-1.5">
                  <Label>Paying account</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger aria-label="Refund account">
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
              </>
            ) : null}
          </div>

          <label className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-3 text-sm">
            <Checkbox
              checked={restock}
              onCheckedChange={(checked) => setRestock(checked === true)}
              aria-label="Restock returned items"
            />
            <span>
              Restock returned items
              <span className="block text-xs text-muted-foreground">
                Adds a return-in movement to the inventory ledger at the original cost.
              </span>
            </span>
          </label>

          <div className="grid gap-1.5">
            <Label htmlFor="ret-note">Note</Label>
            <Textarea
              id="ret-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for the return"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-3">
            <span className="text-xs font-bold tracking-[0.12em] text-muted-foreground">
              RETURN VALUE
            </span>
            <span className="num text-lg font-bold">{formatMoney(returnValue)}</span>
          </div>

          {validation ? (
            <Badge variant="secondary" className="w-fit">
              {validation}
            </Badge>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={Boolean(validation) || createReturn.isPending}>
              {createReturn.isPending ? "Saving…" : "Record return"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
