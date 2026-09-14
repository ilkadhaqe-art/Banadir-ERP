import { createFileRoute } from "@tanstack/react-router";
import { Bike, HandCoins, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Panel, StatTile } from "@/components/command-center/Panel";
import { DriverDialog } from "@/components/logistics/DriverDialog";
import { HandoverDialog } from "@/components/logistics/HandoverDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDriverBalances,
  useDriverHandovers,
  useDriverPerformance,
  useDrivers,
} from "@/hooks/useLogistics";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { Driver } from "@/lib/logistics-types";

export const Route = createFileRoute("/_authenticated/drivers")({
  head: () => ({
    meta: [
      { title: "Drivers — Banadir Online FOS" },
      {
        name: "description",
        content:
          "Manage drivers, monitor delivery performance and record cash-on-delivery handovers.",
      },
      { property: "og:title", content: "Drivers — Banadir Online FOS" },
      {
        property: "og:description",
        content: "Driver roster with COD balances, performance and handover history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DriversPage,
});

function DriversPage() {
  const { data: drivers, isPending, isError } = useDrivers();
  const { data: balances } = useDriverBalances();
  const { data: performance } = useDriverPerformance();
  const { data: handovers } = useDriverHandovers({ limit: 50 });

  const [driverOpen, setDriverOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [handoverFor, setHandoverFor] = useState<string | null>(null);
  const [handoverOpen, setHandoverOpen] = useState(false);

  const totals = useMemo(() => {
    const rows = balances ?? [];
    const perf = performance ?? [];
    return {
      active: (drivers ?? []).filter((d) => d.active).length,
      outstanding: rows.reduce((sum, r) => sum + Number(r.outstanding), 0),
      collected: rows.reduce((sum, r) => sum + Number(r.cod_collected), 0),
      delivered: perf.reduce((sum, r) => sum + Number(r.delivered), 0),
    };
  }, [drivers, balances, performance]);

  const openHandover = (driverId: string | null) => {
    setHandoverFor(driverId);
    setHandoverOpen(true);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">LOGISTICS</p>
          <h1 className="text-xl font-bold sm:text-2xl">Drivers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            COD balances come from the driver read model; handovers move cash into an account.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openHandover(null)}>
            <HandCoins className="size-4" /> Record handover
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setDriverOpen(true);
            }}
          >
            <Plus className="size-4" /> New driver
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Active drivers" value={formatNumber(totals.active)} loading={isPending} />
        <StatTile
          label="Outstanding COD"
          value={formatMoney(totals.outstanding)}
          tone={totals.outstanding > 0 ? "warning" : "default"}
          loading={isPending}
        />
        <StatTile label="COD collected" value={formatMoney(totals.collected)} loading={isPending} />
        <StatTile
          label="Deliveries done"
          value={formatNumber(totals.delivered)}
          loading={isPending}
        />
      </div>

      <Panel icon={Bike} title="Driver roster" subtitle="COD balances and performance">
        {isError ? (
          <p className="py-8 text-center text-sm text-destructive">
            Drivers unavailable — read failed.
          </p>
        ) : isPending ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (drivers ?? []).length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No drivers yet.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Driver</th>
                  <th className="px-3 py-2 font-semibold">Vehicle</th>
                  <th className="px-3 py-2 text-right font-semibold">Deliveries</th>
                  <th className="px-3 py-2 text-right font-semibold">Delivered</th>
                  <th className="px-3 py-2 text-right font-semibold">COD collected</th>
                  <th className="px-3 py-2 text-right font-semibold">Outstanding</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(drivers ?? []).map((driver) => {
                  const balance = (balances ?? []).find((b) => b.driver_id === driver.id);
                  const perf = (performance ?? []).find((p) => p.driver_id === driver.id);
                  const outstanding = Number(balance?.outstanding ?? 0);
                  return (
                    <tr key={driver.id} className="hover:bg-accent/30">
                      <td className="px-4 py-2.5">
                        <p className="truncate font-medium">{driver.name}</p>
                        {driver.phone ? (
                          <p className="num truncate text-xs text-muted-foreground">
                            {driver.phone}
                          </p>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {driver.vehicle_type}
                      </td>
                      <td className="num px-3 py-2.5 text-right">
                        {formatNumber(Number(perf?.deliveries_total ?? 0))}
                      </td>
                      <td className="num px-3 py-2.5 text-right">
                        {formatNumber(Number(perf?.delivered ?? 0))}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right">
                        {formatMoney(Number(balance?.cod_collected ?? 0))}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right font-medium">
                        {formatMoney(outstanding)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={driver.active ? "secondary" : "outline"}>
                          {driver.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        {outstanding > 0 ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Record handover for ${driver.name}`}
                            onClick={() => openHandover(driver.id)}
                          >
                            <HandCoins className="size-4" />
                          </Button>
                        ) : null}
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Edit ${driver.name}`}
                          onClick={() => {
                            setEditing(driver);
                            setDriverOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel icon={HandCoins} title="Recent handovers" subtitle="COD moved into business accounts">
        {(handovers ?? []).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No handovers recorded.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Driver</th>
                  <th className="px-3 py-2 font-semibold">Account</th>
                  <th className="px-3 py-2 font-semibold">Method</th>
                  <th className="px-4 py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(handovers ?? []).map((row) => (
                  <tr key={row.id} className="hover:bg-accent/30">
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                      {formatDate(row.handover_date)}
                    </td>
                    <td className="px-3 py-2.5">{row.driver_name ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.account_name ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.method}</td>
                    <td className="num whitespace-nowrap px-4 py-2.5 text-right font-medium">
                      {formatMoney(Number(row.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <DriverDialog
        open={driverOpen}
        onOpenChange={(open) => {
          setDriverOpen(open);
          if (!open) setEditing(null);
        }}
        driver={editing}
      />
      <HandoverDialog
        open={handoverOpen}
        onOpenChange={(open) => {
          setHandoverOpen(open);
          if (!open) setHandoverFor(null);
        }}
        driverId={handoverFor}
      />
    </div>
  );
}
