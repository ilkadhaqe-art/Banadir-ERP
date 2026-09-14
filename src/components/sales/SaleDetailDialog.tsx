import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeliveries } from "@/hooks/useLogistics";
import { useCollections, useSaleItems, useSalesReturns } from "@/hooks/useSales";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { DELIVERY_STATUS_META } from "@/lib/logistics-types";
import type { SaleOverview } from "@/lib/sales-types";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/sales-types";

/**
 * Full sale dossier: customer, items, payment, fulfillment/delivery, driver,
 * collections and returns. All figures come from the canonical read models.
 */
export function SaleDetailDialog({
  sale,
  onOpenChange,
}: {
  sale: SaleOverview | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: items, isPending } = useSaleItems(sale?.id ?? null);
  const { data: deliveries } = useDeliveries({ limit: 300 });
  const { data: collections } = useCollections(
    sale?.customer_id ? { customer_id: sale.customer_id, limit: 100 } : undefined,
  );
  const { data: returns } = useSalesReturns(sale ? { sale_id: sale.id, limit: 50 } : undefined);

  const delivery = sale
    ? ((deliveries ?? []).find((row) => row.sale_id === sale.id) ?? null)
    : null;
  const saleCollections = sale
    ? (collections ?? []).filter((row) => row.sale_id === sale.id && row.status === "active")
    : [];
  const saleReturns = sale
    ? (returns ?? []).filter((row) => row.sale_id === sale.id && row.status === "active")
    : [];

  return (
    <Dialog open={Boolean(sale)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="num">{sale?.sale_no ?? "Sale"}</span>
            {sale ? (
              <Badge
                variant={
                  sale.payment_status === "full_paid"
                    ? "secondary"
                    : sale.payment_status === "partial"
                      ? "outline"
                      : "destructive"
                }
              >
                {PAYMENT_STATUS_LABELS[sale.payment_status]}
              </Badge>
            ) : null}
            {delivery ? (
              <Badge className={DELIVERY_STATUS_META[delivery.status].className} variant="outline">
                {DELIVERY_STATUS_META[delivery.status].label}
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            Customer, items, payment, fulfillment, collections and returns in one place.
          </DialogDescription>
        </DialogHeader>

        {!sale ? null : (
          <div className="space-y-4 text-sm">
            <section className="grid gap-3 sm:grid-cols-2">
              <Field label="Customer" value={sale.customer_name ?? "Walk-in"} />
              <Field label="Phone" value={sale.customer_phone ?? "—"} />
              <Field label="Sale date" value={formatDate(sale.sale_date)} />
              <Field label="Payment method" value={PAYMENT_METHOD_LABELS[sale.payment_method]} />
              <Field label="Account" value={sale.account_name ?? "—"} />
              <Field label="Record status" value={sale.status === "active" ? "Active" : "Void"} />
              <Field label="Fulfillment" value={delivery ? "Delivery" : "Pickup / counter"} />
              <Field label="Note" value={sale.note ?? "—"} />
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
                  <table className="w-full min-w-[460px] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="px-2 py-1.5 font-semibold">Product</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Price</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Returned</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Line</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(items ?? []).map((item) => (
                        <tr key={item.id}>
                          <td className="px-2 py-1.5">{item.product_name}</td>
                          <td className="num px-2 py-1.5 text-right">
                            {formatNumber(Number(item.quantity))}
                          </td>
                          <td className="num px-2 py-1.5 text-right">
                            {formatMoney(Number(item.unit_price))}
                          </td>
                          <td className="num px-2 py-1.5 text-right">
                            {formatNumber(Number(item.returned_quantity))}
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
              <Row label="Subtotal" value={formatMoney(Number(sale.subtotal))} />
              <Row label="Discount" value={formatMoney(Number(sale.discount))} />
              <Row label="Total" value={formatMoney(Number(sale.total))} />
              <Row label="Paid" value={formatMoney(Number(sale.paid_amount))} />
              <Row label="Returned" value={formatMoney(Number(sale.returned_total))} />
              <Row label="Outstanding" value={formatMoney(Number(sale.balance))} strong />
            </section>

            <section>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Delivery
              </h3>
              {delivery ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Delivery no" value={delivery.delivery_no} />
                  <Field label="Driver" value={delivery.driver_name ?? "Unassigned"} />
                  <Field label="Zone" value={delivery.zone_name ?? "—"} />
                  <Field label="Cargo company" value={delivery.cargo_company_name ?? "—"} />
                  <Field label="Delivery fee" value={formatMoney(Number(delivery.fee))} />
                  <Field label="COD to collect" value={formatMoney(Number(delivery.cod_amount))} />
                  <Field label="Address" value={delivery.address ?? "—"} />
                  <Field
                    label="Delivered at"
                    value={delivery.delivered_at ? formatDate(delivery.delivered_at) : "—"}
                  />
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No delivery record — collected at the counter.
                </p>
              )}
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Collections
                </h3>
                {saleCollections.length === 0 ? (
                  <p className="text-muted-foreground">No collections against this sale.</p>
                ) : (
                  <ul className="space-y-1">
                    {saleCollections.map((row) => (
                      <li key={row.id} className="flex justify-between gap-2">
                        <span className="text-muted-foreground">
                          {formatDate(row.payment_date)} · {PAYMENT_METHOD_LABELS[row.method]}
                        </span>
                        <span className="num">{formatMoney(Number(row.amount))}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Returns
                </h3>
                {saleReturns.length === 0 ? (
                  <p className="text-muted-foreground">No returns on this sale.</p>
                ) : (
                  <ul className="space-y-1">
                    {saleReturns.map((row) => (
                      <li key={row.id} className="flex justify-between gap-2">
                        <span className="text-muted-foreground">
                          {formatDate(row.return_date)} · {row.restock ? "Restocked" : "No restock"}
                        </span>
                        <span className="num">{formatMoney(Number(row.total))}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
