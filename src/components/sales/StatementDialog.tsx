import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomerStatement } from "@/hooks/useSales";
import { formatDate, formatMoney } from "@/lib/format";

const KIND_LABELS: Record<string, string> = {
  sale: "Sale",
  return: "Return",
  payment: "Collection",
};

/**
 * Customer statement popup. Every row and the running balance come from the
 * customer_statement() SQL function — nothing is recomputed here.
 */
export function StatementDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string | null;
  customerName?: string | null;
}) {
  const { data: entries, isPending } = useCustomerStatement(open ? customerId : null);
  const rows = entries ?? [];
  const closing = rows.length > 0 ? Number(rows[rows.length - 1]!.running_balance) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Statement{customerName ? ` — ${customerName}` : ""}</DialogTitle>
          <DialogDescription>
            Sales, returns and collections in date order with the running balance.
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-xl bg-muted/60 px-3 py-8 text-center text-sm text-muted-foreground">
            No activity yet for this customer.
          </p>
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-semibold">Date</th>
                  <th className="px-2 py-2 font-semibold">Type</th>
                  <th className="px-2 py-2 font-semibold">Reference</th>
                  <th className="px-2 py-2 font-semibold">Description</th>
                  <th className="px-2 py-2 text-right font-semibold">Debit</th>
                  <th className="px-2 py-2 text-right font-semibold">Credit</th>
                  <th className="px-2 py-2 text-right font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row, index) => (
                  <tr key={`${row.entry_date}-${index}`}>
                    <td className="whitespace-nowrap px-2 py-2">{formatDate(row.entry_date)}</td>
                    <td className="px-2 py-2">{KIND_LABELS[row.kind] ?? row.kind}</td>
                    <td className="px-2 py-2 text-muted-foreground">{row.reference || "—"}</td>
                    <td className="max-w-[220px] truncate px-2 py-2">{row.description || "—"}</td>
                    <td className="num px-2 py-2 text-right">
                      {Number(row.debit) > 0 ? formatMoney(Number(row.debit)) : "—"}
                    </td>
                    <td className="num px-2 py-2 text-right">
                      {Number(row.credit) > 0 ? formatMoney(Number(row.credit)) : "—"}
                    </td>
                    <td className="num px-2 py-2 text-right font-semibold">
                      {formatMoney(Number(row.running_balance))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-3">
          <span className="text-xs font-bold tracking-[0.12em] text-muted-foreground">
            OUTSTANDING BALANCE
          </span>
          <span className="num text-lg font-bold">{formatMoney(closing)}</span>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
