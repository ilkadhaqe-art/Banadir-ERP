import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeliveryDetail } from "@/hooks/useLogistics";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { DeliveryTimelineEvent } from "@/lib/logistics-types";
import { DELIVERY_STATUS_META, FULFILLMENT_LABELS, ORDER_STATUS_META } from "@/lib/logistics-types";
import { cn } from "@/lib/utils";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value ?? "—"}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border p-3">
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Delivery dossier: order, customer, delivery, cargo, driver, payment,
 * collection and the database-recorded activity timeline in one popup.
 */
export function DeliveryDetailDialog({
  deliveryId,
  onOpenChange,
  onCollect,
}: {
  deliveryId: string | null;
  onOpenChange: (open: boolean) => void;
  onCollect?: ((deliveryId: string) => void) | undefined;
}) {
  const { data, isPending, isError } = useDeliveryDetail(deliveryId);

  const collected = (data?.collections ?? []).reduce((sum, c) => sum + Number(c.amount), 0);
  const outstanding = Number(data?.sale?.balance ?? 0);
  const collectionState = !data?.sale
    ? { label: "No sale yet", className: "bg-muted text-muted-foreground" }
    : outstanding <= 0
      ? { label: "Collected", className: "bg-success/15 text-success" }
      : collected > 0
        ? { label: "Partially collected", className: "bg-warning/15 text-warning" }
        : { label: "Collection pending", className: "bg-warning/15 text-warning" };

  const timeline = useMemo<DeliveryTimelineEvent[]>(() => {
    if (!data) return [];
    const events: DeliveryTimelineEvent[] = [];
    const d = data.delivery;
    events.push({
      at: d.created_at,
      label: "Delivery created",
      detail: d.delivery_no,
      amount: null,
    });
    if (data.order) {
      events.push({
        at: data.order.created_at,
        label: "Order created",
        detail: data.order.order_no,
        amount: Number(data.order.total),
      });
    }
    if (d.dispatch_date) {
      events.push({
        at: d.dispatch_date,
        label: "Dispatched",
        detail: d.driver_name ?? d.cargo_company_name ?? null,
        amount: null,
      });
    }
    if (d.delivered_at) {
      events.push({ at: d.delivered_at, label: "Delivered", detail: d.driver_name, amount: null });
    }
    for (const c of data.collections) {
      events.push({
        at: c.created_at,
        label: "Payment collected",
        detail: [c.method, c.account_name, c.reference].filter(Boolean).join(" · ") || null,
        amount: Number(c.amount),
      });
    }
    return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [data]);

  return (
    <Dialog open={Boolean(deliveryId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>{data?.delivery.delivery_no ?? "Delivery"}</span>
            {data ? (
              <Badge className={DELIVERY_STATUS_META[data.delivery.status].className}>
                {DELIVERY_STATUS_META[data.delivery.status].label}
              </Badge>
            ) : null}
            <Badge className={collectionState.className}>{collectionState.label}</Badge>
          </DialogTitle>
          <DialogDescription>
            Delivery execution, cargo cost and customer collection stay independent states.
          </DialogDescription>
        </DialogHeader>

        {isError ? (
          <p className="py-8 text-center text-sm text-destructive">Delivery could not be read.</p>
        ) : isPending || !data ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            <Section title="Order">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field
                  label="Order"
                  value={data.order?.order_no ?? data.delivery.order_no ?? "—"}
                />
                <Field
                  label="Order date"
                  value={data.order ? formatDate(data.order.order_date) : "—"}
                />
                <Field
                  label="Order status"
                  value={
                    data.order ? (
                      <Badge className={ORDER_STATUS_META[data.order.status].className}>
                        {ORDER_STATUS_META[data.order.status].label}
                      </Badge>
                    ) : (
                      "—"
                    )
                  }
                />
                <Field
                  label="Fulfillment"
                  value={data.order ? FULFILLMENT_LABELS[data.order.fulfillment] : "—"}
                />
              </div>
              {data.items.length ? (
                <div className="-mx-3 mt-3 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-1.5 font-semibold">Product</th>
                        <th className="px-3 py-1.5 text-right font-semibold">Qty</th>
                        <th className="px-3 py-1.5 text-right font-semibold">Price</th>
                        <th className="px-3 py-1.5 text-right font-semibold">Line</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-1.5">
                            <p className="truncate">{item.product_name}</p>
                            {item.sku ? (
                              <p className="num text-xs text-muted-foreground">{item.sku}</p>
                            ) : null}
                          </td>
                          <td className="num px-3 py-1.5 text-right">
                            {formatNumber(item.quantity, 2)}
                          </td>
                          <td className="num px-3 py-1.5 text-right">
                            {formatMoney(item.unit_price)}
                          </td>
                          <td className="num px-3 py-1.5 text-right">
                            {formatMoney(item.line_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No line items on this delivery.
                </p>
              )}
            </Section>

            <div className="grid gap-3 sm:grid-cols-2">
              <Section title="Customer">
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Name"
                    value={data.customer?.name ?? data.delivery.recipient_name ?? "Walk-in"}
                  />
                  <Field
                    label="Phone"
                    value={data.customer?.phone ?? data.delivery.recipient_phone ?? "—"}
                  />
                  <Field label="Zone" value={data.delivery.zone_name ?? "—"} />
                  <Field
                    label="Customer balance"
                    value={formatMoney(Number(data.customer?.balance ?? 0))}
                  />
                  <div className="col-span-2">
                    <Field label="Address" value={data.delivery.address ?? "—"} />
                  </div>
                  {data.delivery.note ? (
                    <div className="col-span-2">
                      <Field label="Note" value={data.delivery.note} />
                    </div>
                  ) : null}
                </div>
              </Section>

              <Section title="Delivery & driver">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Driver" value={data.delivery.driver_name ?? "Unassigned"} />
                  <Field label="Driver phone" value={data.delivery.driver_phone ?? "—"} />
                  <Field
                    label="Dispatched"
                    value={
                      data.delivery.dispatch_date ? formatDate(data.delivery.dispatch_date) : "—"
                    }
                  />
                  <Field
                    label="Delivered"
                    value={
                      data.delivery.delivered_at ? formatDate(data.delivery.delivered_at) : "—"
                    }
                  />
                  <Field label="Created" value={formatDate(data.delivery.created_at)} />
                  <Field
                    label="COD on delivery"
                    value={formatMoney(Number(data.delivery.cod_amount))}
                  />
                </div>
              </Section>

              <Section title="Cargo">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Company" value={data.delivery.cargo_company_name ?? "—"} />
                  <Field label="Zone" value={data.delivery.zone_name ?? "—"} />
                  <Field label="Charge applied" value={formatMoney(Number(data.delivery.fee))} />
                  <Field
                    label="Current rate card"
                    value={data.rate_card ? formatMoney(data.rate_card.rate) : "No rate card"}
                  />
                  {data.rate_card ? (
                    <div className="col-span-2">
                      <Field
                        label="Rate source"
                        value={`${data.rate_card.company_name ?? "—"} · ${data.rate_card.zone_name ?? "—"} · from ${formatDate(data.rate_card.effective_from)}`}
                      />
                    </div>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  The charge applied is the historical amount stored on this delivery — later rate
                  changes never rewrite it.
                </p>
              </Section>

              <Section title="Payment & collection">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Sale" value={data.sale?.sale_no ?? "Not converted"} />
                  <Field label="Sale total" value={formatMoney(Number(data.sale?.total ?? 0))} />
                  <Field label="Paid" value={formatMoney(Number(data.sale?.paid_amount ?? 0))} />
                  <Field label="Collected on delivery" value={formatMoney(collected)} />
                  <Field label="Remaining" value={formatMoney(outstanding)} />
                  <Field
                    label="Payment status"
                    value={data.sale?.payment_status?.replace(/_/g, " ") ?? "—"}
                  />
                </div>
                {onCollect && data.sale && outstanding > 0 ? (
                  <button
                    type="button"
                    className="mt-3 w-full rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                    onClick={() => onCollect(data.delivery.id)}
                  >
                    Collect {formatMoney(outstanding)}
                  </button>
                ) : null}
              </Section>
            </div>

            <Section title="Activity timeline">
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recorded activity yet.</p>
              ) : (
                <ol className="space-y-2">
                  {timeline.map((event, index) => (
                    <li key={`${event.at}-${index}`} className="flex gap-3">
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          index === timeline.length - 1 ? "bg-primary" : "bg-border",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {event.label}
                          {event.amount !== null ? (
                            <span className="num ml-2 text-muted-foreground">
                              {formatMoney(event.amount)}
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDate(event.at)}
                          {event.detail ? ` · ${event.detail}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Only database-recorded facts are shown — no events are inferred.
              </p>
            </Section>

            {data.collections.length ? (
              <Section title="Collections">
                <div className="-mx-3 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-1.5 font-semibold">Date</th>
                        <th className="px-3 py-1.5 font-semibold">Method</th>
                        <th className="px-3 py-1.5 font-semibold">Account</th>
                        <th className="px-3 py-1.5 font-semibold">Reference</th>
                        <th className="px-3 py-1.5 text-right font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.collections.map((c) => (
                        <tr key={c.id}>
                          <td className="whitespace-nowrap px-3 py-1.5">
                            {formatDate(c.payment_date)}
                          </td>
                          <td className="px-3 py-1.5">{c.method.replace(/_/g, " ")}</td>
                          <td className="px-3 py-1.5">{c.account_name ?? "—"}</td>
                          <td className="px-3 py-1.5">{c.reference ?? "—"}</td>
                          <td className="num px-3 py-1.5 text-right">{formatMoney(c.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
