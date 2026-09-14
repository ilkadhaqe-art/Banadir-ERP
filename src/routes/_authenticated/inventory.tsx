import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  Warehouse,
} from "lucide-react";
import { useMemo, useState } from "react";

import { MOVEMENT_LABELS, MovementDialog } from "@/components/catalog/MovementDialog";
import { Panel, StatTile } from "@/components/command-center/Panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMovements, useProductStock } from "@/hooks/useCatalog";
import type { StockMovementType } from "@/lib/catalog-types";
import { OUTGOING_MOVEMENTS } from "@/lib/catalog-types";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Banadir Online FOS" },
      {
        name: "description",
        content:
          "Inventory movement ledger and low-stock alerts for Banadir Online FOS, derived from canonical stock data.",
      },
      { property: "og:title", content: "Inventory — Banadir Online FOS" },
      {
        property: "og:description",
        content: "Movement ledger, adjustments and low-stock alerts from the canonical stock view.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventoryPage,
});

const ALL = "__all__";
const MOVEMENT_TYPES = Object.keys(MOVEMENT_LABELS) as StockMovementType[];

function InventoryPage() {
  const { data: stock, isPending: stockPending } = useProductStock();
  const [type, setType] = useState(ALL);
  const [product, setProduct] = useState(ALL);
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);

  const movementParams = useMemo(
    () => ({
      ...(type !== ALL ? { type } : {}),
      ...(product !== ALL ? { product_id: product } : {}),
      limit,
    }),
    [type, product, limit],
  );
  const { data: movements, isPending, isError } = useMovements(movementParams);

  const productById = useMemo(
    () => new Map((stock ?? []).map((row) => [row.product_id, row])),
    [stock],
  );
  const lowStock = (stock ?? []).filter((row) => row.is_low_stock && row.active);
  const totalUnits = (stock ?? []).reduce((sum, row) => sum + Number(row.stock_on_hand ?? 0), 0);
  const stockValue = (stock ?? []).reduce((sum, row) => sum + Number(row.stock_value ?? 0), 0);

  const filteredLowStock = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return lowStock;
    return lowStock.filter(
      (row) => row.name.toLowerCase().includes(term) || row.sku.toLowerCase().includes(term),
    );
  }, [lowStock, search]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">STOCK</p>
          <h1 className="text-xl font-bold sm:text-2xl">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every quantity below is derived from the canonical movement ledger.
          </p>
        </div>
        <Button onClick={() => setAdjustOpen(true)}>
          <SlidersHorizontal className="size-4" /> New adjustment
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Tracked products"
          value={formatNumber((stock ?? []).length)}
          loading={stockPending}
        />
        <StatTile label="Units on hand" value={formatNumber(totalUnits)} loading={stockPending} />
        <StatTile label="Stock value" value={formatMoney(stockValue)} loading={stockPending} />
        <StatTile
          label="Low stock alerts"
          value={formatNumber(lowStock.length)}
          tone={lowStock.length > 0 ? "warning" : "default"}
          loading={stockPending}
        />
      </div>

      <Panel
        icon={AlertTriangle}
        title="Low stock alerts"
        subtitle="Products at or below their reorder level"
        action={
          <div className="relative w-40 sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search low stock"
            />
          </div>
        }
      >
        {stockPending ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredLowStock.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No products are below their reorder level.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filteredLowStock.map((row) => (
              <div
                key={row.product_id}
                className="rounded-xl border border-warning/40 bg-warning/5 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="num truncate text-xs text-muted-foreground">{row.sku}</p>
                  </div>
                  <Badge variant="destructive">Low</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    On hand{" "}
                    <span className="num font-semibold text-foreground">
                      {formatNumber(row.stock_on_hand)} {row.unit}
                    </span>
                  </span>
                  <span>
                    Reorder{" "}
                    <span className="num font-semibold text-foreground">
                      {formatNumber(row.reorder_level)}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel icon={Warehouse} title="Movement ledger" subtitle="Canonical inventory movements">
        <div className="grid gap-2 sm:grid-cols-3">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger aria-label="Filter by movement type">
              <SelectValue placeholder="All movement types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All movement types</SelectItem>
              {MOVEMENT_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {MOVEMENT_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={product} onValueChange={setProduct}>
            <SelectTrigger aria-label="Filter by product">
              <SelectValue placeholder="All products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All products</SelectItem>
              {(stock ?? []).map((row) => (
                <SelectItem key={row.product_id} value={row.product_id}>
                  {row.name} · {row.sku}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger aria-label="Rows to load">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">Last 50 movements</SelectItem>
              <SelectItem value="100">Last 100 movements</SelectItem>
              <SelectItem value="250">Last 250 movements</SelectItem>
              <SelectItem value="500">Last 500 movements</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4">
          {isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              Movement ledger unavailable — read failed.
            </p>
          ) : isPending ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (movements ?? []).length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No movements recorded for this filter.
            </p>
          ) : (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[780px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Product</th>
                    <th className="px-3 py-2 font-semibold">Type</th>
                    <th className="px-3 py-2 text-right font-semibold">Quantity</th>
                    <th className="px-3 py-2 text-right font-semibold">Unit cost</th>
                    <th className="px-3 py-2 font-semibold">Reference</th>
                    <th className="px-4 py-2 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(movements ?? []).map((movement) => {
                    const outgoing = OUTGOING_MOVEMENTS.includes(movement.movement_type);
                    const row = productById.get(movement.product_id);
                    return (
                      <tr key={movement.id} className="hover:bg-accent/30">
                        <td className="num whitespace-nowrap px-4 py-2.5">
                          {formatDate(movement.movement_date)}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="truncate font-medium">{row?.name ?? "—"}</p>
                          <p className="num truncate text-xs text-muted-foreground">
                            {row?.sku ?? movement.product_id.slice(0, 8)}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <Badge variant="outline">{MOVEMENT_LABELS[movement.movement_type]}</Badge>
                        </td>
                        <td
                          className={
                            outgoing
                              ? "num whitespace-nowrap px-3 py-2.5 text-right font-semibold text-destructive"
                              : "num whitespace-nowrap px-3 py-2.5 text-right font-semibold text-success"
                          }
                        >
                          <span className="inline-flex items-center gap-1">
                            {outgoing ? (
                              <ArrowDownRight className="size-3.5" />
                            ) : (
                              <ArrowUpRight className="size-3.5" />
                            )}
                            {outgoing ? "-" : "+"}
                            {formatNumber(movement.quantity)}
                          </span>
                        </td>
                        <td className="num whitespace-nowrap px-3 py-2.5 text-right text-muted-foreground">
                          {formatMoney(movement.unit_cost)}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {movement.reference ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {movement.note ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      <MovementDialog open={adjustOpen} onOpenChange={setAdjustOpen} />
    </div>
  );
}
