import { Link } from "@tanstack/react-router";
import { formatDistanceToNowStrict } from "date-fns";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BellRing,
  CalendarClock,
  CircleDollarSign,
  Coins,
  HandCoins,
  HelpCircle,
  Landmark,
  LucideIcon,
  Package,
  PiggyBank,
  Plus,
  ReceiptText,
  Scale,
  ShoppingCart,
  Smartphone,
  Target,
  TrendingUp,
  Truck,
  Wallet,
  ArrowLeftRight,
} from "lucide-react";

import { MoneyRow, NoteBox, Panel, StatTile } from "./Panel";
import { Skeleton } from "@/components/ui/skeleton";
import type { AccountBalance, PaymentAccount, SaleOverview } from "@/lib/sales-types";
import type { Driver } from "@/lib/logistics-types";
import type { BusinessOverview } from "@/lib/reports-types";
import type { DailyState, FinancialSnapshot, FinancialTransaction } from "@/lib/financial-types";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type SectionProps = {
  snapshot?: FinancialSnapshot | undefined;
  loading?: boolean | undefined;
  onBreakdown?: ((key: string) => void) | undefined;
};

const DASH = "—";

type ChipTone = "info" | "success" | "destructive" | "warning" | "primary" | "brand";

const chipTone: Record<ChipTone, string> = {
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-warning",
  primary: "bg-primary/10 text-primary",
  brand: "bg-brand/40 text-brand-foreground",
};

