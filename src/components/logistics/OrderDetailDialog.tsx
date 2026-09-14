import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeliveries, useOrderDetail } from "@/hooks/useLogistics";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { OrderOverview } from "@/lib/logistics-types";
import { DELIVERY_STATUS_META, FULFILLMENT_LABELS, ORDER_STATUS_META } from "@/lib/logistics-types";

/**
 * Read-only order dossier: customer, items, fulfillment, zone, cargo, driver,
 * delivery status, COD and the linked sale. Every value comes from the order
 * read model and the delivery read model — nothing is recomputed here.
 */
export function OrderDetailDialog({
  order,
  onOpenChange,
}: {
  order: OrderOverview | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isPending } = useOrderDetail(order?.id ?? null);
  const { data: deliveries } = useDeliveries({ limit: 300 });

  const delivery = order
    ? ((deliveries ?? []).find((row) => row.order_id === order.id) ?? null)
    : null;
  const head = data?.order ?? order;
  const items = data?.items ?? [];

  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="num">{head?.order_no ?? "Order"}</span>
            {head ? (
              <Badge className={ORDER_STATUS_META[head.status].className} variant="outline">
                {ORDER_STATUS_META[head.status].label}
              </Badge>
            ) : null}
            {delivery ? (
              <Badge className={DELIVERY_STATUS_META[delivery.status].className} variant="outline">
                {DELIVERY_STATUS_META[delivery.status].label}
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            The complete order record: customer, items, fulfillment and delivery.
          </DialogDescription>
        </DialogHeader>

        {!head ? null : (
          <div className="space-y-4 text-sm">
            <section className="grid gap-3 sm:grid-cols-2">
              <Field label="Customer" value={head.customer_name ?? "Walk-in"} />
              <Field label="Phone" value={head.customer_phone ?? "—"} />
              <Field label="Order date" value={formatDate(head.order_date)} />
              <Field label="Fulfillment" value={FULFILLMENT_LABELS[head.fulfillment]} />
              <Field label="Zone" value={head.zone_name ?? "—"} />
              <Field label="Cargo company" value={head.cargo_company_name ?? "—"} />
              <Field label="Address" value={head.delivery_address ?? "—"} />
              <Field label="Linked sale" value={head.sale_no ?? "Not converted"} />
            </section>

            <section>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Items
              </h3>
              {isPending ? (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : (
                <div className="-mx-2 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-2 py-1.5 font-semibold">Product</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Price</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Line</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-2 py-1.5">
                            <p className="truncate">{item.product_name}</p>
                            {item.sku ? (
                              <p className="num text-xs text-muted-foreground">{item.sku}</p>
                            ) : null}
                          </td>
                          <td className="num px-2 py-1.5 text-right">
                            {formatNumber(Number(item.quantity))}
                          </td>
                          <td className="num px-2 py-1.5 text-right">
                            {formatMoney(Number(item.unit_price))}
                          </td>
                          <td className="num px-2 py-1.5 text-right">
                            {formatMoney(Number(item.line_total))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-xl bg-muted p-3">
              <Row label="Subtotal" value={formatMoney(Number(head.subtotal))} />
              <Row label="Discount" value={formatMoney(Number(head.discount))} />
              <Row label="Delivery / cargo fee" value={formatMoney(Number(head.delivery_fee))} />
              <Row label="Total" value={formatMoney(Number(head.total))} strong />
            </section>

            <section>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Delivery
              </h3>
              {delivery ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Delivery no" value={delivery.delivery_no} />
                  <Field label="Driver" value={delivery.driver_name ?? "Unassigned"} />
                  <Field label="Driver phone" value={delivery.driver_phone ?? "—"} />
                  <Field label="Fee" value={formatMoney(Number(delivery.fee))} />
                  <Field label="COD to collect" value={formatMoney(Number(delivery.cod_amount))} />
                  <Field label="Recipient" value={delivery.recipient_name ?? "—"} />
                  <Field label="Recipient phone" value={delivery.recipient_phone ?? "—"} />
                  <Field label="Address" value={delivery.address ?? "—"} />
                  <Field
                    label="Dispatch date"
                    value={delivery.dispatch_date ? formatDate(delivery.dispatch_date) : "—"}
                  />
                  <Field
                    label="Delivered at"
                    value={delivery.delivered_at ? formatDate(delivery.delivered_at) : "—"}
                  />
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {head.fulfillment === "pickup"
                    ? "Pickup order — no delivery record."
                    : "No delivery dispatched yet."}
                </p>
              )}
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <Field label="Created" value={formatDate(head.created_at)} />
              <Field label="Note" value={head.note ?? "—"} />
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 break-words">{value}</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "mt-1 font-semibold" : ""}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}
