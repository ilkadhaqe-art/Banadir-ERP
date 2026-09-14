import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { usePriceHistory } from "@/hooks/useCatalog";
import type { Product } from "@/lib/catalog-types";
import { formatDate, formatMoney } from "@/lib/format";

/**
 * Read-only view of product_price_history. The frontend never writes or
 * fabricates historical prices — the database trigger records them.
 */
export function PriceHistoryDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}) {
  const { data, isPending, isError } = usePriceHistory(open ? (product?.id ?? null) : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Price history</DialogTitle>
          <DialogDescription>
            {product ? `${product.name} · ${product.sku}` : ""} — recorded automatically on every
            price change. Read-only.
          </DialogDescription>
        </DialogHeader>

        {isError ? (
          <p className="py-6 text-sm text-destructive">Price history unavailable.</p>
        ) : isPending ? (
          <div className="space-y-2 py-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Effective</th>
                  <th className="px-3 py-2 text-right font-semibold">Cost</th>
                  <th className="px-3 py-2 text-right font-semibold">Selling</th>
                  <th className="py-2 pl-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((entry) => (
                  <tr key={entry.id}>
                    <td className="num whitespace-nowrap py-2.5 pr-3">
                      {formatDate(entry.effective_from)}
                    </td>
                    <td className="num whitespace-nowrap px-3 py-2.5 text-right">
                      {formatMoney(entry.cost_price)}
                    </td>
                    <td className="num whitespace-nowrap px-3 py-2.5 text-right font-medium">
                      {formatMoney(entry.sell_price)}
                    </td>
                    <td className="py-2.5 pl-3 text-muted-foreground">{entry.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No price changes recorded yet.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