/** Icon chip used by KPI cards and quick actions (reference visual language). */
function IconChip({ icon: Icon, tone }: { icon: LucideIcon; tone: ChipTone }) {
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", chipTone[tone])}>
      <Icon className="size-4" />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Command period strip — current financial period, day X of Y         */
/* ------------------------------------------------------------------ */
export function CommandPeriodStrip({ snapshot, loading }: SectionProps) {
  const period = snapshot?.financial_period;
  const elapsedPct =
    period && period.days_total > 0
      ? Math.min((period.days_elapsed / period.days_total) * 100, 100)
      : 0;

  return (
    <section className="motion-safe:animate-in motion-safe:fade-in rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <IconChip icon={CalendarClock} tone="primary" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground">
              CURRENT FINANCIAL PERIOD
            </p>
            {loading ? (
              <Skeleton className="mt-1 h-5 w-44" />
            ) : (
              <p className="truncate text-sm font-bold sm:text-base">
                {period?.start_date
                  ? `${formatDate(period.start_date)} — ${formatDate(period.end_date ?? "")}`
                  : "No active period"}
              </p>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground">TODAY</p>
          {loading ? (
            <Skeleton className="mt-1 h-5 w-32" />
          ) : (
            <p className="truncate text-sm font-semibold">
              {snapshot ? formatDate(snapshot.current_date) : DASH}
              {snapshot?.today.is_friday ? (
                <span className="ml-2 rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-bold text-info">
                  FRIDAY
                </span>
              ) : null}
            </p>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground">
              DAY {period?.days_elapsed ?? 0} OF {period?.days_total ?? 0}
            </p>
            <p className="num text-[11px] font-semibold text-muted-foreground">
              {period?.days_remaining ?? 0} left
            </p>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${elapsedPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 xl:justify-end">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-success">
            <span className="size-1.5 rounded-full bg-success" />
            Engine {period?.status === "open" ? "active" : (period?.status ?? "syncing")}
          </span>
          {snapshot ? (
            <span className="hidden text-[10px] text-muted-foreground 2xl:block">
              Updated {new Date(snapshot.computed_at).toLocaleTimeString()}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* KPI strip — 8 executive cards                                       */
/* ------------------------------------------------------------------ */
export function KpiStrip({ snapshot, loading, onBreakdown }: SectionProps) {
  const totals = snapshot?.period_totals;
  const progress = Math.min(snapshot?.progress_percentage ?? 0, 100);
  const behind = (snapshot?.today_minus ?? 0) > 0;

  const cards: {
    label: string;
    value: number;
    icon: LucideIcon;
    tone: ChipTone;
    hint: string;
    up?: boolean;
    key: string;
  }[] = [
    {
      label: "Total Sales",
      value: snapshot?.today.sales ?? 0,
      icon: ShoppingCart,
      tone: "info",
      hint: `Period ${formatMoney(totals?.sales ?? 0)}`,
      up: true,
      key: "sales",
    },
    {
      label: "Total Income",
      value: (snapshot?.today.other_income ?? 0) + (snapshot?.today.guaranteed_income ?? 0),
      icon: CircleDollarSign,
      tone: "success",
      hint: `Period ${formatMoney((totals?.other_income ?? 0) + (totals?.guaranteed_income ?? 0))}`,
      up: true,
      key: "achievement",
    },
    {
      label: "Total Expenses",
      value: (snapshot?.today.business_expenses ?? 0) + (snapshot?.today.personal_expenses ?? 0),
      icon: ReceiptText,
      tone: "destructive",
      hint: `Period ${formatMoney((totals?.business_expenses ?? 0) + (totals?.personal_expenses ?? 0))}`,
      up: false,
      key: "expenses",
    },
    {
      label: "Net Profit",
      value: snapshot?.today.net_profit ?? 0,
      icon: PiggyBank,
      tone: "warning",
      hint: `Period ${formatMoney(totals?.net_profit ?? 0)}`,
      up: (snapshot?.today.net_profit ?? 0) >= 0,
      key: "period",
    },
  ];

  const tail: typeof cards = [
    {
      label: "Cash in Hand",
      value: snapshot?.cash_balance ?? 0,
      icon: Banknote,
      tone: "primary",
      hint: "Canonical cash chain",
      key: "cash",
    },
    {
      label: "Receivables",
      value: snapshot?.receivables ?? 0,
      icon: HandCoins,
      tone: "warning",
      hint: `Collected ${formatMoney(totals?.collections ?? 0)}`,
      key: "receivables",
    },
    {
      label: "Capital",
      value: snapshot?.business_capital ?? 0,
      icon: Landmark,
      tone: "info",
      hint: "Business capital",
      key: "capital",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8">
      {cards.map((card, i) => (
        <button
          key={card.label}
          type="button"
          onClick={() => onBreakdown?.(card.key)}
          className="motion-safe:animate-in motion-safe:fade-in min-w-0 rounded-2xl border border-border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="flex items-center gap-2.5">
            <IconChip icon={card.icon} tone={card.tone} />
            <p className="truncate text-[10px] font-bold tracking-[0.1em] text-muted-foreground">
              {card.label.toUpperCase()}
            </p>
          </div>
          {loading ? (
            <Skeleton className="mt-3 h-7 w-24" />
          ) : (
            <p className="num mt-2.5 truncate text-xl font-bold">{formatMoney(card.value)}</p>
          )}
          <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            {card.up === undefined ? null : card.up ? (
              <ArrowUpRight className="size-3 shrink-0 text-success" />
            ) : (
              <ArrowDownRight className="size-3 shrink-0 text-destructive" />
            )}
            <span className="truncate">{card.hint}</span>
          </p>
        </button>
      ))}

      {/* Today's Target — the primary KPI */}
      <button
        type="button"
        onClick={() => onBreakdown?.("target")}
        className="motion-safe:animate-in motion-safe:fade-in min-w-0 rounded-2xl border border-border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
        style={{ animationDelay: "160ms" }}
      >
        <div className="flex items-center gap-2.5">
          <IconChip icon={Target} tone="brand" />
          <p className="truncate text-[10px] font-bold tracking-[0.1em] text-muted-foreground">
            TODAY'S TARGET
          </p>
        </div>
        {loading ? (
          <Skeleton className="mt-3 h-7 w-24" />
        ) : (
          <p className="num mt-2.5 truncate text-xl font-bold">
            {formatMoney(snapshot?.today_target ?? 0)}
          </p>
        )}
        <div className="mt-1.5 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Progress</span>
          <span className="num font-bold">{Math.round(progress)}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700",
              behind ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </button>

      {tail.map((card, i) => (
        <button
          key={card.label}
          type="button"
          onClick={() => onBreakdown?.(card.key)}
          className="motion-safe:animate-in motion-safe:fade-in min-w-0 rounded-2xl border border-border bg-card p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
          style={{ animationDelay: `${(i + 5) * 40}ms` }}
        >
          <div className="flex items-center gap-2.5">
            <IconChip icon={card.icon} tone={card.tone} />
            <p className="truncate text-[10px] font-bold tracking-[0.1em] text-muted-foreground">
              {card.label.toUpperCase()}
            </p>
          </div>
          {loading ? (
            <Skeleton className="mt-3 h-7 w-24" />
          ) : (
            <p className="num mt-2.5 truncate text-xl font-bold">{formatMoney(card.value)}</p>
          )}
          <p className="mt-1 truncate text-[11px] text-muted-foreground">{card.hint}</p>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Performance overview (period) + financial summary donut             */
/* ------------------------------------------------------------------ */
export function PerformanceOverview({ snapshot, loading, onBreakdown }: SectionProps) {
  const totals = snapshot?.period_totals;
  const tiles = [
    {
      label: "Sales",
      value: totals?.sales ?? 0,
      icon: ShoppingCart,
      tone: "info" as ChipTone,
      bar: "bg-info",
      key: "sales",
    },
    {
      label: "Income",
      value: (totals?.guaranteed_income ?? 0) + (totals?.other_income ?? 0),
      icon: CircleDollarSign,
      tone: "success" as ChipTone,
      bar: "bg-success",
      key: "achievement",
    },
    {
      label: "Expenses",
      value: (totals?.business_expenses ?? 0) + (totals?.personal_expenses ?? 0),
      icon: ReceiptText,
      tone: "destructive" as ChipTone,
      bar: "bg-destructive",
      key: "expenses",
    },
    {
      label: "Profit",
      value: totals?.net_profit ?? 0,
      icon: PiggyBank,
      tone: "warning" as ChipTone,
      bar: "bg-warning",
      key: "period",
    },
  ];

  return (
    <Panel title="Performance Overview" subtitle="Current financial period" className="min-w-0">
      <div className="grid gap-3 sm:grid-cols-2">
        {tiles.map((tile) => (
          <button
            key={tile.label}
            type="button"
            onClick={() => onBreakdown?.(tile.key)}
            className="min-w-0 rounded-xl border border-border/70 p-3 text-left transition-colors hover:bg-accent/30"
          >
            <div className="flex items-center gap-2">
              <IconChip icon={tile.icon} tone={tile.tone} />
              <p className="truncate text-xs font-semibold">{tile.label}</p>
            </div>
            {loading ? (
              <Skeleton className="mt-2.5 h-7 w-24" />
            ) : (
              <p className="num mt-2 truncate text-xl font-bold">{formatMoney(tile.value)}</p>
            )}
            <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full w-full rounded-full", tile.bar)} />
            </div>
          </button>
        ))}
      </div>
    </Panel>
  );
}

type DonutSegment = { label: string; value: number; color: string; key: string };

function Donut({ segments, loading }: { segments: DonutSegment[]; loading?: boolean | undefined }) {
  const total = segments.reduce((acc, s) => acc + Math.max(s.value, 0), 0);
  const R = 54;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="relative grid size-40 shrink-0 place-items-center">
      <svg viewBox="0 0 128 128" className="size-40 -rotate-90">
        <circle cx="64" cy="64" r={R} fill="none" strokeWidth="14" className="stroke-muted" />
        {total > 0
          ? segments.map((seg) => {
              const len = (Math.max(seg.value, 0) / total) * C;
              const el = (
                <circle
                  key={seg.key}
                  cx="64"
                  cy="64"
                  r={R}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="14"
                  strokeDasharray={`${Math.max(len - 2, 0)} ${C - Math.max(len - 2, 0)}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                  className="transition-all duration-700"
                />
              );
              offset += len;
              return el;
            })
          : null}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {loading ? (
          <Skeleton className="h-6 w-20" />
        ) : (
          <div>
            <p className="num text-lg font-bold">{formatMoney(total)}</p>
            <p className="text-[10px] text-muted-foreground">Total Balance</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function FinancialSummaryDonut({ snapshot, loading, onBreakdown }: SectionProps) {
  const segments: DonutSegment[] = [
    {
      label: "Cash",
      value: snapshot?.cash_balance ?? 0,
      color: "var(--color-chart-2)",
      key: "cash",
    },
    {
      label: "Receivables",
      value: snapshot?.receivables ?? 0,
      color: "var(--color-chart-4)",
      key: "receivables",
    },
    {
      label: "Capital",
      value: snapshot?.business_capital ?? 0,
      color: "var(--color-chart-1)",
      key: "capital",
    },
  ];

  return (
    <Panel title="Financial Summary" subtitle="Cash · receivables · capital" className="min-w-0">
      <div className="flex flex-wrap items-center gap-6">
        <Donut segments={segments} loading={loading} />
        <div className="min-w-0 flex-1 space-y-1">
          {segments.map((seg) => (
            <button
              key={seg.key}
              type="button"
              onClick={() => onBreakdown?.(seg.key)}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent/40"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="truncate">{seg.label}</span>
              </span>
              {loading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <span className="num shrink-0 font-semibold">{formatMoney(seg.value)}</span>
              )}
            </button>
          ))}
          <NoteBox>
            Cash, receivables and capital are tracked separately by the canonical engine — they are
            never merged.
          </NoteBox>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Quick actions — write dialogs + navigation to existing workflows    */
/* ------------------------------------------------------------------ */
export type QuickActionKind = "sale" | "expense" | "income" | "collection";

export function QuickActionsRow({ onAction }: { onAction: (kind: QuickActionKind) => void }) {
  const actions: (
    | { label: string; icon: LucideIcon; tone: ChipTone; kind: QuickActionKind }
    | { label: string; icon: LucideIcon; tone: ChipTone; to: string }
  )[] = [
    { label: "New Sale", icon: ShoppingCart, tone: "info", kind: "sale" },
    { label: "New Order", icon: Package, tone: "primary", to: "/orders" },
    { label: "New Expense", icon: ReceiptText, tone: "warning", kind: "expense" },
    { label: "New Purchase", icon: Truck, tone: "destructive", to: "/purchases" },
    { label: "Add Income", icon: CircleDollarSign, tone: "success", kind: "income" },
    { label: "Collection", icon: HandCoins, tone: "info", kind: "collection" },
    { label: "New Delivery", icon: Truck, tone: "primary", to: "/delivery" },
    { label: "Add Account", icon: Landmark, tone: "success", to: "/payment-accounts" },
  ];

  const inner = (action: (typeof actions)[number]) => (
    <>
      <IconChip icon={action.icon} tone={action.tone} />
      <span className="truncate text-xs font-semibold">{action.label}</span>
    </>
  );

  return (
    <section className="motion-safe:animate-in motion-safe:fade-in rounded-2xl border border-border bg-card p-3">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {actions.map((action) =>
          "kind" in action ? (
            <button
              key={action.label}
              type="button"
              onClick={() => onAction(action.kind)}
              className="flex min-w-0 flex-col items-center gap-2 rounded-xl p-3 text-center transition-colors hover:bg-accent/40"
            >
              {inner(action)}
            </button>
          ) : (
            <Link
              key={action.label}
              to={action.to}
              className="flex min-w-0 flex-col items-center gap-2 rounded-xl p-3 text-center transition-colors hover:bg-accent/40"
            >
              {inner(action)}
            </Link>
          ),
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Recent activities — canonical ledger events                         */
/* ------------------------------------------------------------------ */
const txnIcon: Record<string, { icon: LucideIcon; tone: ChipTone }> = {
  sale: { icon: ShoppingCart, tone: "info" },
  expense: { icon: ReceiptText, tone: "destructive" },
  income: { icon: TrendingUp, tone: "success" },
  collection: { icon: HandCoins, tone: "warning" },
  capital: { icon: Landmark, tone: "primary" },
  transfer: { icon: ArrowLeftRight, tone: "primary" },
  adjustment: { icon: Scale, tone: "warning" },
};

export function RecentActivities({
  transactions,
  loading,
}: {
  transactions?: FinancialTransaction[] | undefined;
  loading?: boolean | undefined;
}) {
  return (
    <Panel
      title="Recent Activities"
      subtitle="Canonical ledger events"
      className="min-w-0"
      action={
        <span className="text-[11px] font-semibold text-muted-foreground">
          {transactions?.length ?? 0} latest
        </span>
      }
    >
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : transactions && transactions.length > 0 ? (
        <ul className="space-y-1">
          {transactions.slice(0, 7).map((txn) => {
            const meta = txnIcon[txn.type] ?? { icon: Scale, tone: "warning" as ChipTone };
            return (
              <li key={txn.id} className="flex min-w-0 items-center gap-3 rounded-lg px-1 py-1.5">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg",
                    chipTone[meta.tone],
                  )}
                >
                  <meta.icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold capitalize">
                    {txn.type} · {txn.scope}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {txn.description ?? txn.category ?? formatDate(txn.txn_date)} ·{" "}
                    {formatDistanceToNowStrict(new Date(txn.created_at), { addSuffix: true })}
                  </p>
                </div>
                <span className="num shrink-0 text-xs font-bold">{formatMoney(txn.amount)}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Alerts & reminders — derived only from canonical signals            */
/* ------------------------------------------------------------------ */
export function AlertsPanel({
  snapshot,
  overview,
  loading,
  onBreakdown,
}: SectionProps & { overview?: BusinessOverview | undefined }) {
  const alerts: { icon: LucideIcon; tone: ChipTone; title: string; body: string; key: string }[] =
    [];

  if (snapshot) {
    if ((snapshot.today_minus ?? 0) > 0) {
      alerts.push({
        icon: Target,
        tone: "destructive",
        title: "Target Pressure",
        body: `You are behind today's target by ${formatMoney(snapshot.today_minus)}.`,
        key: "target",
      });
    }
    if ((snapshot.carry_in ?? 0) > 0) {
      alerts.push({
        icon: AlertTriangle,
        tone: "warning",
        title: "Carried Pressure",
        body: `${formatMoney(snapshot.carry_in)} of earlier shortfall is inside today's target.`,
        key: "plusminus",
      });
    }
    if ((snapshot.receivables ?? 0) > 0) {
      alerts.push({
        icon: HandCoins,
        tone: "warning",
        title: "Receivables Outstanding",
        body: `${formatMoney(snapshot.receivables)} is still owed by customers.`,
        key: "receivables",
      });
    }
    if ((overview?.low_stock_count ?? 0) > 0) {
      alerts.push({
        icon: Package,
        tone: "destructive",
        title: "Low Stock Alert",
        body: `${overview?.low_stock_count} products are below minimum stock.`,
        key: "period",
      });
    }
    if (
      (snapshot.financial_period.days_remaining ?? 99) <= 3 &&
      snapshot.financial_period.status === "open"
    ) {
      alerts.push({
        icon: CalendarClock,
        tone: "primary",
        title: "Period Closing",
        body: `Only ${snapshot.financial_period.days_remaining} days remain in this financial period.`,
        key: "period",
      });
    }
    if ((snapshot.today_plus ?? 0) > 0) {
      alerts.push({
        icon: TrendingUp,
        tone: "success",
        title: "Surplus Created",
        body: `PLUS ${formatMoney(snapshot.today_plus)} above today's requirement.`,
        key: "plusminus",
      });
    }
  }

  return (
    <Panel
      icon={BellRing}
      title="Alerts & Reminders"
      subtitle="Live canonical signals"
      className="min-w-0"
    >
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : alerts.length > 0 ? (
        <ul className="space-y-1">
          {alerts.slice(0, 6).map((alert) => (
            <li key={alert.title}>
              <button
                type="button"
                onClick={() => onBreakdown?.(alert.key)}
                className="flex w-full min-w-0 items-start gap-3 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-accent/40"
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg",
                    chipTone[alert.tone],
                  )}
                >
                  <alert.icon className="size-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{alert.title}</span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">
                    {alert.body}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No pressure signals — everything is on track.
        </p>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Why is today's target this amount?                                  */
/* ------------------------------------------------------------------ */
export function WhyTargetCard({ snapshot, loading, onBreakdown }: SectionProps) {
  const ahead = (snapshot?.today_plus ?? 0) > 0;
  return (
    <Panel
      icon={HelpCircle}
      title="Why is today's target this amount?"
      subtitle="Explained by the canonical engine"
      className="min-w-0"
    >
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-2 text-xs leading-relaxed">
          <p className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Obligations in force</span>
            <span className="num font-semibold">
              {formatMoney(snapshot?.today_target_base ?? 0)}
            </span>
          </p>
          <p className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">+ Carried deficit (carry-in)</span>
            <span className="num font-semibold">{formatMoney(snapshot?.carry_in ?? 0)}</span>
          </p>
          <p className="flex items-center justify-between gap-3 border-t border-border pt-2">
            <span className="font-semibold">= Today's target</span>
            <span className="num font-bold">{formatMoney(snapshot?.today_target ?? 0)}</span>
          </p>
          <p className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Achievement so far</span>
            <span className="num font-semibold text-success">
              {formatMoney(snapshot?.today_achievement ?? 0)}
            </span>
          </p>
          <p className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">
              {ahead ? "PLUS (surplus)" : "MINUS (shortfall)"}
            </span>
            <span className={cn("num font-semibold", ahead ? "text-success" : "text-destructive")}>
              {formatMoney(ahead ? (snapshot?.today_plus ?? 0) : (snapshot?.today_minus ?? 0))}
            </span>
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => onBreakdown?.("target")}
        className="mt-3 w-full rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Open full target explanation
      </button>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Performance matrix — today / week / month / period                  */
/* ------------------------------------------------------------------ */
type MatrixColumn = { label: string; states: DailyState[] };

function sumBy(states: DailyState[], pick: (s: DailyState) => number): number {
  return states.reduce((acc, s) => acc + pick(s), 0);
}

export function PerformanceMatrix({
  snapshot,
  states,
  loading,
}: SectionProps & { states?: DailyState[] | undefined }) {
  const todayKey = snapshot?.current_date ?? "";
  const todayDate = todayKey ? new Date(`${todayKey}T00:00:00`) : null;

  const columns: MatrixColumn[] = [];
  if (snapshot && todayDate && states) {
    const inRange = (from: Date) => {
      const fromKey = `${from.getFullYear()}-${`${from.getMonth() + 1}`.padStart(2, "0")}-${`${from.getDate()}`.padStart(2, "0")}`;
      return states.filter((s) => s.day >= fromKey && s.day <= todayKey);
    };
    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() - ((todayDate.getDay() + 6) % 7)); // Monday
    const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    const periodStart = snapshot.financial_period.start_date;

    columns.push(
      { label: "Today", states: states.filter((s) => s.day === todayKey) },
      { label: "Week", states: inRange(weekStart) },
      { label: "Month", states: inRange(monthStart) },
      {
        label: "Period",
        states: periodStart
          ? states.filter((s) => s.day >= periodStart && s.day <= todayKey)
          : states,
      },
    );
  }

  const rows: { label: string; pick: (s: DailyState) => number; tone?: "pos" | "neg" }[] = [
    { label: "Target", pick: (s) => s.target },
    { label: "Achievement", pick: (s) => s.achievement, tone: "pos" },
    { label: "PLUS", pick: (s) => s.plus_amount, tone: "pos" },
    { label: "MINUS", pick: (s) => s.minus_amount, tone: "neg" },
    { label: "Sales", pick: (s) => s.sales_net },
    { label: "Gross profit", pick: (s) => s.gross_profit, tone: "pos" },
    {
      label: "Expenses",
      pick: (s) => s.business_expenses + s.personal_expenses,
      tone: "neg",
    },
    { label: "Guaranteed income", pick: (s) => s.guaranteed_income },
    { label: "Collections", pick: (s) => s.collections },
    { label: "Net profit", pick: (s) => s.business_net_profit, tone: "pos" },
  ];

  return (
    <Panel
      icon={Scale}
      title="Performance Matrix"
      subtitle="Each window runs from its start through today — aggregated from the canonical daily chain"
      className="min-w-0"
    >
      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : columns.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          The daily chain has no rows yet.
        </p>
      ) : (
        <div className="-mx-4 overflow-x-auto sm:-mx-5">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] font-bold tracking-[0.1em] text-muted-foreground">
                <th className="px-4 py-2 text-left sm:px-5">METRIC</th>
                {columns.map((col) => (
                  <th key={col.label} className="px-4 py-2 text-right uppercase sm:px-5">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-2.5 font-medium sm:px-5">{row.label}</td>
                  {columns.map((col) => (
                    <td key={col.label} className="px-4 py-2.5 text-right sm:px-5">
                      <span
                        className={cn(
                          "num font-semibold",
                          row.tone === "pos" && "text-success",
                          row.tone === "neg" && "text-destructive",
                        )}
                      >
                        {formatMoney(sumBy(col.states, row.pick))}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Right rail: sales invoices / drivers / payment accounts             */
/* ------------------------------------------------------------------ */
function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "paid") return "bg-success/10 text-success";
  if (s === "partial") return "bg-warning/15 text-warning";
  return "bg-destructive/10 text-destructive";
}

export function SalesInvoicesCard({
  sales,
  loading,
}: {
  sales?: SaleOverview[] | undefined;
  loading?: boolean | undefined;
}) {
  return (
    <Panel
      title="Sales Invoices"
      className="min-w-0"
      action={
        <Link to="/sales" className="text-[11px] font-semibold text-info hover:underline">
          View All
        </Link>
      }
    >
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : sales && sales.length > 0 ? (
        <ul className="divide-y divide-border/70">
          {sales.slice(0, 5).map((sale) => (
            <li key={sale.id} className="flex min-w-0 items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{sale.sale_no}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {sale.customer_name ?? "Walk-in"} · {formatDate(sale.sale_date)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="num text-xs font-bold">{formatMoney(sale.total)}</p>
                <span
                  className={cn(
                    "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize",
                    statusBadge(sale.payment_status),
                  )}
                >
                  {sale.payment_status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">No invoices yet.</p>
      )}
    </Panel>
  );
}

export function DriversCard({
  drivers,
  loading,
}: {
  drivers?: Driver[] | undefined;
  loading?: boolean | undefined;
}) {
  return (
    <Panel
      title="Drivers"
      className="min-w-0"
      action={
        <Link to="/drivers" className="text-[11px] font-semibold text-info hover:underline">
          View All
        </Link>
      }
    >
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : drivers && drivers.length > 0 ? (
        <ul className="space-y-1">
          {drivers.slice(0, 4).map((driver) => (
            <li key={driver.id} className="flex min-w-0 items-center gap-3 py-1.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {driver.name
                  .split(" ")
                  .map((p) => p.charAt(0))
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{driver.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {driver.phone ?? driver.vehicle_type}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                  driver.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                )}
              >
                {driver.active ? "Active" : "Inactive"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">No drivers registered yet.</p>
      )}
    </Panel>
  );
}

function accountIcon(kind: string): LucideIcon {
  const k = kind.toLowerCase();
  if (k.includes("cash")) return Wallet;
  if (k.includes("bank")) return Landmark;
  if (k.includes("mobile") || k.includes("evc") || k.includes("dahab")) return Smartphone;
  return Coins;
}

export function PaymentAccountsCard({
  accounts,
  loading,
}: {
  accounts?: (AccountBalance | PaymentAccount)[] | undefined;
  loading?: boolean | undefined;
}) {
  return (
    <Panel
      title="Payment Accounts"
      className="min-w-0"
      action={
        <Link
          to="/payment-accounts"
          className="text-[11px] font-semibold text-info hover:underline"
        >
          View All
        </Link>
      }
    >
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : accounts && accounts.length > 0 ? (
        <ul className="space-y-1">
          {accounts.slice(0, 6).map((account) => {
            const id = "account_id" in account ? account.account_id : account.id;
            const balance = "balance" in account ? account.balance : account.opening_balance;
            const Icon = accountIcon(account.kind);
            return (
              <li key={id} className="flex min-w-0 items-center gap-3 py-1.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-success/10 text-success">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{account.name}</p>
                  <p className="truncate text-[11px] capitalize text-muted-foreground">
                    {account.kind}
                  </p>
                </div>
                <span className="num shrink-0 text-xs font-bold">{formatMoney(balance)}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No payment accounts configured yet.
        </p>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom stats strip — period, YTD and stock position                 */
/* ------------------------------------------------------------------ */
export function BottomStatsStrip({
  snapshot,
  month,
  year,
  loading,
}: SectionProps & {
  month?: BusinessOverview | undefined;
  year?: BusinessOverview | undefined;
}) {
  const totals = snapshot?.period_totals;
  const items = [
    {
      label: "Gross Profit (Period)",
      value: totals?.gross_profit ?? 0,
      icon: PiggyBank,
      tone: "warning" as ChipTone,
      hint: "This period",
    },
    {
      label: "Net Profit (Period)",
      value: totals?.net_profit ?? 0,
      icon: TrendingUp,
      tone: "success" as ChipTone,
      hint: "This period",
    },
    {
      label: "Sales (Month)",
      value: month?.sales ?? 0,
      icon: ShoppingCart,
      tone: "info" as ChipTone,
      hint: "Month to date",
    },
    {
      label: "Gross Profit (YTD)",
      value: year?.gross_profit ?? 0,
      icon: CircleDollarSign,
      tone: "success" as ChipTone,
      hint: "Year to date",
    },
    {
      label: "Receivables",
      value: snapshot?.receivables ?? 0,
      icon: HandCoins,
      tone: "warning" as ChipTone,
      hint: "Outstanding",
    },
    {
      label: "Payables",
      value: month?.payables ?? 0,
      icon: ReceiptText,
      tone: "destructive" as ChipTone,
      hint: "To suppliers",
    },
    {
      label: "Inventory Value",
      value: month?.stock_value ?? 0,
      icon: Package,
      tone: "info" as ChipTone,
      hint: `${month?.low_stock_count ?? 0} low stock`,
    },
    {
      label: "Cash Total",
      value: month?.cash_total ?? 0,
      icon: Banknote,
      tone: "primary" as ChipTone,
      hint: "All accounts",
    },
  ];

  return (
    <section className="motion-safe:animate-in motion-safe:fade-in rounded-2xl border border-border bg-card p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 2xl:grid-cols-8">
        {items.map((item) => (
          <div key={item.label} className="flex min-w-0 items-center gap-2.5 rounded-xl p-2.5">
            <IconChip icon={item.icon} tone={item.tone} />
            <div className="min-w-0">
              <p className="truncate text-[9px] font-bold tracking-[0.1em] text-muted-foreground">
                {item.label.toUpperCase()}
              </p>
              {loading ? (
                <Skeleton className="mt-1 h-5 w-16" />
              ) : (
                <p className="num truncate text-sm font-bold">{formatMoney(item.value)}</p>
              )}
              <p className="truncate text-[10px] text-muted-foreground">{item.hint}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Achievement / PLUS / MINUS band                                     */
/* ------------------------------------------------------------------ */
export function AchievementBand({ snapshot, loading, onBreakdown }: SectionProps) {
  const progress = Math.min(snapshot?.progress_percentage ?? 0, 100);
  const behind = (snapshot?.today_minus ?? 0) > 0;
  const remaining = Math.max((snapshot?.today_target ?? 0) - (snapshot?.today_achievement ?? 0), 0);

  return (
    <Panel
      icon={Target}
      title="Achievement Center"
      subtitle="What counted toward today's requirement"
      className="min-w-0"
      action={
        <span
          className={cn(
            "rounded-full px-3 py-1 text-[11px] font-bold",
            progress >= 100
              ? "bg-success/10 text-success"
              : behind
                ? "bg-destructive/10 text-destructive"
                : "bg-info/10 text-info",
          )}
        >
          {progress >= 100 ? "COMPLETED" : behind ? "BEHIND" : "ON TRACK"}
        </span>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Achievement today"
          loading={loading}
          tone="positive"
          value={formatMoney(snapshot?.today_achievement ?? 0)}
          hint="sales profit + income + guaranteed"
          onClick={() => onBreakdown?.("achievement")}
        />
        <StatTile
          label="Remaining"
          loading={loading}
          tone="warning"
          value={formatMoney(remaining)}
          hint={`of ${formatMoney(snapshot?.today_target ?? 0)} target`}
          onClick={() => onBreakdown?.("target")}
        />
        <StatTile
          label="PLUS (surplus)"
          loading={loading}
          tone="positive"
          value={formatMoney(snapshot?.today_plus ?? 0)}
          hint="above the requirement"
          onClick={() => onBreakdown?.("plusminus")}
        />
        <StatTile
          label="MINUS (pressure)"
          loading={loading}
          tone="negative"
          value={formatMoney(snapshot?.today_minus ?? 0)}
          hint={`carried forward ${formatMoney(snapshot?.carry_out ?? 0)}`}
          onClick={() => onBreakdown?.("plusminus")}
        />
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            behind ? "bg-destructive" : "bg-success",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Period achievement {formatMoney(snapshot?.period_totals.achievement ?? 0)} of{" "}
        {formatMoney(snapshot?.period_totals.target ?? 0)} ·{" "}
        {formatPercent(snapshot?.progress_percentage ?? 0)}
      </p>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Obligations + guaranteed income pair                                */
/* ------------------------------------------------------------------ */
export function ObligationsPair({ snapshot, loading, onBreakdown }: SectionProps) {
  const totals = snapshot?.period_totals;
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <Panel
        icon={Scale}
        title="Obligations Center"
        subtitle="Business and personal stay separated"
        className="min-w-0"
      >
        <MoneyRow
          label="Business obligation today"
          value={snapshot?.business_obligation_today ?? 0}
          loading={loading}
        />
        <MoneyRow
          label="Personal obligation today"
          value={snapshot?.personal_obligation_today ?? 0}
          loading={loading}
        />
        <MoneyRow
          label="Target base today"
          value={snapshot?.today_target_base ?? 0}
          loading={loading}
          tone="warning"
          strong
        />
        <MoneyRow
          label="Business expenses paid today"
          value={snapshot?.today.business_expenses ?? 0}
          loading={loading}
        />
        <MoneyRow
          label="Personal expenses paid today"
          value={snapshot?.today.personal_expenses ?? 0}
          loading={loading}
        />
        <button
          type="button"
          onClick={() => onBreakdown?.("obligations")}
          className="mt-3 w-full rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-accent/40"
        >
          Open obligation breakdown
        </button>
      </Panel>

      <Panel
        icon={HandCoins}
        title="Guaranteed Income"
        subtitle="Posted automatically by the rules engine"
        className="min-w-0"
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-success">
            <span className="size-1.5 rounded-full bg-success" /> Active
          </span>
        }
      >
        <MoneyRow
          label="Today"
          value={snapshot?.today.guaranteed_income ?? 0}
          loading={loading}
          strong
        />
        <MoneyRow
          label="Current period"
          value={totals?.guaranteed_income ?? 0}
          loading={loading}
          tone="positive"
        />
        <MoneyRow
          label="Other income today"
          value={snapshot?.today.other_income ?? 0}
          loading={loading}
        />
        <MoneyRow
          label="Collections today"
          value={snapshot?.today.collections ?? 0}
          loading={loading}
        />
        <button
          type="button"
          onClick={() => onBreakdown?.("guaranteed")}
          className="mt-3 w-full rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-accent/40"
        >
          Open guaranteed income breakdown
        </button>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Operational status — only verifiable signals                        */
/* ------------------------------------------------------------------ */
export function OperationalStatus({ snapshot, loading }: SectionProps) {
  const period = snapshot?.financial_period;
  return (
    <Panel
      icon={CalendarClock}
      title="Operational Status"
      subtitle="Only signals the application can verify"
      className="min-w-0"
    >
      <div className="grid gap-x-6 sm:grid-cols-2">
        <div>
          <MoneyRowLike
            label="Financial engine"
            loading={loading}
            value={snapshot ? "Connected" : "Connecting…"}
            positive={Boolean(snapshot)}
          />
          <MoneyRowLike
            label="Financial period"
            loading={loading}
            value={period?.status === "open" ? "Open" : (period?.status ?? DASH)}
            positive={period?.status === "open"}
          />
          <MoneyRowLike
            label="Guaranteed income automation"
            loading={loading}
            value={
              snapshot ? `Running · ${formatMoney(snapshot.today.guaranteed_income)}/day` : DASH
            }
            positive={Boolean(snapshot)}
          />
        </div>
        <div>
          <MoneyRowLike
            label="Carried pressure"
            loading={loading}
            value={(snapshot?.carry_out ?? 0) > 0 ? formatMoney(snapshot?.carry_out ?? 0) : "None"}
            positive={(snapshot?.carry_out ?? 0) <= 0}
          />
          <MoneyRowLike
            label="Snapshot computed"
            loading={loading}
            value={snapshot ? new Date(snapshot.computed_at).toLocaleString() : DASH}
          />
          <MoneyRowLike
            label="Engine separation"
            loading={loading}
            value="Business & personal isolated"
            positive
          />
        </div>
      </div>
    </Panel>
  );
}

function MoneyRowLike({
  label,
  value,
  loading,
  positive,
}: {
  label: string;
  value: string;
  loading?: boolean | undefined;
  positive?: boolean | undefined;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/70 py-2 text-sm last:border-0">
      <span className="min-w-0 truncate text-muted-foreground">{label}</span>
      {loading ? (
        <Skeleton className="h-4 w-24" />
      ) : (
        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 font-semibold",
            positive === true && "text-success",
            positive === false && "text-warning",
          )}
        >
          {positive !== undefined ? (
            <span className={cn("size-1.5 rounded-full", positive ? "bg-success" : "bg-warning")} />
          ) : null}
          {value}
        </span>
      )}
    </div>
  );
}

export { formatPercent };
