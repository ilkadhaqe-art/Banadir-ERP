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
import { useExpenseCategories, useRecordExpense, useRecordIncome } from "@/hooks/useProcurement";
import { usePaymentAccounts } from "@/hooks/useSales";
import { dayKey } from "@/lib/format";

/**
 * Records an expense or other-income entry. The database RPC writes the
 * ledger row, moves the account balance and rebuilds the financial engine.
 */
export function MoneyEntryDialog({
  open,
  onOpenChange,
  kind,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: "expense" | "income";
}) {
  const { data: categories } = useExpenseCategories();
  const { data: accounts } = usePaymentAccounts();
  const recordExpense = useRecordExpense();
  const recordIncome = useRecordIncome();
  const mutation = kind === "expense" ? recordExpense : recordIncome;

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [scope, setScope] = useState<"business" | "personal">("business");
  const [date, setDate] = useState(dayKey());
  const [accountId, setAccountId] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setCategory("");
    setScope("business");
    setDate(dayKey());
    setAccountId("");
    setDescription("");
  }, [open]);

  const options = (categories ?? []).filter((c) => c.kind === kind && c.scope === scope);
  const valid = Number(amount) > 0 && category.trim() !== "" && accountId !== "";

  const submit = () => {
    if (!valid) return;
    mutation.mutate(
      {
        amount: Number(amount),
        category,
        scope,
        txn_date: date,
        account_id: accountId,
        description: description.trim() === "" ? null : description.trim(),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{kind === "expense" ? "Record expense" : "Record income"}</DialogTitle>
          <DialogDescription>
            Posted to the ledger and the selected account; the engine recalculates the day.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="money-amount">Amount</Label>
            <Input
              id="money-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="money-date">Date</Label>
            <Input
              id="money-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Scope</Label>
            <Select
              value={scope}
              onValueChange={(value) => {
                setScope(value as "business" | "personal");
                setCategory("");
              }}
            >
              <SelectTrigger aria-label="Scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger aria-label="Category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {options.length === 0 ? (
                  <SelectItem value="Other">Other</SelectItem>
                ) : (
                  options.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
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
            <Label htmlFor="money-note">Description</Label>
            <Input
              id="money-note"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional note"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
