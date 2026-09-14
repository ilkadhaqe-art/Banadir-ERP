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
import { Textarea } from "@/components/ui/textarea";
import { useCollectDeliveryPayment, useDeliveryDetail } from "@/hooks/useLogistics";
import { usePaymentAccounts } from "@/hooks/useSales";
import { dayKey, formatMoney } from "@/lib/format";
import type { PaymentMethod } from "@/lib/sales-types";
import { PAYMENT_METHODS } from "@/lib/sales-types";

/**
 * Driver collection popup. record_collection() (through
 * collect_delivery_payment) owns the outstanding check, the sale allocation and
 * the financial entry — the popup only shows what the database already knows.
 */
export function DeliveryCollectDialog({
  deliveryId,
  onOpenChange,
}: {
  deliveryId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: detail, isPending } = useDeliveryDetail(deliveryId);
  const { data: accounts } = usePaymentAccounts();
  const collect = useCollectDeliveryPayment();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(dayKey());
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const activeAccounts = useMemo(
    () => (accounts ?? []).filter((a) => a.active && a.scope === "business"),
    [accounts],
  );

  const outstanding = Number(detail?.sale?.balance ?? 0);
  const collected = (detail?.collections ?? []).reduce((sum, c) => sum + Number(c.amount), 0);

  useEffect(() => {
    if (!deliveryId) return;
    setAmount(outstanding > 0 ? String(outstanding) : "");
    setMethod("cash");
    setDate(dayKey());
    setReference(detail?.delivery.delivery_no ?? "");
    setNote("");
    setAccountId(activeAccounts[0]?.id ?? "");
  }, [deliveryId, outstanding, detail?.delivery.delivery_no, activeAccounts]);

  const value = Number(amount) || 0;

  const validation = (() => {
    if (isPending) return "Loading delivery…";
    if (!detail?.sale) return "This delivery has no sale yet — convert the order first.";
    if (outstanding <= 0) return "Nothing left to collect on this order.";
    if (value <= 0) return "Enter an amount above zero.";
    if (value > outstanding)
      return `Collection exceeds the outstanding balance (${formatMoney(outstanding)}).`;
    if (!accountId) return "Choose the receiving account.";
    return null;
  })();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!deliveryId || collect.isPending || validation) return;
    await collect.mutateAsync({
      delivery_id: deliveryId,
      amount: value,
      method,
      account_id: accountId,
      payment_date: date,
      reference: reference.trim() || null,
      note: note.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={Boolean(deliveryId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Collect payment · {detail?.delivery.delivery_no ?? "…"}</DialogTitle>
          <DialogDescription>
            Delivered is not collected — record the cash the driver actually took.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Order total</p>
            <p className="num font-semibold">{formatMoney(Number(detail?.sale?.total ?? 0))}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid before</p>
            <p className="num font-semibold">
              {formatMoney(Number(detail?.sale?.paid_amount ?? 0))}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Collected here</p>
            <p className="num font-semibold">{formatMoney(collected)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="num font-semibold text-warning">{formatMoney(outstanding)}</p>
          </div>
        </div>

        <form className="grid gap-3" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dc-amount">Amount to collect</Label>
              <Input
                id="dc-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dc-date">Date</Label>
              <Input
                id="dc-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger aria-label="Collection method">
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
              <Label>Receiving account</Label>
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="dc-ref">Reference</Label>
              <Input id="dc-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="dc-note">Note</Label>
              <Textarea id="dc-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          {validation ? <p className="text-sm text-destructive">{validation}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={collect.isPending || Boolean(validation)}>
              {collect.isPending ? "Recording…" : "Record collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
