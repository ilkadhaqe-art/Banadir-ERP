import { createFileRoute } from "@tanstack/react-router";
import { FileText, HandCoins, Pencil, Receipt, Search, Truck, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Panel, StatTile } from "@/components/command-center/Panel";
import { TrackingDialog } from "@/components/logistics/TrackingDialog";
import { CollectionDialog } from "@/components/sales/CollectionDialog";
import { ReturnDialog } from "@/components/sales/ReturnDialog";
import { ReverseSaleDialog } from "@/components/sales/ReverseSaleDialog";
import { ReceiptDialog } from "@/components/sales/ReceiptDialog";
import { SaleDetailDialog } from "@/components/sales/SaleDetailDialog";
import { SaleDialog } from "@/components/sales/SaleDialog";
import { SaleStatementDialog } from "@/components/sales/SaleStatementDialog";
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
import { useDeliveries } from "@/hooks/useLogistics";
import { useSales } from "@/hooks/useSales";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { DELIVERY_STATUS_META, FULFILLMENT_LABELS } from "@/lib/logistics-types";
import type { SaleOverview } from "@/lib/sales-types";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/sales-types";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({
    meta: [
      { title: "Sales — Banadir Online FOS" },
      {
        name: "description",
        content:
          "Record sales, review payment status, collect debt and process returns in Banadir Online FOS.",
      },
      { property: "og:title", content: "Sales — Banadir Online FOS" },
      {
        property: "og:description",
        content: "Sales register with canonical totals, debt status and returns.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalesPage,
});

const ALL = "__all__";

