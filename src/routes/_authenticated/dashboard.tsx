import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Plus, ReceiptText, TrendingUp } from "lucide-react";
import { useState } from "react";

import { BreakdownDialog, type BreakdownRow } from "@/components/command-center/BreakdownDialog";
import {
  AchievementBand,
  AlertsPanel,
  BottomStatsStrip,
  CommandPeriodStrip,
  DriversCard,
  FinancialSummaryDonut,
  KpiStrip,
  ObligationsPair,
  OperationalStatus,
  PaymentAccountsCard,
  PerformanceMatrix,
  PerformanceOverview,
  QuickActionsRow,
  RecentActivities,
  SalesInvoicesCard,
  WhyTargetCard,
  type QuickActionKind,
} from "@/components/command-center/DashboardSections";
import { LedgerPanel } from "@/components/command-center/LedgerPanel";
import { TransactionDialog } from "@/components/command-center/TransactionDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  useDailyStates,
  useFinancialSnapshot,
  useFinancialTransactions,
} from "@/hooks/useFinancialSnapshot";
import { useDrivers } from "@/hooks/useLogistics";
import { useBusinessOverview } from "@/hooks/useReports";
import { useAccountBalances, useSales } from "@/hooks/useSales";
import { dayKey, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Command Center — Banadir Online FOS" },
      {
        name: "description",
        content:
          "Live command center for Banadir Online FOS: targets, income, expenses and profit at a glance.",
      },
      { property: "og:title", content: "Command Center — Banadir Online FOS" },
      {
        property: "og:description",
        content: "Live targets, income, expenses and profit for Banadir Online FOS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

type BreakdownKey =
  | "target"
  | "obligations"
  | "cash"
  | "receivables"
  | "capital"
  | "achievement"
  | "period"
  | "sales"
  | "expenses"
  | "guaranteed"
  | "plusminus";

function DashboardPage() {
  const { profile } = useAuth();
  const firstName = (profile?.full_name ?? "Admin").split(" ")[0];
  const { data: snapshot, isPending, isError, error, isFetching } = useFinancialSnapshot();

  // Canonical read models feeding the rails and strips — no client-side math
  // beyond summing the engine's own per-day rows for the matrix windows.
  const { data: dailyStates, isPending: statesPending } = useDailyStates();
  const { data: transactions, isPending: txnsPending } = useFinancialTransactions({ limit: 7 });
  const { data: sales, isPending: salesPending } = useSales({ limit: 5 });
  const { data: drivers, isPending: driversPending } = useDrivers();
  const { data: accounts, isPending: accountsPending } = useAccountBalances();

  const today = snapshot?.current_date ?? dayKey();
  const now = new Date(`${today}T00:00:00`);
  const monthRange = {
    from: dayKey(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: today,
  };
  const yearRange = { from: dayKey(new Date(now.getFullYear(), 0, 1)), to: today };
  const { data: monthOverview, isPending: monthPending } = useBusinessOverview(monthRange);
  const { data: yearOverview } = useBusinessOverview(yearRange);

  const [txnKind, setTxnKind] = useState<QuickActionKind | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownKey | null>(null);

  // Engine unavailable: never present a fabricated zero as financial truth.
  if (isError && !snapshot) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" />
          <h1 className="text-base font-semibold">Financial engine unavailable</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          The canonical snapshot could not be read, so no figures are shown. {error?.message}
        </p>
      </div>
    );
  }

  const loading = isPending && !snapshot;
  const totals = snapshot?.period_totals;
  const period = snapshot?.financial_period;
  const openBreakdown = (key: string) => setBreakdown(key as BreakdownKey);

  const breakdowns: Record<
    BreakdownKey,
    { title: string; description: string; rows: BreakdownRow[] }
  > = {
    target: {
      title: "Why is today's target this amount?",
      description: "Today's requirement exactly as the canonical engine computed it.",
      rows: [
        { label: "Business obligations", value: snapshot?.business_obligation_today ?? 0 },
        { label: "Personal obligations", value: snapshot?.personal_obligation_today ?? 0 },
        { label: "Target base", value: snapshot?.today_target_base ?? 0, muted: true },
        { label: "Carried deficit (carry-in)", value: snapshot?.carry_in ?? 0 },
        { label: "Today's Target", value: snapshot?.today_target ?? 0, emphasis: true },
        { label: "Achievement so far", value: snapshot?.today_achievement ?? 0 },
        { label: "PLUS (surplus)", value: snapshot?.today_plus ?? 0 },
        { label: "MINUS (shortfall)", value: snapshot?.today_minus ?? 0 },
        { label: "Carry-out to tomorrow", value: snapshot?.carry_out ?? 0, muted: true },
      ],
    },
    obligations: {
      title: "Obligation Breakdown",
      description: "Daily, Friday and monthly shares in force today.",
      rows: [
        { label: "Business obligation today", value: snapshot?.business_obligation_today ?? 0 },
        { label: "Personal obligation today", value: snapshot?.personal_obligation_today ?? 0 },
        { label: "Business expenses paid today", value: snapshot?.today.business_expenses ?? 0 },
        { label: "Personal expenses paid today", value: snapshot?.today.personal_expenses ?? 0 },
        {
          label: "Total obligation today",
          value:
            (snapshot?.business_obligation_today ?? 0) + (snapshot?.personal_obligation_today ?? 0),
          emphasis: true,
        },
      ],
    },
    achievement: {
      title: "Achievement Breakdown",
      description: "What counted toward today's requirement.",
      rows: [
        { label: "Sales (net)", value: snapshot?.today.sales ?? 0 },
        { label: "Cost of goods", value: -(snapshot?.today.cogs ?? 0) },
        { label: "Gross profit", value: snapshot?.today.gross_profit ?? 0, muted: true },
        { label: "Guaranteed income", value: snapshot?.today.guaranteed_income ?? 0 },
        { label: "Other income", value: snapshot?.today.other_income ?? 0 },
        { label: "Collections", value: snapshot?.today.collections ?? 0, muted: true },
        { label: "Achievement", value: snapshot?.today_achievement ?? 0, emphasis: true },
      ],
    },
    sales: {
      title: "Sales Breakdown",
      description: "Canonical sales facts for today and the current period.",
      rows: [
        { label: "Sales today", value: snapshot?.today.sales ?? 0 },
        { label: "Cost of goods today", value: -(snapshot?.today.cogs ?? 0) },
        { label: "Gross profit today", value: snapshot?.today.gross_profit ?? 0, emphasis: true },
        { label: "Period sales", value: totals?.sales ?? 0 },
        { label: "Period gross profit", value: totals?.gross_profit ?? 0 },
      ],
    },
    expenses: {
      title: "Expense Breakdown",
      description: "Business and personal expenses remain separated.",
      rows: [
        { label: "Business expenses today", value: snapshot?.today.business_expenses ?? 0 },
        { label: "Personal expenses today", value: snapshot?.today.personal_expenses ?? 0 },
        { label: "Period business expenses", value: totals?.business_expenses ?? 0 },
        { label: "Period personal expenses", value: totals?.personal_expenses ?? 0 },
        {
          label: "Period total expenses",
          value: (totals?.business_expenses ?? 0) + (totals?.personal_expenses ?? 0),
          emphasis: true,
        },
      ],
    },
    guaranteed: {
      title: "Guaranteed Income Breakdown",
      description: "Posted automatically every day from the active rules.",
      rows: [
        { label: "Guaranteed income today", value: snapshot?.today.guaranteed_income ?? 0 },
        {
          label: "Period guaranteed income",
          value: totals?.guaranteed_income ?? 0,
          emphasis: true,
        },
        { label: "Other income today", value: snapshot?.today.other_income ?? 0 },
        { label: "Period other income", value: totals?.other_income ?? 0 },
      ],
    },
    plusminus: {
      title: "PLUS / MINUS Breakdown",
      description: "Surplus and pressure carried inside the current period.",
      rows: [
        { label: "Carry-in (pressure from earlier days)", value: snapshot?.carry_in ?? 0 },
        { label: "PLUS today", value: snapshot?.today_plus ?? 0 },
        { label: "MINUS today", value: snapshot?.today_minus ?? 0 },
        { label: "Carry-out to tomorrow", value: snapshot?.carry_out ?? 0 },
        { label: "Period PLUS total", value: totals?.plus_total ?? 0 },
        { label: "Period MINUS total", value: totals?.minus_total ?? 0, emphasis: true },
      ],
    },
    cash: {
      title: "Cash Breakdown",
      description: "Cash position from the canonical daily chain.",
      rows: [
        { label: "Sales collected today", value: snapshot?.today.sales ?? 0 },
        { label: "Debt collections", value: snapshot?.today.collections ?? 0 },
        { label: "Income received", value: snapshot?.today.other_income ?? 0 },
        { label: "Guaranteed income", value: snapshot?.today.guaranteed_income ?? 0 },
        { label: "Business expenses", value: -(snapshot?.today.business_expenses ?? 0) },
        { label: "Personal expenses", value: -(snapshot?.today.personal_expenses ?? 0) },
        { label: "Cash balance", value: snapshot?.cash_balance ?? 0, emphasis: true },
      ],
    },
    receivables: {
      title: "Receivable Breakdown",
      description: "Unpaid sales less collections, carried by the engine.",
      rows: [
        { label: "Sales (net) today", value: snapshot?.today.sales ?? 0 },
        { label: "Collections today", value: snapshot?.today.collections ?? 0 },
        { label: "Period collections", value: totals?.collections ?? 0 },
        { label: "Outstanding receivables", value: snapshot?.receivables ?? 0, emphasis: true },
      ],
    },
    capital: {
      title: "Capital Breakdown",
      description: "Business capital tracked by the canonical chain.",
      rows: [
        { label: "Period surplus (PLUS)", value: totals?.plus_total ?? 0 },
        { label: "Period deficit (MINUS)", value: totals?.minus_total ?? 0 },
        { label: "Business capital", value: snapshot?.business_capital ?? 0, emphasis: true },
      ],
    },
    period: {
      title: "Period Totals",
      description: `Financial period ${period?.start_date ?? ""} → ${period?.end_date ?? ""}`,
      rows: [
        { label: "Sales", value: totals?.sales ?? 0 },
        { label: "Cost of goods", value: totals?.cogs ?? 0 },
        { label: "Gross profit", value: totals?.gross_profit ?? 0 },
        { label: "Business expenses", value: totals?.business_expenses ?? 0 },
        { label: "Personal expenses", value: totals?.personal_expenses ?? 0 },
        { label: "Guaranteed income", value: totals?.guaranteed_income ?? 0 },
        { label: "Collections", value: totals?.collections ?? 0 },
        { label: "Target", value: totals?.target ?? 0 },
        { label: "Achievement", value: totals?.achievement ?? 0 },
        { label: "Net profit", value: totals?.net_profit ?? 0, emphasis: true },
      ],
    },
  };

  const active = breakdown ? breakdowns[breakdown] : null;

  return (
    <div className="space-y-3">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold sm:text-2xl">Good day, {firstName}! 👋</h1>
          <p className="truncate text-sm text-muted-foreground">
            {snapshot
              ? `Canonical engine · ${formatDate(snapshot.current_date)}${isFetching ? " · syncing" : ""}`
              : "Loading canonical engine…"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setTxnKind("sale")}>
            <Plus className="size-4" /> Add Sale
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setTxnKind("expense")}>
            <ReceiptText className="size-4" /> Add Expense
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setTxnKind("income")}>
            <TrendingUp className="size-4" /> Add Income
          </Button>
        </div>
      </header>

      <CommandPeriodStrip snapshot={snapshot} loading={loading} />
      <KpiStrip snapshot={snapshot} loading={loading} onBreakdown={openBreakdown} />

      <div className="grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-3">
          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            <PerformanceOverview
              snapshot={snapshot}
              loading={loading}
              onBreakdown={openBreakdown}
            />
            <FinancialSummaryDonut
              snapshot={snapshot}
              loading={loading}
              onBreakdown={openBreakdown}
            />
          </div>

          <QuickActionsRow onAction={(kind) => setTxnKind(kind)} />

          <AchievementBand snapshot={snapshot} loading={loading} onBreakdown={openBreakdown} />

          <div className="grid min-w-0 items-start gap-3 md:grid-cols-2 2xl:grid-cols-3">
            <RecentActivities transactions={transactions} loading={txnsPending && !transactions} />
            <AlertsPanel
              snapshot={snapshot}
              overview={monthOverview}
              loading={loading}
              onBreakdown={openBreakdown}
            />
            <WhyTargetCard snapshot={snapshot} loading={loading} onBreakdown={openBreakdown} />
          </div>

          <ObligationsPair snapshot={snapshot} loading={loading} onBreakdown={openBreakdown} />

          <PerformanceMatrix
            snapshot={snapshot}
            states={dailyStates}
            loading={(statesPending && !dailyStates) || loading}
          />

          <OperationalStatus snapshot={snapshot} loading={loading} />

          <LedgerPanel />
        </div>

        <aside className="min-w-0 space-y-3">
          <SalesInvoicesCard sales={sales} loading={salesPending && !sales} />
          <DriversCard drivers={drivers} loading={driversPending && !drivers} />
          <PaymentAccountsCard accounts={accounts} loading={accountsPending && !accounts} />
        </aside>
      </div>

      <BottomStatsStrip
        snapshot={snapshot}
        month={monthOverview}
        year={yearOverview}
        loading={loading || (monthPending && !monthOverview)}
      />

      <TransactionDialog
        open={txnKind !== null}
        onOpenChange={(open) => !open && setTxnKind(null)}
        kind={txnKind ?? "sale"}
      />

      {active ? (
        <BreakdownDialog
          open={breakdown !== null}
          onOpenChange={(open) => !open && setBreakdown(null)}
          title={active.title}
          description={active.description}
          rows={active.rows}
          footer="Values read directly from financial_snapshot() — nothing is calculated in the browser."
        />
      ) : null}
    </div>
  );
}
