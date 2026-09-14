import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, CreditCard, Wallet } from "lucide-react";
import { useMemo, useState } from "react";

import { Panel, StatTile } from "@/components/command-center/Panel";
import { TransferDialog } from "@/components/sales/TransferDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountBalances, useAccountTransfers } from "@/hooks/useSales";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/payment-accounts")({
  head: () => ({
    meta: [
      { title: "Payment Accounts — Banadir Online FOS" },
      {
        name: "description",
        content:
          "Cash, mobile money and bank account balances with transfers in Banadir Online FOS.",
      },
      { property: "og:title", content: "Payment Accounts — Banadir Online FOS" },
      {
        property: "og:description",
        content: "Canonical account balances and the transfer history behind them.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaymentAccountsPage,
});

function PaymentAccountsPage() {
  const { data: balances, isPending, isError } = useAccountBalances();
  const { data: transfers } = useAccountTransfers(100);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState<string | null>(null);

  const accountName = useMemo(
    () => new Map((balances ?? []).map((row) => [row.account_id, row.name])),
    [balances],
  );

  const active = (balances ?? []).filter((row) => row.active);
  const businessTotal = active
    .filter((row) => row.scope === "business")
    .reduce((sum, row) => sum + Number(row.balance), 0);
  const personalTotal = active
    .filter((row) => row.scope === "personal")
    .reduce((sum, row) => sum + Number(row.balance), 0);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">MONEY</p>
          <h1 className="text-xl font-bold sm:text-2xl">Payment accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Balances are derived from the canonical transaction ledger.
          </p>
        </div>
        <Button
          onClick={() => {
            setTransferFrom(null);
            setTransferOpen(true);
          }}
        >
          <ArrowLeftRight className="size-4" /> New transfer
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Accounts" value={formatNumber(active.length)} loading={isPending} />
        <StatTile label="Business cash" value={formatMoney(businessTotal)} loading={isPending} />
        <StatTile label="Personal cash" value={formatMoney(personalTotal)} loading={isPending} />
        <StatTile
          label="Total held"
          value={formatMoney(businessTotal + personalTotal)}
          loading={isPending}
        />
      </div>

      <Panel icon={Wallet} title="Accounts" subtitle="Cash, mobile money and bank">
        {isError ? (
          <p className="py-8 text-center text-sm text-destructive">
            Accounts unavailable — read failed.
          </p>
        ) : isPending ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (balances ?? []).length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No payment accounts configured.
          </p>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Account</th>
                  <th className="px-3 py-2 font-semibold">Kind</th>
                  <th className="px-3 py-2 font-semibold">Scope</th>
                  <th className="px-3 py-2 text-right font-semibold">Opening</th>
                  <th className="px-3 py-2 text-right font-semibold">Balance</th>
                  <th className="px-4 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(balances ?? []).map((row) => (
                  <tr key={row.account_id} className="hover:bg-accent/30">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                          <CreditCard className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.name}</p>
                          {!row.active ? (
                            <p className="text-xs text-muted-foreground">Inactive</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 capitalize text-muted-foreground">{row.kind}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={row.scope === "business" ? "secondary" : "outline"}>
                        {row.scope === "business" ? "Business" : "Personal"}
                      </Badge>
                    </td>
                    <td className="num whitespace-nowrap px-3 py-2.5 text-right text-muted-foreground">
                      {formatMoney(Number(row.opening_balance))}
                    </td>
                    <td className="num whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                      {formatMoney(Number(row.balance))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!row.active}
                        onClick={() => {
                          setTransferFrom(row.account_id);
                          setTransferOpen(true);
                        }}
                      >
                        Transfer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel icon={ArrowLeftRight} title="Transfers" subtitle="Money moved between accounts">
        {(transfers ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No transfers recorded.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">From</th>
                  <th className="px-3 py-2 font-semibold">To</th>
                  <th className="px-3 py-2 text-right font-semibold">Amount</th>
                  <th className="px-4 py-2 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(transfers ?? []).map((entry) => (
                  <tr key={entry.id} className="hover:bg-accent/30">
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {formatDate(entry.transfer_date)}
                    </td>
                    <td className="px-3 py-2.5">{accountName.get(entry.from_account_id) ?? "—"}</td>
                    <td className="px-3 py-2.5">{accountName.get(entry.to_account_id) ?? "—"}</td>
                    <td className="num whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                      {formatMoney(Number(entry.amount))}
                    </td>
                    <td className="max-w-[240px] truncate px-4 py-2.5 text-muted-foreground">
                      {entry.note || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        fromAccountId={transferFrom}
      />
    </div>
  );
}
