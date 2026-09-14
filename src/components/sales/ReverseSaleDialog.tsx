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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useReverseSale } from "@/hooks/useSales";
import type { SaleOverview } from "@/lib/sales-types";

/** Void a sale with a reason; the database reverses stock and money. */
export function ReverseSaleDialog({
  sale,
  onOpenChange,
}: {
  sale: SaleOverview | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const reverse = useReverseSale();

  useEffect(() => {
    if (sale) setReason("");
  }, [sale]);

  return (
    <Dialog open={Boolean(sale)} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full">
        <DialogHeader>
          <DialogTitle>Reverse {sale?.sale_no}</DialogTitle>
          <DialogDescription>
            Stock, customer balance, accounts and the financial engine are reversed. The record is
            kept as void.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reverse-reason">Reason</Label>
          <Textarea
            id="reverse-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why is this sale being reversed?"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!sale || reason.trim().length === 0 || reverse.isPending}
            onClick={() => {
              if (!sale) return;
              reverse.mutate(
                { sale_id: sale.id, reason: reason.trim() },
                { onSuccess: () => onOpenChange(false) },
              );
            }}
          >
            Reverse sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
