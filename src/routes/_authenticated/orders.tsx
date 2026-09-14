import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Search, Truck, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { Panel, StatTile } from "@/components/command-center/Panel";
import { ConvertOrderDialog } from "@/components/logistics/ConvertOrderDialog";
import { DeliveryDialog } from "@/components/logistics/DeliveryDialog";
import { OrderDetailDialog } from "@/components/logistics/OrderDetailDialog";
import { OrderDialog } from "@/components/logistics/OrderDialog";
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
import { useCancelOrder, useOrders, useUpdateOrderStatus } from "@/hooks/useLogistics";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { OrderOverview } from "@/lib/logistics-types";
import { FULFILLMENT_LABELS, ORDER_STATUS_META } from "@/lib/logistics-types";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "Orders — Banadir Online FOS" },
      {
        name: "description",
        content:
          "Take orders, confirm fulfillment, dispatch deliveries and convert orders into sales.",
      },
      { property: "og:title", content: "Orders — Banadir Online FOS" },
      {
        property: "og:description",
        content: "Order pipeline with fulfillment, delivery dispatch and sale conversion.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrdersPage,
});

const ALL = "__all__";

function OrdersPage() {
  const { data: orders, isPending, isError } = useOrders({ limit: 300 });
  const updateStatus = useUpdateOrderStatus();
  const cancel = useCancelOrder();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [orderOpen, setOrderOpen] = useState(false);
  const [convertFor, setConvertFor] = useState<OrderOverview | null>(null);
  const [deliverFor, setDeliverFor] = useState<OrderOverview | null>(null);
  const [detailFor, setDetailFor] = useState<OrderOverview | null>(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (orders ?? []).filter((order) => {
      if (status !== ALL && order.status !== status) return false;
      if (!term) return true;
      return (
        order.order_no.toLowerCase().includes(term) ||
        (order.customer_name ?? "").toLowerCase().includes(term) ||
        (order.customer_phone ?? "").toLowerCase().includes(term)
      );
    });
  }, [orders, search, status]);

  const totals = useMemo(() => {
    const open = (orders ?? []).filter((o) => o.status !== "cancelled" && o.status !== "converted");
    return {
      open: open.length,
      value: open.reduce((sum, o) => sum + Number(o.total), 0),
      awaiting: open.filter((o) => o.status === "pending").length,
      onRoad: (orders ?? []).filter((o) => o.status === "out_for_delivery").length,
    };
  }, [orders]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">LOGISTICS</p>
          <h1 className="text-xl font-bold sm:text-2xl">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Orders only affect stock and cash when they are converted to a sale.
          </p>
        </div>
        <Button onClick={() => setOrderOpen(true)}>
          <ClipboardList className="size-4" /> New order
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Open orders" value={formatNumber(totals.open)} loading={isPending} />
        <StatTile label="Open value" value={formatMoney(totals.value)} loading={isPending} />
        <StatTile
          label="Awaiting confirmation"
          value={formatNumber(totals.awaiting)}
          tone={totals.awaiting > 0 ? "warning" : "default"}
          loading={isPending}
        />
        <StatTile
          label="Out for delivery"
          value={formatNumber(totals.onRoad)}
          loading={isPending}
        />
      </div>

      <Panel icon={ClipboardList} title="Order pipeline" subtitle="Search, confirm and convert">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search order no, customer, phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search orders"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filter by order status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {Object.entries(ORDER_STATUS_META).map(([value, meta]) => (
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
              Orders unavailable — read failed.
            </p>
          ) : isPending ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No orders match these filters.
            </p>
          ) : (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[1020px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-semibold">Order</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Customer</th>
                    <th className="px-3 py-2 font-semibold">Fulfillment</th>
                    <th className="px-3 py-2 text-right font-semibold">Items</th>
                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Delivery</th>
                    <th className="px-4 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((order) => {
                    const closed = order.status === "converted" || order.status === "cancelled";
                    return (
                      <tr
                        key={order.id}
                        className="cursor-pointer hover:bg-accent/30"
                        onClick={() => setDetailFor(order)}
                      >
                        <td className="num whitespace-nowrap px-4 py-2.5 font-medium">
                          {order.order_no}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                          {formatDate(order.order_date)}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="truncate">{order.customer_name ?? "Walk-in"}</p>
                          {order.customer_phone ? (
                            <p className="num truncate text-xs text-muted-foreground">
                              {order.customer_phone}
                            </p>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                          {FULFILLMENT_LABELS[order.fulfillment]}
                          {order.zone_name ? ` · ${order.zone_name}` : ""}
                        </td>
                        <td className="num px-3 py-2.5 text-right">
                          {formatNumber(Number(order.item_count))}
                        </td>
                        <td className="num whitespace-nowrap px-3 py-2.5 text-right font-medium">
                          {formatMoney(Number(order.total))}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge
                            className={ORDER_STATUS_META[order.status].className}
                            variant="outline"
                          >
                            {ORDER_STATUS_META[order.status].label}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                          {order.delivery_no ?? "—"}
                          {order.driver_name ? ` · ${order.driver_name}` : ""}
                        </td>
                        <td
                          className="whitespace-nowrap px-4 py-2 text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {!closed && order.status === "pending" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                updateStatus.mutate({ order_id: order.id, status: "confirmed" })
                              }
                            >
                              Confirm
                            </Button>
                          ) : null}
                          {!closed && order.status === "confirmed" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                updateStatus.mutate({ order_id: order.id, status: "ready" })
                              }
                            >
                              Ready
                            </Button>
                          ) : null}
                          {!closed && !order.delivery_id && order.fulfillment !== "pickup" ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Create delivery for ${order.order_no}`}
                              onClick={() => setDeliverFor(order)}
                            >
                              <Truck className="size-4" />
                            </Button>
                          ) : null}
                          {!closed ? (
                            <>
                              <Button size="sm" onClick={() => setConvertFor(order)}>
                                Convert
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`Cancel ${order.order_no}`}
                                onClick={() => cancel.mutate({ order_id: order.id })}
                              >
                                <XCircle className="size-4" />
                              </Button>
                            </>
                          ) : null}
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

      <OrderDialog open={orderOpen} onOpenChange={setOrderOpen} />
      <ConvertOrderDialog
        order={convertFor}
        onOpenChange={(open) => {
          if (!open) setConvertFor(null);
        }}
      />
      <DeliveryDialog
        open={Boolean(deliverFor)}
        onOpenChange={(open) => {
          if (!open) setDeliverFor(null);
        }}
        order={deliverFor}
      />
      <OrderDetailDialog order={detailFor} onOpenChange={(open) => !open && setDetailFor(null)} />
    </div>
  );
}
