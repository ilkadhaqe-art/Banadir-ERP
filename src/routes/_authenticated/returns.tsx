import { createFileRoute } from "@tanstack/react-router";
import { Search, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, Panel, StatTile } from "@/components/command-center/Panel";
import { ReturnDialog } from "@/components/sales/ReturnDialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSales, useSalesReturns } from "@/hooks/useSales";
import { formatDate, formatMoney } from "@/lib/format";
import type { SaleOverview } from "@/lib/sales-types";

export const Route = createFileRoute("/_authenticated/returns")({
  head: () => ({
    meta: [
      { title: "Sales Returns — Banadir Online FOS" },
      {
        name: "description",
        content:
          "Every sales return with refunds, restock status and the profit impact recorded by the financial engine.",
      },
      { property: "og:title", content: "Sales Returns — Banadir Online FOS" },
      {
        property: "og:description",
        content: "Return register with refund totals and restock tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReturnsPage,
});

const NONE = "__none__";

function ReturnsPage() {
  const { data: returns, isPending, isError } = useSalesReturns({ limit: 300 });
  const { data: sales } = useSales({ limit: 300 });

  const [search, setSearch] = useState("");
  const [saleForReturn, setSaleForReturn] = useState<SaleOverview | null>(null);
  const [pickerValue, setPickerValue] = useState(NONE);

  const salesById = useMemo(() => new Map((sales ?? []).map((sale) => [sale.id, sale])), [sales]);

  const returnableSales = useMemo(
    () => (sales ?? []).filter((sale) => sale.status === "active"),
    [sales],
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (returns ?? []).filter((row) => {
      if (!term) return true;
      const sale = salesById.get(row.sale_id);
      return (
        (sale?.sale_no ?? "").toLowerCase().includes(term) ||
        (sale?.customer_name ?? "").toLowerCase().includes(term) ||
        (row.note ?? "").toLowerCase().includes(term)
      );
    });
  }, [returns, search, salesById]);

  const totals = useMemo(() => {
    const active = (returns ?? []).filter((row) => row.status === "active");
    return {
      count: active.length,
      value: active.reduce((sum, row) => sum + Number(row.total), 0),
      refunded: active.reduce((sum, row) => sum + Number(row.refund_amount), 0),
    };
  }, [returns]);

  return (
    <div className="space-y-4">
      <header className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">SALES</p>
          <h1 className="text-xl font-bold sm:text-2xl">Sales returns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Returns reverse revenue, cost of goods and stock through the canonical engine.
          </p>
        </div>
        <div className="grid gap-2 sm:w-[320px]">
          <Select
            value={pickerValue}
            onValueChange={(value) => {
              setPickerValue(value);
              if (value === NONE) return;
              const sale = salesById.get(value);
              if (sale) setSaleForReturn(sale);
              setPickerValue(NONE);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Start a return from a sale" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Start a return from a sale…</SelectItem>
              {returnableSales.map((sale) => (
                <SelectItem key={sale.id} value={sale.id}>
                  {sale.sale_no} — {sale.customer_name ?? "Walk-in"} ·{" "}
                  {formatMoney(Number(sale.total))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Returns" value={String(totals.count)} loading={isPending} />
        <StatTile
          label="Returned value"
          value={formatMoney(totals.value)}
          tone="negative"
          loading={isPending}
        />
        <StatTile label="Refunded cash" value={formatMoney(totals.refunded)} loading={isPending} />
      </div>

      <Panel icon={Undo2} eyebrow="REGISTER" title="Return history">
        <div className="mb-3 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sale no, customer or note"
          />
        </div>

        {isError ? (
          <p className="py-8 text-center text-sm text-destructive">
            Returns unavailable — read failed.
          </p>
        ) : isPending ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState label="No returns recorded yet." />
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold tracking-[0.1em] text-muted-foreground">
                  <th className="px-3 py-2">DATE</th>
                  <th className="px-3 py-2">SALE</th>
                  <th className="px-3 py-2">CUSTOMER</th>
                  <th className="px-3 py-2 text-right">VALUE</th>
                  <th className="px-3 py-2 text-right">REFUND</th>
                  <th className="px-3 py-2">RESTOCK</th>
                  <th className="px-3 py-2 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const sale = salesById.get(row.sale_id);
                  return (
                    <tr key={row.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2">{formatDate(row.return_date)}</td>
                      <td className="px-3 py-2 font-medium">{sale?.sale_no ?? "—"}</td>
                      <td className="px-3 py-2">{sale?.customer_name ?? "Walk-in"}</td>
                      <td className="num px-3 py-2 text-right">{formatMoney(Number(row.total))}</td>
                      <td className="num px-3 py-2 text-right">
                        {formatMoney(Number(row.refund_amount))}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={row.restock ? "secondary" : "outline"}>
                          {row.restock ? "Restocked" : "No restock"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Badge variant={row.status === "active" ? "default" : "outline"}>
                          {row.status === "active" ? "Active" : "Void"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <ReturnDialog
        open={saleForReturn !== null}
        onOpenChange={(open) => {
          if (!open) setSaleForReturn(null);
        }}
        sale={saleForReturn}
      />
    </div>
  );
}
