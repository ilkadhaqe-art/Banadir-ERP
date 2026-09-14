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
import { useDriverBalances, useRecordHandover } from "@/hooks/useLogistics";
import { usePaymentAccounts } from "@/hooks/useSales";
import { dayKey, formatMoney } from "@/lib/format";
import type { PaymentMethod } from "@/lib/sales-types";
import { PAYMENT_METHODS } from "@/lib/sales-types";

/**
 * COD handover popup. record_driver_handover() checks the outstanding COD and
 * writes the account movement plus the financial-engine entry.
 */
export function HandoverDialog({
  open,
  onOpenChange,
  driverId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId?: string | null;
}) {
  const { data: balances } = useDriverBalances();
  const { data: accounts } = usePaymentAccounts();
  const record = useRecordHandover();

  const [driver, setDriver] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(dayKey());
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [accountId, setAccountId] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const activeAccounts = useMemo(
    () => (accounts ?? []).filter((a) => a.active && a.scope === "business"),
    [accounts],
  );

  useEffect(() => {
    if (!open) return;
    setDriver(driverId ?? "");
    setAmount("");
    setDate(dayKey());
    setMethod("cash");
    setReference("");
    setNote("");
    setAccountId(activeAccounts[0]?.id ?? "");
  }, [open, driverId, activeAccounts]);

  const selected = (balances ?? []).find((row) => row.driver_id === driver);
  const outstanding = Number(selected?.outstanding ?? 0);
  const value = Number(amount) || 0;

  const validation = (() => {
    if (!driver) return "Choose a driver.";
    if (value <= 0) return "Enter an amount above zero.";
    if (value > outstanding)
      return `Handover exceeds the outstanding COD (${formatMoney(outstanding)}).`;
    if (!accountId) return "Choose the receiving account.";
    return null;
  })();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (record.isPending || validation) return;
    await record.mutateAsync({
      driver_id: driver,
      amount: value,
      account_id: accountId,
      method,
      handover_date: date,
      reference: reference.trim() || null,
      note: note.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Record COD handover</DialogTitle>
          <DialogDescription>
            Outstanding COD for the selected driver: {formatMoney(outstanding)}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label>Driver</Label>
            <Select value={driver} onValueChange={setDriver}>
              <SelectTrigger aria-label="Driver">
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent>
                {(balances ?? []).map((row) => (
                  <SelectItem key={row.driver_id} value={row.driver_id}>
                    {row.name} — {formatMoney(Number(row.outstanding))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="handover-amount">Amount</Label>
              <Input
                id="handover-amount"
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="handover-date">Date</Label>
              <Input
                id="handover-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger aria-label="Method">
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="handover-ref">Reference</Label>
              <Input
                id="handover-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="handover-note">Note</Label>
              <Textarea id="handover-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          {validation ? <p className="text-sm text-destructive">{validation}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={record.isPending || Boolean(validation)}>
              {record.isPending ? "Saving…" : "Record handover"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
