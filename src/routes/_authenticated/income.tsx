import { createFileRoute } from "@tanstack/react-router";
import { Plus, TrendingUp, Trash2 } from "lucide-react";
import { useState } from "react";

import { EmptyState, Panel, StatTile } from "@/components/command-center/Panel";
import { MoneyEntryDialog } from "@/components/procurement/MoneyEntryDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMoneyLedger, useVoidMoneyEntry } from "@/hooks/useProcurement";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/income")({
  head: () => ({
    meta: [
      { title: "Other Income — Banadir Online FOS" },
      {
        name: "description",
        content: "Non-sales income entries and their account impact in Banadir Online FOS.",
      },
      { property: "og:title", content: "Other Income — Banadir Online FOS" },
      {
        property: "og:description",
        content: "Income outside sales, posted to accounts and the daily engine.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IncomePage,
});

function IncomePage() {
  const [scope, setScope] = useState<"business" | "personal" | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isPending, isError } = useMoneyLedger({ type: "income", scope, limit: 200 });
  const voidEntry = useVoidMoneyEntry();

  const rows = data ?? [];
  const active = rows.filter((row) => row.status === "active");
  const total = active.reduce((sum, row) => sum + Number(row.amount), 0);
  const business = active
    .filter((row) => row.scope === "business")
    .reduce((sum, row) => sum + Number(row.amount), 0);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">MONEY</p>
          <h1 className="text-xl font-bold sm:text-2xl">Other income</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Income that does not come from sales — still part of the daily engine.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" /> Record income
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Entries" value={formatNumber(active.length)} loading={isPending} />
        <StatTile label="Total" value={formatMoney(total)} tone="positive" loading={isPending} />
        <StatTile label="Business" value={formatMoney(business)} loading={isPending} />
        <StatTile label="Personal" value={formatMoney(total - business)} loading={isPending} />
      </div>

      <Panel
        icon={TrendingUp}
        title="Income ledger"
        subtitle="Voiding an entry rebuilds the affected day"
        action={
          <Select value={scope} onValueChange={(value) => setScope(value as typeof scope)}>
            <SelectTrigger className="w-[160px]" aria-label="Filter scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All scopes</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
            </SelectContent>
          </Select>
        }
      >
        {isError ? (
          <p className="py-8 text-center text-sm text-destructive">
            Income unavailable — read failed.
          </p>
        ) : isPending ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState label="No income entries recorded yet." />
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Category</th>
                  <th className="px-3 py-2 font-semibold">Scope</th>
                  <th className="px-3 py-2 font-semibold">Account</th>
                  <th className="px-3 py-2 font-semibold">Description</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                  <th className="px-4 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-accent/30">
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                      {formatDate(row.txn_date)}
                    </td>
                    <td className="px-3 py-2.5 font-medium">{row.category ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline">{row.scope}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.account_name ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.description ?? "—"}</td>
                    <td className="num whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                      {row.status === "void" ? (
                        <span className="line-through text-muted-foreground">
                          {formatMoney(Number(row.amount))}
                        </span>
                      ) : (
                        formatMoney(Number(row.amount))
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      {row.status === "active" ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Void entry"
                          disabled={voidEntry.isPending}
                          onClick={() => voidEntry.mutate({ id: row.id })}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : (
                        <Badge variant="outline">Void</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <MoneyEntryDialog open={dialogOpen} onOpenChange={setDialogOpen} kind="income" />
    </div>
  );
}
