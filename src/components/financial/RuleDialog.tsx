import { useEffect, useState } from "react";

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
import { useCreateFinancialRule, useUpdateFinancialRule } from "@/hooks/useFinancialRules";
import { dayKey } from "@/lib/format";
import type { FinancialRule, FinancialScope, RuleFrequency, RuleKind } from "@/lib/financial-types";

const FREQUENCIES: { value: RuleFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "friday", label: "Friday only" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

/**
 * Popup for obligations and guaranteed income. Amounts are stored in
 * financial_rules; the database trigger rebuilds the daily chain, so targets,
 * PLUS/MINUS and carry-forward update automatically.
 */
export function RuleDialog({
  open,
  onOpenChange,
  rule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: FinancialRule | null;
}) {
  const create = useCreateFinancialRule();
  const update = useUpdateFinancialRule();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<RuleKind>("obligation");
  const [scope, setScope] = useState<FinancialScope>("business");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<RuleFrequency>("daily");
  const [skipFriday, setSkipFriday] = useState(false);
  const [from, setFrom] = useState(dayKey());
  const [to, setTo] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(rule?.name ?? "");
    setKind(rule?.kind ?? "obligation");
    setScope(rule?.scope ?? "business");
    setCategory(rule?.category ?? "");
    setAmount(rule ? String(rule.amount) : "");
    setFrequency(rule?.frequency ?? "daily");
    setSkipFriday(rule?.skip_friday ?? false);
    setFrom(rule?.effective_from ?? dayKey());
    setTo(rule?.effective_to ?? "");
    setNotes(rule?.notes ?? "");
  }, [open, rule]);

  const amountValue = Number(amount);
  const valid =
    name.trim().length > 0 && Number.isFinite(amountValue) && amountValue >= 0 && !!from;
  const pending = create.isPending || update.isPending;

  async function submit() {
    if (!valid) return;
    const payload = {
      name: name.trim(),
      kind,
      scope,
      category: category.trim() || null,
      amount: amountValue,
      frequency,
      skip_friday: skipFriday,
      effective_from: from,
      effective_to: to || null,
      notes: notes.trim() || null,
    };
    if (rule) await update.mutateAsync({ id: rule.id, ...payload });
    else await create.mutateAsync(payload);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit rule" : "New financial rule"}</DialogTitle>
          <DialogDescription>
            Obligations and guaranteed income drive the daily target. Saving rebuilds the financial
            chain from the effective date.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="rule-name">Name</Label>
            <Input
              id="rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shop rent"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Kind</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as RuleKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="obligation">Obligation</SelectItem>
                  <SelectItem value="guaranteed_income">Guaranteed income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as FinancialScope)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="rule-amount">Amount</Label>
              <Input
                id="rule-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as RuleFrequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="rule-from">Effective from</Label>
              <Input
                id="rule-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rule-to">Effective to (optional)</Label>
              <Input id="rule-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="rule-category">Category (optional)</Label>
            <Input
              id="rule-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. rent, salary, qaad"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={skipFriday}
              onCheckedChange={(checked) => setSkipFriday(checked === true)}
            />
            Skip Fridays for this rule
          </label>

          <div className="grid gap-1.5">
            <Label htmlFor="rule-notes">Notes</Label>
            <Textarea
              id="rule-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || pending}>
            {pending ? "Saving…" : rule ? "Save changes" : "Add rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
