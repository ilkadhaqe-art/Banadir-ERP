import { useEffect, useMemo, useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import {
  useCustomerBalances,
  usePaymentAccounts,
  useRecordCollection,
  useSales,
} from "@/hooks/useSales";
import { dayKey, formatMoney } from "@/lib/format";
import type { PaymentMethod } from "@/lib/sales-types";
import { PAYMENT_METHODS } from "@/lib/sales-types";

const NO_SALE = "__any__";

/**
 * Collection popup. record_collection() owns the outstanding-balance check and
 * the FIFO allocation across unpaid sales, plus the financial-engine entry.
 */
export function CollectionDialog({
  open,
  onOpenChange,
  customerId,
  saleId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string | null;
  saleId?: string | null;
}) {
  const { data: balances } = useCustomerBalances();
  const { data: accounts } = usePaymentAccounts();
  const record = useRecordCollection();

  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(dayKey());
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [accountId, setAccountId] = useState("");
  const [sale, setSale] = useState(NO_SALE);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const { data: openSales } = useSales(
    customer ? { customer_id: customer, limit: 100 } : { limit: 0 },
  );

  const activeAccounts = useMemo(
    () => (accounts ?? []).filter((a) => a.active && a.scope === "business"),
    [accounts],
  );

  useEffect(() => {
    if (!open) return;
    setCustomer(customerId ?? "");
    setAmount("");
    setDate(dayKey());
    setMethod("cash");
    setSale(saleId ?? NO_SALE);
    setReference("");
    setNote("");
    setAccountId(activeAccounts[0]?.id ?? "");
  }, [open, customerId, saleId, activeAccounts]);

  const selected = (balances ?? []).find((row) => row.customer_id === customer);
  const outstanding = Number(selected?.balance ?? 0);
  const value = Number(amount) || 0;

  const validation = (() => {
    if (!customer) return "Choose a customer.";
    if (value <= 0) return "Enter an amount above zero.";
    if (value > outstanding)
      return `Collection exceeds the outstanding balance (${formatMoney(outstanding)}).`;
    if (!accountId) return "Choose the receiving account.";
    return null;
  })();

  const unpaidSales = (openSales ?? []).filter(
    (row) => row.status === "active" && Number(row.balance) > 0,
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (record.isPending || validation) return;
    await record.mutateAsync({
      customer_id: customer,
      amount: value,
      payment_date: date,
      method,
      account_id: accountId,
      sale_id: sale === NO_SALE ? null : sale,
      reference: reference.trim() || null,
      note: note.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Record collection</DialogTitle>
          <DialogDescription>
            The database allocates the payment across unpaid sales and feeds the financial engine.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Customer</Label>
            <Select value={customer} onValueChange={setCustomer}>
              <SelectTrigger aria-label="Collection customer">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {(balances ?? [])
                  .filter((row) => Number(row.balance) > 0)
                  .map((row) => (
                    <SelectItem key={row.customer_id} value={row.customer_id}>
                      {row.name} · {formatMoney(Number(row.balance))} due
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {selected ? (
              <p className="text-xs text-muted-foreground">
                Outstanding{" "}
                <span className="num font-medium text-foreground">{formatMoney(outstanding)}</span>
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="col-amount">Amount</Label>
              <Input
                id="col-amount"
                type="number"
                min="0"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="col-date">Date</Label>
              <Input
                id="col-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger aria-label="Collection method">
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
              <Label>Receiving account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger aria-label="Receiving account">
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
            <Label>Apply to sale (optional)</Label>
            <Select value={sale} onValueChange={setSale}>
              <SelectTrigger aria-label="Apply to sale">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SALE}>Oldest unpaid sales first</SelectItem>
                {unpaidSales.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.sale_no} · {formatMoney(Number(row.balance))} due
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="col-ref">Reference</Label>
              <Input
                id="col-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Receipt / transaction no."
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="col-note">Note</Label>
              <Textarea
                id="col-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          {validation ? (
            <Badge variant="outline" className="w-fit border-destructive text-destructive">
              {validation}
            </Badge>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={record.isPending || Boolean(validation)}>
              {record.isPending ? "Recording…" : "Record collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
