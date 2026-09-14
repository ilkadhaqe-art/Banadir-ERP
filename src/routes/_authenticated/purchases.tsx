import { createFileRoute } from "@tanstack/react-router";
import { PackageOpen, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, Panel, StatTile } from "@/components/command-center/Panel";
import { PurchaseDialog } from "@/components/procurement/PurchaseDialog";
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
import { usePurchaseItems, usePurchases } from "@/hooks/useProcurement";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { PURCHASE_STATUS_META } from "@/lib/procurement-types";

export const Route = createFileRoute("/_authenticated/purchases")({
  head: () => ({
    meta: [
      { title: "Purchases — Banadir Online FOS" },
      {
        name: "description",
        content: "Purchase invoices, landed cost and supplier payables in Banadir Online FOS.",
      },
      { property: "og:title", content: "Purchases — Banadir Online FOS" },
      {
        property: "og:description",
        content: "Every purchase moves stock, cost and payables in one atomic write.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PurchasesPage,
});

const ALL = "__all__";

function PurchasesPage() {
  const [status, setStatus] = useState(ALL);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isPending, isError } = usePurchases(
    status === ALL ? {} : { payment_status: status },
  );
  const { data: items } = usePurchaseItems(expanded);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter(
      (row) =>
        row.purchase_no.toLowerCase().includes(term) ||
        (row.supplier_name ?? "").toLowerCase().includes(term) ||
        (row.invoice_no ?? "").toLowerCase().includes(term),
    );
  }, [data, search]);

  const total = rows.reduce((sum, r) => sum + Number(r.total), 0);
  const outstanding = rows.reduce((sum, r) => sum + Number(r.balance), 0);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">
            PROCUREMENT
          </p>
          <h1 className="text-xl font-bold sm:text-2xl">Purchases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stock in, cost updates and payables are all written by the purchase RPC.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" /> New purchase
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Purchases" value={formatNumber(rows.length)} loading={isPending} />
        <StatTile label="Value" value={formatMoney(total)} loading={isPending} />
        <StatTile
          label="Unpaid"
          value={formatMoney(outstanding)}
          tone={outstanding > 0 ? "warning" : "default"}
          loading={isPending}
        />
        <StatTile
          label="On credit"
          value={formatNumber(rows.filter((r) => r.payment_status !== "full_paid").length)}
          loading={isPending}
        />
      </div>

      <Panel icon={PackageOpen} title="Purchase invoices" subtitle="Tap a row to see its lines">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search purchase, invoice or supplier"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search purchases"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filter payment status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="full_paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="full_debt">On credit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4">
          {isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              Purchases unavailable — read failed.
            </p>
          ) : isPending ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState label="No purchases match these filters." />
          ) : (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-semibold">Purchase</th>
                    <th className="px-3 py-2 font-semibold">Supplier</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                    <th className="px-3 py-2 text-right font-semibold">Paid</th>
                    <th className="px-3 py-2 text-right font-semibold">Balance</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => {
                    const meta = PURCHASE_STATUS_META[row.payment_status];
                    const open = expanded === row.id;
                    return (
                      <>
                        <tr
                          key={row.id}
                          className="cursor-pointer hover:bg-accent/30"
                          onClick={() => setExpanded(open ? null : row.id)}
                        >
                          <td className="num whitespace-nowrap px-4 py-2.5 font-medium">
                            {row.purchase_no}
                          </td>
                          <td className="px-3 py-2.5">{row.supplier_name ?? "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                            {formatDate(row.purchase_date)}
                          </td>
                          <td className="num whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                            {formatMoney(Number(row.total))}
                          </td>
                          <td className="num whitespace-nowrap px-3 py-2.5 text-right">
                            {formatMoney(Number(row.paid_amount))}
                          </td>
                          <td className="num whitespace-nowrap px-3 py-2.5 text-right">
                            {formatMoney(Number(row.balance))}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge className={meta.className} variant="secondary">
                              {meta.label}
                            </Badge>
                          </td>
                        </tr>
                        {open ? (
                          <tr key={`${row.id}-items`} className="bg-muted/40">
                            <td colSpan={7} className="px-4 py-3">
                              {(items ?? []).length === 0 ? (
                                <p className="text-xs text-muted-foreground">Loading lines…</p>
                              ) : (
                                <ul className="grid gap-1 text-xs sm:grid-cols-2">
                                  {(items ?? []).map((item) => (
                                    <li key={item.id} className="flex justify-between gap-3">
                                      <span className="truncate">
                                        {item.product_name} × {formatNumber(Number(item.quantity))}
                                      </span>
                                      <span className="num">
                                        {formatMoney(Number(item.line_total))}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        ) : null}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      <PurchaseDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
