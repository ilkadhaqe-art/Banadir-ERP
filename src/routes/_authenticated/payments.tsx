import { createFileRoute } from "@tanstack/react-router";
import { HandCoins, Search, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Panel, StatTile } from "@/components/command-center/Panel";
import { CollectionDialog } from "@/components/sales/CollectionDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCollections,
  useCustomerBalances,
  usePaymentAccounts,
  useSales,
  useSalesReturns,
} from "@/hooks/useSales";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/sales-types";

export const Route = createFileRoute("/_authenticated/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Banadir Online FOS" },
      {
        name: "description",
        content:
          "Debt collections and refunds recorded through the Banadir Online FOS financial pipeline.",
      },
      { property: "og:title", content: "Payments — Banadir Online FOS" },
      {
        property: "og:description",
        content: "Collections and refunds with canonical account and customer linkage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { data: collections, isPending, isError } = useCollections({ limit: 300 });
  const { data: returns } = useSalesReturns({ limit: 200 });
  const { data: balances } = useCustomerBalances();
  const { data: accounts } = usePaymentAccounts();
  const { data: sales } = useSales({ limit: 300 });

  const [search, setSearch] = useState("");
  const [collectOpen, setCollectOpen] = useState(false);

  const customerName = useMemo(
    () => new Map((balances ?? []).map((row) => [row.customer_id, row.name])),
    [balances],
  );
  const accountName = useMemo(
    () => new Map((accounts ?? []).map((row) => [row.id, row.name])),
    [accounts],
  );
  const saleNo = useMemo(() => new Map((sales ?? []).map((row) => [row.id, row.sale_no])), [sales]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (collections ?? []).filter((payment) => {
      if (!term) return true;
      const name = customerName.get(payment.customer_id) ?? "";
      return (
        name.toLowerCase().includes(term) ||
        (payment.reference ?? "").toLowerCase().includes(term) ||
        (payment.note ?? "").toLowerCase().includes(term)
      );
    });
  }, [collections, search, customerName]);

  const collectedTotal = (collections ?? [])
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const refundTotal = (returns ?? [])
    .filter((r) => r.status === "active")
    .reduce((sum, r) => sum + Number(r.refund_amount), 0);
  const outstanding = (balances ?? []).reduce((sum, row) => sum + Number(row.balance), 0);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">MONEY</p>
          <h1 className="text-xl font-bold sm:text-2xl">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Collections and refunds posted through the single financial pipeline.
          </p>
        </div>
        <Button onClick={() => setCollectOpen(true)}>
          <HandCoins className="size-4" /> Record collection
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Collections" value={formatNumber(rows.length)} loading={isPending} />
        <StatTile label="Collected" value={formatMoney(collectedTotal)} tone="positive" />
        <StatTile label="Refunded" value={formatMoney(refundTotal)} tone="negative" />
        <StatTile
          label="Still outstanding"
          value={formatMoney(outstanding)}
          tone={outstanding > 0 ? "warning" : "default"}
        />
      </div>

      <Panel icon={HandCoins} title="Collections" subtitle="Debt payments received from customers">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search customer, reference, note"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search collections"
          />
        </div>

        <div className="mt-4">
          {isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              Collections unavailable — read failed.
            </p>
          ) : isPending ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No collections recorded yet.
            </p>
          ) : (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Customer</th>
                    <th className="px-3 py-2 text-right font-semibold">Amount</th>
                    <th className="px-3 py-2 font-semibold">Method</th>
                    <th className="px-3 py-2 font-semibold">Account</th>
                    <th className="px-3 py-2 font-semibold">Sale</th>
                    <th className="px-4 py-2 font-semibold">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((payment) => (
                    <tr key={payment.id} className="hover:bg-accent/30">
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {formatDate(payment.payment_date)}
                      </td>
                      <td className="px-3 py-2.5">
                        {customerName.get(payment.customer_id) ?? "—"}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                        {formatMoney(Number(payment.amount))}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {PAYMENT_METHOD_LABELS[payment.method]}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {payment.account_id ? (accountName.get(payment.account_id) ?? "—") : "—"}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {payment.sale_id ? (saleNo.get(payment.sale_id) ?? "—") : "—"}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-2.5 text-muted-foreground">
                        {payment.reference || payment.note || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      <Panel icon={Undo2} title="Refunds" subtitle="Money paid back through sales returns">
        {(returns ?? []).filter((r) => Number(r.refund_amount) > 0).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No refunds recorded.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Sale</th>
                  <th className="px-3 py-2 text-right font-semibold">Returned</th>
                  <th className="px-3 py-2 text-right font-semibold">Refund</th>
                  <th className="px-3 py-2 font-semibold">Method</th>
                  <th className="px-4 py-2 font-semibold">Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(returns ?? [])
                  .filter((r) => Number(r.refund_amount) > 0)
                  .map((entry) => (
                    <tr key={entry.id} className="hover:bg-accent/30">
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {formatDate(entry.return_date)}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {saleNo.get(entry.sale_id) ?? "—"}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right">
                        {formatMoney(Number(entry.total))}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                        {formatMoney(Number(entry.refund_amount))}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {entry.refund_method ? PAYMENT_METHOD_LABELS[entry.refund_method] : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={entry.restock ? "secondary" : "outline"}>
                          {entry.restock ? "Restocked" : "Not restocked"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <CollectionDialog open={collectOpen} onOpenChange={setCollectOpen} />
    </div>
  );
}
