import { createFileRoute } from "@tanstack/react-router";
import { Search, Settings2, Truck } from "lucide-react";
import { useMemo, useState } from "react";

import { Panel, StatTile } from "@/components/command-center/Panel";
import { DeliveryDialog } from "@/components/logistics/DeliveryDialog";
import { FulfillmentSetupDialog } from "@/components/logistics/FulfillmentSetupDialog";
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
  useAssignDriver,
  useDeliveries,
  useDrivers,
  useSetDeliveryStatus,
} from "@/hooks/useLogistics";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { DeliveryStatus } from "@/lib/logistics-types";
import { DELIVERY_NEXT_STATUSES, DELIVERY_STATUS_META } from "@/lib/logistics-types";

export const Route = createFileRoute("/_authenticated/delivery")({
  head: () => ({
    meta: [
      { title: "Delivery & Cargo — Banadir Online FOS" },
      {
        name: "description",
        content:
          "Track deliveries, assign drivers, move delivery status and monitor cash on delivery.",
      },
      { property: "og:title", content: "Delivery & Cargo — Banadir Online FOS" },
      {
        property: "og:description",
        content: "Delivery board with driver assignment, status lifecycle and COD totals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DeliveryPage,
});

const ALL = "__all__";

function DeliveryPage() {
  const { data: deliveries, isPending, isError } = useDeliveries({ limit: 300 });
  const { data: drivers } = useDrivers();
  const assign = useAssignDriver();
  const setStatus = useSetDeliveryStatus();

  const [search, setSearch] = useState("");
  const [status, setStatusFilter] = useState(ALL);
  const [open, setOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (deliveries ?? []).filter((row) => {
      if (status !== ALL && row.status !== status) return false;
      if (!term) return true;
      return (
        row.delivery_no.toLowerCase().includes(term) ||
        (row.order_no ?? "").toLowerCase().includes(term) ||
        (row.recipient_name ?? "").toLowerCase().includes(term) ||
        (row.driver_name ?? "").toLowerCase().includes(term)
      );
    });
  }, [deliveries, search, status]);

  const totals = useMemo(() => {
    const all = deliveries ?? [];
    const active = all.filter(
      (d) => d.status !== "delivered" && d.status !== "failed" && d.status !== "returned",
    );
    return {
      active: active.length,
      unassigned: all.filter((d) => !d.driver_id).length,
      cod: active.reduce((sum, d) => sum + Number(d.cod_amount), 0),
      fees: all.reduce((sum, d) => sum + Number(d.fee), 0),
    };
  }, [deliveries]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">LOGISTICS</p>
          <h1 className="text-xl font-bold sm:text-2xl">Delivery &amp; Cargo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Status moves are recorded by the database — the board only reflects them.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setSetupOpen(true)}>
            <Settings2 className="size-4" /> Setup
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Truck className="size-4" /> New delivery
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Active deliveries"
          value={formatNumber(totals.active)}
          loading={isPending}
        />
        <StatTile
          label="Unassigned"
          value={formatNumber(totals.unassigned)}
          tone={totals.unassigned > 0 ? "warning" : "default"}
          loading={isPending}
        />
        <StatTile label="COD on the road" value={formatMoney(totals.cod)} loading={isPending} />
        <StatTile label="Delivery fees" value={formatMoney(totals.fees)} loading={isPending} />
      </div>

      <Panel icon={Truck} title="Delivery board" subtitle="Assign drivers and advance status">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search delivery, order, recipient, driver"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search deliveries"
            />
          </div>
          <Select value={status} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filter by delivery status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {Object.entries(DELIVERY_STATUS_META).map(([value, meta]) => (
                <SelectItem key={value} value={value}>
                  {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4">
          {isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              Deliveries unavailable — read failed.
            </p>
          ) : isPending ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No deliveries match these filters.
            </p>
          ) : (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[1080px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-semibold">Delivery</th>
                    <th className="px-3 py-2 font-semibold">Order</th>
                    <th className="px-3 py-2 font-semibold">Recipient</th>
                    <th className="px-3 py-2 font-semibold">Zone / Cargo</th>
                    <th className="px-3 py-2 text-right font-semibold">Fee</th>
                    <th className="px-3 py-2 text-right font-semibold">COD</th>
                    <th className="px-3 py-2 font-semibold">Driver</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-4 py-2 text-right font-semibold">Next</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => {
                    const next = DELIVERY_NEXT_STATUSES[row.status];
                    return (
                      <tr key={row.id} className="hover:bg-accent/30">
                        <td className="num whitespace-nowrap px-4 py-2.5 font-medium">
                          {row.delivery_no}
                          <p className="text-xs font-normal text-muted-foreground">
                            {formatDate(row.created_at)}
                          </p>
                        </td>
                        <td className="num whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                          {row.order_no ?? row.sale_no ?? "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="truncate">
                            {row.recipient_name ?? row.customer_name ?? "—"}
                          </p>
                          {row.recipient_phone ? (
                            <p className="num truncate text-xs text-muted-foreground">
                              {row.recipient_phone}
                            </p>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                          {row.zone_name ?? row.cargo_company_name ?? "—"}
                        </td>
                        <td className="num whitespace-nowrap px-3 py-2.5 text-right">
                          {formatMoney(Number(row.fee))}
                        </td>
                        <td className="num whitespace-nowrap px-3 py-2.5 text-right">
                          {formatMoney(Number(row.cod_amount))}
                        </td>
                        <td className="px-3 py-2.5">
                          <Select
                            value={row.driver_id ?? ""}
                            onValueChange={(driverId) =>
                              assign.mutate({ delivery_id: row.id, driver_id: driverId })
                            }
                          >
                            <SelectTrigger
                              className="h-8 w-[9.5rem]"
                              aria-label={`Assign driver for ${row.delivery_no}`}
                            >
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              {(drivers ?? [])
                                .filter((d) => d.active)
                                .map((d) => (
                                  <SelectItem key={d.id} value={d.id}>
                                    {d.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge
                            className={DELIVERY_STATUS_META[row.status].className}
                            variant="outline"
                          >
                            {DELIVERY_STATUS_META[row.status].label}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right">
                          {next.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Closed</span>
                          ) : (
                            <Select
                              value=""
                              onValueChange={(value) =>
                                setStatus.mutate({
                                  delivery_id: row.id,
                                  status: value as Exclude<DeliveryStatus, "pending">,
                                })
                              }
                            >
                              <SelectTrigger
                                className="h-8 w-[9.5rem]"
                                aria-label={`Move ${row.delivery_no} forward`}
                              >
                                <SelectValue placeholder="Move to…" />
                              </SelectTrigger>
                              <SelectContent>
                                {next.map((value) => (
                                  <SelectItem key={value} value={value}>
                                    {DELIVERY_STATUS_META[value].label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      <DeliveryDialog open={open} onOpenChange={setOpen} />
      <FulfillmentSetupDialog open={setupOpen} onOpenChange={setSetupOpen} />
    </div>
  );
}
