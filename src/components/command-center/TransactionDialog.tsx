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
import { useCreateTransaction, useUpdateTransaction } from "@/hooks/useFinancialMutations";
import { dayKey } from "@/lib/format";
import type { FinancialTransaction } from "@/lib/financial-types";

export type TransactionKind = "sale" | "expense" | "income" | "collection" | "capital";

const TITLES: Record<TransactionKind, string> = {
  sale: "Add Sale",
  expense: "Add Expense",
  income: "Add Income",
  collection: "Record Collection",
  capital: "Add Capital",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: TransactionKind;
  /** When provided the dialog edits the existing canonical row instead of creating one. */
  transaction?: FinancialTransaction | null;
};

/**
 * Writes go to financial_transactions only. The database engine rebuilds the
 * chain from the affected date — nothing is calculated in this component.
 */
export function TransactionDialog({ open, onOpenChange, kind, transaction }: Props) {
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const editing = Boolean(transaction);

  const [date, setDate] = useState(dayKey());
  const [amount, setAmount] = useState("");
  const [cogs, setCogs] = useState("");
  const [paid, setPaid] = useState("");
  const [scope, setScope] = useState<"business" | "personal">("business");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setDate(transaction?.txn_date ?? dayKey());
    setAmount(transaction ? String(transaction.amount) : "");
    setCogs(transaction ? String(transaction.cogs) : "");
    setPaid(transaction ? String(transaction.amount_paid) : "");
    setScope(transaction?.scope ?? (kind === "expense" ? "business" : "business"));
    setCategory(transaction?.category ?? "");
    setDescription(transaction?.description ?? "");
  }, [open, transaction, kind]);

  const type = transaction?.type ?? kind;
  const pending = create.isPending || update.isPending;

  const submit = async () => {
    const payload = {
      txn_date: date,
      type: type as TransactionKind,
      scope,
      category: category || null,
      description: description || null,
      amount: Number(amount || 0),
      cogs: type === "sale" ? Number(cogs || 0) : 0,
      amount_paid: type === "sale" ? Number(paid === "" ? amount || 0 : paid) : Number(amount || 0),
    };
    if (!payload.amount) return;
    if (transaction) await update.mutateAsync({ id: transaction.id, ...payload });
    else await create.mutateAsync(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Transaction" : TITLES[kind]}</DialogTitle>
          <DialogDescription>
            Saved to the canonical ledger — the financial engine rebuilds from this date forward.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="txn-date">Date</Label>
            <Input
              id="txn-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="txn-amount">Amount</Label>
              <Input
                id="txn-amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="txn-scope">Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
                <SelectTrigger id="txn-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === "sale" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="txn-cogs">Cost of goods</Label>
                <Input
                  id="txn-cogs"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={cogs}
                  onChange={(e) => setCogs(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="txn-paid">Amount paid</Label>
                <Input
                  id="txn-paid"
                  inputMode="decimal"
                  placeholder="same as amount"
                  value={paid}
                  onChange={(e) => setPaid(e.target.value)}
                />
              </div>
            </div>
          ) : null}

          <div className="grid gap-1.5">
            <Label htmlFor="txn-category">Category</Label>
            <Input
              id="txn-category"
              placeholder="e.g. ads, data, grocery"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="txn-note">Description</Label>
            <Textarea
              id="txn-note"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !amount}>
            {pending ? "Saving…" : editing ? "Save changes" : "Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
