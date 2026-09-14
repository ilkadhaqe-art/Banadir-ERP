import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, ScrollText, Wallet } from "lucide-react";
import { useState } from "react";

import { EmptyState, Panel, StatTile } from "@/components/command-center/Panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountBalances } from "@/hooks/useSales";
import { useAuditLog, useProfitLoss } from "@/hooks/useReports";
import { dayKey, formatDate, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/accounting")({
  head: () => ({
    meta: [
      { title: "Accounting — Banadir Online FOS" },
      {
        name: "description",
        content: "Profit and loss, account balances and the full audit trail for the business.",
      },
      { property: "og:title", content: "Accounting — Banadir Online FOS" },
      {
        property: "og:description",
        content: "Daily profit and loss with a complete, immutable audit trail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountingPage,
});

function startOfMonth() {
  const now = new Date();
  return dayKey(new Date(now.getFullYear(), now.getMonth(), 1));
}

function AccountingPage() {
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(dayKey());

  const pl = useProfitLoss({ from, to });
  const balances = useAccountBalances();
  const audit = useAuditLog(100);

  const rows = pl.data ?? [];
  const netProfit = rows.reduce((sum, row) => sum + Number(row.net_profit), 0);
  const grossProfit = rows.reduce((sum, row) => sum + Number(row.gross_profit), 0);
  const expenses = rows.reduce(
    (sum, row) => sum + Number(row.business_expenses) + Number(row.personal_expenses),
    0,
  );

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">FINANCE</p>
        <h1 className="text-xl font-bold sm:text-2xl">Accounting</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profit and loss, cash positions and the audit trail behind every change.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-md">
        <div className="grid gap-1.5">
          <Label htmlFor="acct-from">From</Label>
          <Input
            id="acct-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="acct-to">To</Label>
          <Input id="acct-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Gross profit" value={formatMoney(grossProfit)} loading={pl.isPending} />
        <StatTile
          label="Expenses"
          value={formatMoney(expenses)}
          tone="negative"
          loading={pl.isPending}
        />
        <StatTile
          label="Net profit"
          value={formatMoney(netProfit)}
          tone={netProfit >= 0 ? "positive" : "negative"}
          loading={pl.isPending}
        />
        <StatTile label="Days" value={String(rows.length)} loading={pl.isPending} />
      </div>

      <Panel icon={BookOpen} title="Profit & loss" subtitle="One row per business day">
        {pl.isError ? (
          <p className="py-8 text-center text-sm text-destructive">
            P&L unavailable — read failed.
          </p>
        ) : pl.isPending ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState label="No activity in this period." />
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Day</th>
                  <th className="px-3 py-2 text-right font-semibold">Sales</th>
                  <th className="px-3 py-2 text-right font-semibold">COGS</th>
                  <th className="px-3 py-2 text-right font-semibold">Gross</th>
                  <th className="px-3 py-2 text-right font-semibold">Expenses</th>
                  <th className="px-3 py-2 text-right font-semibold">Net</th>
                  <th className="px-3 py-2 text-right font-semibold">Target</th>
                  <th className="px-4 py-2 text-right font-semibold">Cash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.day} className="hover:bg-accent/30">
                    <td className="whitespace-nowrap px-4 py-2.5">{formatDate(row.day)}</td>
                    <td className="num px-3 py-2.5 text-right">
                      {formatMoney(Number(row.sales_net))}
                    </td>
                    <td className="num px-3 py-2.5 text-right text-muted-foreground">
                      {formatMoney(Number(row.cogs))}
                    </td>
                    <td className="num px-3 py-2.5 text-right">
                      {formatMoney(Number(row.gross_profit))}
                    </td>
                    <td className="num px-3 py-2.5 text-right text-muted-foreground">
                      {formatMoney(Number(row.business_expenses) + Number(row.personal_expenses))}
                    </td>
                    <td className="num px-3 py-2.5 text-right font-semibold">
                      {formatMoney(Number(row.net_profit))}
                    </td>
                    <td className="num px-3 py-2.5 text-right text-muted-foreground">
                      {formatMoney(Number(row.target))}
                    </td>
                    <td className="num px-4 py-2.5 text-right">
                      {formatMoney(Number(row.cash_balance))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={Wallet} title="Account balances" subtitle="Cash and digital wallets">
          {balances.isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : (balances.data ?? []).length === 0 ? (
            <EmptyState label="No accounts configured." />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {(balances.data ?? []).map((account) => (
                <li
                  key={account.account_id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <span className="truncate font-medium">{account.name}</span>
                  <span className="num font-semibold">{formatMoney(Number(account.balance))}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon={ScrollText} title="Audit trail" subtitle="Latest 100 recorded actions">
          {audit.isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : (audit.data ?? []).length === 0 ? (
            <EmptyState label="No audit entries yet." />
          ) : (
            <ul className="max-h-[420px] divide-y divide-border overflow-y-auto text-sm">
              {(audit.data ?? []).map((entry) => (
                <li key={entry.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{entry.action}</span>
                    <Badge variant="outline">{entry.entity_table ?? "system"}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(entry.created_at)} · {entry.actor_name ?? entry.actor ?? "system"}
                    {entry.reason ? ` · ${entry.reason}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
