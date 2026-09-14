import { useEffect, useMemo, useState } from "react";

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
import { useConvertOrder } from "@/hooks/useLogistics";
import { usePaymentAccounts } from "@/hooks/useSales";
import { dayKey, formatMoney } from "@/lib/format";
import type { OrderOverview } from "@/lib/logistics-types";
import type { PaymentMethod } from "@/lib/sales-types";
import { PAYMENT_METHODS } from "@/lib/sales-types";

/**
 * Conversion popup. convert_order_to_sale() issues the sale, moves stock and
 * writes the financial entry atomically — nothing is computed here.
 */
export function ConvertOrderDialog({
  order,
  onOpenChange,
}: {
  order: OrderOverview | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: accounts } = usePaymentAccounts();
  const convert = useConvertOrder();

  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [accountId, setAccountId] = useState("");
  const [saleDate, setSaleDate] = useState(dayKey());

  const activeAccounts = useMemo(
    () => (accounts ?? []).filter((a) => a.active && a.scope === "business"),
    [accounts],
  );

  useEffect(() => {
    if (!order) return;
    setPaid(String(Number(order.total)));
    setMethod("cash");
    setSaleDate(dayKey());
    setAccountId(activeAccounts[0]?.id ?? "");
  }, [order, activeAccounts]);

  const value = Number(paid) || 0;
  const total = Number(order?.total ?? 0);

  const validation = (() => {
    if (!order) return "No order selected.";
    if (value < 0) return "Paid amount cannot be negative.";
    if (value > total) return `Paid amount exceeds the order total (${formatMoney(total)}).`;
    if (value > 0 && !accountId) return "Choose the receiving account.";
    return null;
  })();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!order || convert.isPending || validation) return;
    await convert.mutateAsync({
      order_id: order.id,
      paid_amount: value,
      payment_method: method,
      account_id: value > 0 ? accountId : null,
      sale_date: saleDate,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Convert {order?.order_no} to a sale</DialogTitle>
          <DialogDescription>
            Order total {formatMoney(total)} — stock and the financial engine update on conversion.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="convert-date">Sale date</Label>
            <Input
              id="convert-date"
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="convert-paid">Paid amount</Label>
            <Input
              id="convert-paid"
              type="number"
              min="0"
              step="any"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger aria-label="Payment method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger aria-label="Receiving account">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {activeAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {validation ? <p className="text-sm text-destructive">{validation}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={convert.isPending || Boolean(validation)}>
              {convert.isPending ? "Converting…" : "Convert to sale"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
