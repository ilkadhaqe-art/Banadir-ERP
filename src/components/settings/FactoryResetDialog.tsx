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
import { useFactoryReset } from "@/hooks/useReports";

/**
 * Factory reset popup. The database function owns the owner-only check and the
 * confirmation word; this dialog only collects the choice.
 */
export function FactoryResetDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const reset = useFactoryReset();
  const [confirm, setConfirm] = useState("");
  const [includeMasters, setIncludeMasters] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirm("");
    setIncludeMasters(false);
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (reset.isPending || confirm !== "RESET") return;
    await reset.mutateAsync({ confirm, include_masters: includeMasters });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Factory reset</DialogTitle>
          <DialogDescription>
            Clears every operational record — sales, purchases, collections, returns, orders,
            deliveries, tracking, stock movements, money transactions and the audit history.
            Structure, users, accounts, rules and settings stay in place. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <label className="flex items-start gap-3 rounded-lg border border-border p-3">
            <Checkbox
              checked={includeMasters}
              onCheckedChange={(value) => setIncludeMasters(value === true)}
              aria-label="Also clear master data"
            />
            <span className="text-sm">
              Also clear master data
              <span className="block text-xs text-muted-foreground">
                Products, categories, brands, customers, suppliers, drivers, companies, locations
                and rates.
              </span>
            </span>
          </label>

          <div className="grid gap-1.5">
            <Label htmlFor="factory-confirm">Type RESET to confirm</Label>
            <Input
              id="factory-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="RESET"
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={reset.isPending || confirm !== "RESET"}
            >
              {reset.isPending ? "Resetting…" : "Run factory reset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
