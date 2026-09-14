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
import { useAccountBalances, useCreateAccountTransfer } from "@/hooks/useSales";
import { dayKey, formatMoney } from "@/lib/format";

/**
 * Money movement between payment accounts. create_account_transfer() checks the
 * available balance and posts the canonical transfer transaction.
 */
export function TransferDialog({
  open,
  onOpenChange,
  fromAccountId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromAccountId?: string | null;
}) {
  const { data: balances } = useAccountBalances();
  const transfer = useCreateAccountTransfer();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(dayKey());
  const [note, setNote] = useState("");

  const accounts = useMemo(() => (balances ?? []).filter((a) => a.active), [balances]);

  useEffect(() => {
    if (!open) return;
    setFrom(fromAccountId ?? "");
    setTo("");
    setAmount("");
    setDate(dayKey());
    setNote("");
  }, [open, fromAccountId]);

  const source = accounts.find((a) => a.account_id === from);
  const available = Number(source?.balance ?? 0);
  const value = Number(amount) || 0;

  const validation = (() => {
    if (!from) return "Choose the source account.";
    if (!to) return "Choose the destination account.";
    if (from === to) return "Choose two different accounts.";
    if (value <= 0) return "Enter an amount above zero.";
    if (value > available) return `Not enough money in that account (${formatMoney(available)}).`;
    return null;
  })();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (validation || transfer.isPending) return;
    await transfer.mutateAsync({
      from_account_id: from,
      to_account_id: to,
      amount: value,
      transfer_date: date,
      note: note.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Transfer between accounts</DialogTitle>
          <DialogDescription>
            Balances and limits are enforced by the database, not by this form.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>From</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger aria-label="Source account">
                  <SelectValue placeholder="Source account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.account_id} value={account.account_id}>
                      {account.name} · {formatMoney(Number(account.balance))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>To</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger aria-label="Destination account">
                  <SelectValue placeholder="Destination account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((account) => account.account_id !== from)
                    .map((account) => (
                      <SelectItem key={account.account_id} value={account.account_id}>
                        {account.name} · {formatMoney(Number(account.balance))}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tr-amount">Amount</Label>
              <Input
                id="tr-amount"
                type="number"
                min="0"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {source ? (
                <p className="text-xs text-muted-foreground">
                  Available{" "}
                  <span className="num font-medium text-foreground">{formatMoney(available)}</span>
                </p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tr-date">Date</Label>
              <Input
                id="tr-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="tr-note">Note</Label>
            <Textarea
              id="tr-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why the money moved"
            />
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
            <Button type="submit" disabled={Boolean(validation) || transfer.isPending}>
              {transfer.isPending ? "Saving…" : "Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
