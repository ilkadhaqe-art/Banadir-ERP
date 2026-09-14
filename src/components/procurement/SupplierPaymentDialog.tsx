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
import { useRecordSupplierPayment } from "@/hooks/useProcurement";
import { usePaymentAccounts } from "@/hooks/useSales";
import { dayKey } from "@/lib/format";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/procurement-types";

/** Pays down a supplier balance from a payment account. */
export function SupplierPaymentDialog({
  open,
  onOpenChange,
  supplierId,
  supplierName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string | null;
  supplierName?: string | null;
}) {
  const { data: accounts } = usePaymentAccounts();
  const mutation = useRecordSupplierPayment();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(dayKey());
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setMethod("cash");
    setAccountId("");
    setDate(dayKey());
    setReference("");
  }, [open]);

  const valid = Boolean(supplierId) && Number(amount) > 0 && accountId !== "";

  const submit = () => {
    if (!valid || !supplierId) return;
    mutation.mutate(
      {
        supplier_id: supplierId,
        amount: Number(amount),
        account_id: accountId,
        payment_date: date,
        method,
        reference: reference.trim() === "" ? null : reference.trim(),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pay supplier</DialogTitle>
          <DialogDescription>
            {supplierName ? `Settle payables for ${supplierName}.` : "Settle supplier payables."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="sp-amount">Amount</Label>
            <Input
              id="sp-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="sp-date">Date</Label>
            <Input
              id="sp-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Method</Label>
            <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
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
          <div className="grid gap-1.5">
            <Label>Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger aria-label="Account">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {(accounts ?? []).map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="sp-ref">Reference</Label>
            <Input
              id="sp-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional reference"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
