import { createFileRoute } from "@tanstack/react-router";
import { Plus, Target as TargetIcon, Repeat, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { RuleDialog } from "@/components/financial/RuleDialog";
import { EmptyState, Panel, StatTile } from "@/components/command-center/Panel";
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
import {
  useFinancialRules,
  useObligationSummary,
  useSetFinancialRuleActive,
} from "@/hooks/useFinancialRules";
import { useDailyStates, useFinancialSnapshot } from "@/hooks/useFinancialSnapshot";
import { useMyAccess } from "@/hooks/useUserRoles";
import { dayKey, formatDate, formatMoney, formatPercent } from "@/lib/format";
import type { FinancialRule } from "@/lib/financial-types";

export const Route = createFileRoute("/_authenticated/targets")({
  head: () => ({
    meta: [
      { title: "Targets & Rules — Banadir Online FOS" },
      {
        name: "description",
        content:
          "Daily targets, PLUS/MINUS carry-forward and the obligation and guaranteed-income rules that drive the financial engine.",
      },
      { property: "og:title", content: "Targets & Rules — Banadir Online FOS" },
      {
        property: "og:description",
        content: "Manage obligations and guaranteed income; the engine rebuilds the daily chain.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TargetsPage,
});

const ALL = "__all__";

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return dayKey(d);
}

function TargetsPage() {
  const { data: snapshot, isPending: snapshotPending } = useFinancialSnapshot();
  const { data: obligations } = useObligationSummary();
  const { data: rules, isPending: rulesPending, isError } = useFinancialRules();
  const { data: states, isPending: statesPending } = useDailyStates({
    from: daysAgo(29),
    to: dayKey(),
  });
  const { data: access } = useMyAccess();
  const setActive = useSetFinancialRuleActive();

  const [search, setSearch] = useState("");
  const [kind, setKind] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialRule | null>(null);

  const canManage = access?.is_admin ?? false;

  const filteredRules = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (rules ?? []).filter((rule) => {
      if (kind !== ALL && rule.kind !== kind) return false;
      if (!term) return true;
      return (
        rule.name.toLowerCase().includes(term) || (rule.category ?? "").toLowerCase().includes(term)
      );
    });
  }, [rules, search, kind]);

  const chain = useMemo(() => [...(states ?? [])].reverse(), [states]);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(rule: FinancialRule) {
    setEditing(rule);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <header className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">
            TARGET ENGINE
          </p>
          <h1 className="text-xl font-bold sm:text-2xl">Targets & financial rules</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every figure below comes from the canonical financial engine. Editing a rule rebuilds
            the daily chain automatically.
          </p>
        </div>
        {canManage ? (
          <Button onClick={openNew} className="w-full sm:w-auto">
            <Plus className="size-4" /> New rule
          </Button>
        ) : null}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Today target"
          value={formatMoney(snapshot?.today_target ?? 0)}
          hint={`Base ${formatMoney(snapshot?.today_target_base ?? 0)}`}
          loading={snapshotPending}
        />
        <StatTile
          label="Achievement"
          value={formatMoney(snapshot?.today_achievement ?? 0)}
          hint={formatPercent(snapshot?.progress_percentage ?? 0)}
          tone={
            (snapshot?.today_achievement ?? 0) >= (snapshot?.today_target ?? 0)
              ? "positive"
              : "warning"
          }
          loading={snapshotPending}
        />
        <StatTile
          label="Carry in / out"
          value={`${formatMoney(snapshot?.carry_in ?? 0)} → ${formatMoney(snapshot?.carry_out ?? 0)}`}
          hint={`PLUS ${formatMoney(snapshot?.today_plus ?? 0)} · MINUS ${formatMoney(snapshot?.today_minus ?? 0)}`}
          tone={(snapshot?.carry_out ?? 0) > 0 ? "negative" : "positive"}
          loading={snapshotPending}
        />
        <StatTile
          label="Daily obligations"
          value={formatMoney(obligations?.total_daily ?? 0)}
          hint={`Business ${formatMoney(obligations?.business_daily ?? 0)} · Personal ${formatMoney(
            obligations?.personal_daily ?? 0,
          )}`}
          loading={!obligations}
        />
      </div>

      <Panel
        icon={Repeat}
        eyebrow="RULES"
        title="Obligations & guaranteed income"
        subtitle="Effective-dated inputs to the engine. Rules are never deleted — they are end-dated."
        action={
          <div className="hidden gap-2 sm:flex">
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="All kinds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All kinds</SelectItem>
                <SelectItem value="obligation">Obligations</SelectItem>
                <SelectItem value="guaranteed_income">Guaranteed income</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rule or category"
            />
          </div>
          <div className="sm:hidden">
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger>
                <SelectValue placeholder="All kinds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All kinds</SelectItem>
                <SelectItem value="obligation">Obligations</SelectItem>
                <SelectItem value="guaranteed_income">Guaranteed income</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isError ? (
          <p className="py-8 text-center text-sm text-destructive">
            Rules unavailable — read failed.
          </p>
        ) : rulesPending ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredRules.length === 0 ? (
          <EmptyState label="No rules match this filter." />
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold tracking-[0.1em] text-muted-foreground">
                  <th className="px-3 py-2">RULE</th>
                  <th className="px-3 py-2">KIND</th>
                  <th className="px-3 py-2">SCOPE</th>
                  <th className="px-3 py-2">FREQUENCY</th>
                  <th className="px-3 py-2 text-right">AMOUNT</th>
                  <th className="px-3 py-2">EFFECTIVE</th>
                  <th className="px-3 py-2 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => (
                  <tr key={rule.id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2">
                      <p className="font-medium">{rule.name}</p>
                      {rule.category ? (
                        <p className="text-xs text-muted-foreground">{rule.category}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={rule.kind === "obligation" ? "secondary" : "outline"}>
                        {rule.kind === "obligation" ? "Obligation" : "Guaranteed income"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 capitalize">{rule.scope}</td>
                    <td className="px-3 py-2 capitalize">
                      {rule.frequency}
                      {rule.skip_friday ? " · skips Fri" : ""}
                    </td>
                    <td className="num px-3 py-2 text-right font-semibold">
                      {formatMoney(Number(rule.amount))}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {formatDate(rule.effective_from)}
                      {rule.effective_to ? ` → ${formatDate(rule.effective_to)}` : " → open"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <Badge variant={rule.active ? "default" : "outline"}>
                          {rule.active ? "Active" : "Inactive"}
                        </Badge>
                        {canManage ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openEdit(rule)}>
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={setActive.isPending}
                              onClick={() =>
                                setActive.mutate({ id: rule.id, active: !rule.active })
                              }
                            >
                              {rule.active ? "Disable" : "Enable"}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        icon={TargetIcon}
        eyebrow="DAILY CHAIN"
        title="Target vs achievement (last 30 days)"
        subtitle="Read directly from daily_financial_states — the engine's own output."
      >
        {statesPending ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : chain.length === 0 ? (
          <EmptyState label="No computed days yet." />
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-bold tracking-[0.1em] text-muted-foreground">
                  <th className="px-3 py-2">DAY</th>
                  <th className="px-3 py-2 text-right">CARRY IN</th>
                  <th className="px-3 py-2 text-right">TARGET</th>
                  <th className="px-3 py-2 text-right">ACHIEVEMENT</th>
                  <th className="px-3 py-2 text-right">PLUS</th>
                  <th className="px-3 py-2 text-right">MINUS</th>
                  <th className="px-3 py-2 text-right">CARRY OUT</th>
                </tr>
              </thead>
              <tbody>
                {chain.map((day) => (
                  <tr key={day.day} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2">
                      {formatDate(day.day)}
                      {day.is_friday ? (
                        <span className="ml-2 text-xs text-muted-foreground">Fri</span>
                      ) : null}
                    </td>
                    <td className="num px-3 py-2 text-right">
                      {formatMoney(Number(day.carry_in))}
                    </td>
                    <td className="num px-3 py-2 text-right font-semibold">
                      {formatMoney(Number(day.target))}
                    </td>
                    <td className="num px-3 py-2 text-right">
                      {formatMoney(Number(day.achievement))}
                    </td>
                    <td className="num px-3 py-2 text-right text-success">
                      {formatMoney(Number(day.plus_amount))}
                    </td>
                    <td className="num px-3 py-2 text-right text-destructive">
                      {formatMoney(Number(day.minus_amount))}
                    </td>
                    <td className="num px-3 py-2 text-right font-semibold">
                      {formatMoney(Number(day.carry_out))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <RuleDialog open={dialogOpen} onOpenChange={setDialogOpen} rule={editing} />
    </div>
  );
}