function SalesPage() {
  const { data: sales, isPending, isError } = useSales({ limit: 300 });
  const { data: deliveries } = useDeliveries({ limit: 300 });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [fulfillment, setFulfillment] = useState(ALL);
  const [saleOpen, setSaleOpen] = useState(false);
  const [returnFor, setReturnFor] = useState<SaleOverview | null>(null);
  const [collectFor, setCollectFor] = useState<SaleOverview | null>(null);
  const [detailFor, setDetailFor] = useState<SaleOverview | null>(null);
  const [receiptFor, setReceiptFor] = useState<string | null>(null);
  const [editFor, setEditFor] = useState<SaleOverview | null>(null);
  const [reverseFor, setReverseFor] = useState<SaleOverview | null>(null);
  const [statementFor, setStatementFor] = useState<SaleOverview | null>(null);
  const [trackFor, setTrackFor] = useState<SaleOverview | null>(null);

  /** Sale → delivery record, so the register can show fulfillment truth. */
  const deliveryBySale = useMemo(() => {
    const map = new Map<string, NonNullable<typeof deliveries>[number]>();
    for (const row of deliveries ?? []) {
      if (row.sale_id) map.set(row.sale_id, row);
    }
    return map;
  }, [deliveries]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (sales ?? []).filter((sale) => {
      if (status !== ALL && sale.payment_status !== status) return false;
      if (fulfillment !== ALL && sale.fulfillment !== fulfillment) return false;
      if (!term) return true;
      return (
        sale.sale_no.toLowerCase().includes(term) ||
        (sale.customer_name ?? "").toLowerCase().includes(term) ||
        (sale.customer_phone ?? "").toLowerCase().includes(term)
      );
    });
  }, [sales, search, status, fulfillment]);

  const totals = useMemo(() => {
    const active = (sales ?? []).filter((s) => s.status === "active");
    return {
      count: active.length,
      revenue: active.reduce((sum, s) => sum + Number(s.total) - Number(s.returned_total), 0),
      profit: active.reduce((sum, s) => sum + Number(s.gross_profit), 0),
      outstanding: active.reduce((sum, s) => sum + Number(s.balance), 0),
    };
  }, [sales]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">COMMERCE</p>
          <h1 className="text-xl font-bold sm:text-2xl">Sales</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every figure is produced by the sales read model and the financial engine.
          </p>
        </div>
        <Button onClick={() => setSaleOpen(true)}>
          <Receipt className="size-4" /> New sale
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Sales" value={formatNumber(totals.count)} loading={isPending} />
        <StatTile label="Net revenue" value={formatMoney(totals.revenue)} loading={isPending} />
        <StatTile
          label="Gross profit"
          value={formatMoney(totals.profit)}
          tone="positive"
          loading={isPending}
        />
        <StatTile
          label="Outstanding"
          value={formatMoney(totals.outstanding)}
          tone={totals.outstanding > 0 ? "warning" : "default"}
          loading={isPending}
        />
      </div>

      <Panel icon={Receipt} title="Sales register" subtitle="Search and filter recorded sales">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search sale no, customer, phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search sales"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filter by payment status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="full_paid">Full paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="full_debt">Full debt</SelectItem>
            </SelectContent>
          </Select>
          <Select value={fulfillment} onValueChange={setFulfillment}>
            <SelectTrigger aria-label="Filter by fulfillment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All fulfillment</SelectItem>
              <SelectItem value="pickup">Pickup</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="cargo">Cargo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4">
          {isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              Sales unavailable — read failed.
            </p>
          ) : isPending ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No sales match these filters.
            </p>
          ) : (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-semibold">Sale</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Customer</th>
                    <th className="px-3 py-2 font-semibold">Fulfillment</th>
                    <th className="px-3 py-2 font-semibold">Delivery</th>
                    <th className="px-3 py-2 text-right font-semibold">Items</th>
                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                    <th className="px-3 py-2 text-right font-semibold">Paid</th>
                    <th className="px-3 py-2 text-right font-semibold">Balance</th>
                    <th className="px-3 py-2 font-semibold">Method</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-4 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((sale) => (
                    <tr
                      key={sale.id}
                      className="cursor-pointer hover:bg-accent/30"
                      onClick={() => setDetailFor(sale)}
                    >
                      <td className="num whitespace-nowrap px-4 py-2.5 font-medium">
                        {sale.sale_no}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {formatDate(sale.sale_date)}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="truncate">{sale.customer_name ?? "Walk-in"}</p>
                        {sale.customer_phone ? (
                          <p className="num truncate text-xs text-muted-foreground">
                            {sale.customer_phone}
                          </p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {FULFILLMENT_LABELS[sale.fulfillment]}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {(() => {
                          const d = deliveryBySale.get(sale.id);
                          if (!d) return <span className="text-muted-foreground">—</span>;
                          return (
                            <span className="flex flex-col">
                              <Badge
                                className={DELIVERY_STATUS_META[d.status].className}
                                variant="outline"
                              >
                                {DELIVERY_STATUS_META[d.status].label}
                              </Badge>
                              <span className="mt-0.5 text-xs text-muted-foreground">
                                {[d.driver_name, d.zone_name].filter(Boolean).join(" · ") || "—"}
                              </span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="num px-3 py-2.5 text-right">
                        {formatNumber(Number(sale.item_count))}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right font-medium">
                        {formatMoney(Number(sale.total))}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right">
                        {formatMoney(Number(sale.paid_amount))}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right">
                        {formatMoney(Number(sale.balance))}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {PAYMENT_METHOD_LABELS[sale.payment_method]}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant={
                            sale.payment_status === "full_paid"
                              ? "secondary"
                              : sale.payment_status === "partial"
                                ? "outline"
                                : "destructive"
                          }
                        >
                          {PAYMENT_STATUS_LABELS[sale.payment_status]}
                        </Badge>
                      </td>
                      <td
                        className="whitespace-nowrap px-4 py-2 text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {Number(sale.balance) > 0 && sale.customer_id ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Collect payment for ${sale.sale_no}`}
                            onClick={() => setCollectFor(sale)}
                          >
                            <HandCoins className="size-4" />
                          </Button>
                        ) : null}
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Return items on ${sale.sale_no}`}
                          disabled={sale.status !== "active"}
                          onClick={() => setReturnFor(sale)}
                        >
                          <Undo2 className="size-4" />
                        </Button>
                        {sale.fulfillment !== "pickup" ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Update tracking for ${sale.sale_no}`}
                            disabled={sale.status !== "active"}
                            onClick={() => setTrackFor(sale)}
                          >
                            <Truck className="size-4" />
                          </Button>
                        ) : null}
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Open receipt for ${sale.sale_no}`}
                          onClick={() => setReceiptFor(sale.id)}
                        >
                          <Receipt className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Open statement for ${sale.sale_no}`}
                          onClick={() => setStatementFor(sale)}
                        >
                          <FileText className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Edit ${sale.sale_no}`}
                          disabled={sale.status !== "active"}
                          onClick={() => setEditFor(sale)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Reverse ${sale.sale_no}`}
                          disabled={sale.status !== "active"}
                          onClick={() => setReverseFor(sale)}
                        >
                          <Undo2 className="size-4 rotate-180" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      <SaleDialog open={saleOpen} onOpenChange={setSaleOpen} />
      <ReturnDialog
        open={Boolean(returnFor)}
        onOpenChange={(open) => !open && setReturnFor(null)}
        sale={returnFor}
      />
      <CollectionDialog
        open={Boolean(collectFor)}
        onOpenChange={(open) => !open && setCollectFor(null)}
        customerId={collectFor?.customer_id ?? null}
        saleId={collectFor?.id ?? null}
      />
      <ReceiptDialog
        open={Boolean(receiptFor)}
        onOpenChange={(open) => !open && setReceiptFor(null)}
        saleId={receiptFor}
      />

      <SaleDetailDialog sale={detailFor} onOpenChange={(open) => !open && setDetailFor(null)} />
      <SaleDialog
        open={Boolean(editFor)}
        onOpenChange={(open) => !open && setEditFor(null)}
        sale={editFor}
      />
      <ReverseSaleDialog sale={reverseFor} onOpenChange={(open) => !open && setReverseFor(null)} />
      <SaleStatementDialog
        saleId={statementFor?.id ?? null}
        onOpenChange={(open) => !open && setStatementFor(null)}
      />
      <TrackingDialog sale={trackFor} onOpenChange={(open) => !open && setTrackFor(null)} />
    </div>
  );
}
