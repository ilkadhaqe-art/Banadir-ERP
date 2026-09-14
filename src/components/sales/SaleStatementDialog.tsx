import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useSaleStatement } from "@/hooks/useFulfillment";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { FULFILLMENT_LABELS } from "@/lib/logistics-types";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/sales-types";

/**
 * Complete sale statement. Every value is returned by sale_statement() —
 * identity, products, money, fulfilment, collections, tracking and audit.
 */
export function SaleStatementDialog({
  saleId,
  onOpenChange,
}: {
  saleId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isPending } = useSaleStatement(saleId);
  const sale = data?.sale ?? null;

  return (
    <Dialog open={Boolean(saleId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="num">{sale?.sale_no ?? "Sale statement"}</span>
            {sale ? (
              <>
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
                <Badge variant="outline">{FULFILLMENT_LABELS[sale.fulfillment]}</Badge>
                {sale.status === "void" ? <Badge variant="destructive">Void</Badge> : null}
              </>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            Full history of this sale: products, money, fulfilment, collections and changes.
          </DialogDescription>
        </DialogHeader>

        {isPending || !data || !sale ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-5 text-sm">
            <Section title="Identity">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Customer" value={sale.customer_name ?? "Walk-in"} />
                <Field label="Phone" value={sale.customer_phone ?? "—"} />
                <Field
                  label="Date & time"
                  value={`${formatDate(sale.sale_date)}${sale.sale_time ? ` · ${sale.sale_time.slice(0, 5)}` : ""}`}
                />
                <Field label="Payment method" value={PAYMENT_METHOD_LABELS[sale.payment_method]} />
                <Field label="Account" value={sale.account_name ?? "—"} />
                <Field label="Recorded by" value={sale.created_by_name ?? "—"} />
                <Field label="Last edited by" value={sale.updated_by_name ?? "—"} />
                <Field label="Note" value={sale.note ?? "—"} />
              </div>
            </Section>

            <Section title="Products">
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-1.5 font-semibold">Product</th>
                      <th className="px-2 py-1.5 font-semibold">SKU / barcode</th>
                      <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
                      <th className="px-2 py-1.5 text-right font-semibold">Price</th>
                      <th className="px-2 py-1.5 text-right font-semibold">Line</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.items.map((item) => (
                      <tr key={item.product_id}>
                        <td className="px-2 py-1.5">
                          <span className="flex items-center gap-2">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                loading="lazy"
                                className="size-8 rounded object-cover"
                              />
                            ) : null}
                            <span className="truncate">{item.name}</span>
                          </span>
                        </td>
                        <td className="num px-2 py-1.5 text-xs text-muted-foreground">
                          {[item.sku, item.barcode].filter(Boolean).join(" · ") || "—"}
                        </td>
                        <td className="num px-2 py-1.5 text-right">
                          {formatNumber(Number(item.quantity))}
                          {item.unit ? ` ${item.unit}` : ""}
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
            </Section>

            <Section title="Money">
              <div className="rounded-xl bg-muted p-3">
                <Row label="Subtotal" value={formatMoney(Number(sale.subtotal))} />
                <Row label="Discount" value={formatMoney(Number(sale.discount))} />
                <Row
                  label={`VAT (${formatNumber(Number(sale.vat_rate) * 100)}%)`}
                  value={formatMoney(Number(sale.vat_amount))}
                />
                <Row label="Delivery fee" value={formatMoney(Number(sale.delivery_fee))} />
                <Row label="Cargo fee" value={formatMoney(Number(sale.cargo_fee))} />
                <Row label="Total" value={formatMoney(Number(sale.total))} />
                <Row label="Advance (Hormaris)" value={formatMoney(Number(sale.advance_amount))} />
                <Row label="Paid" value={formatMoney(Number(sale.paid_amount))} />
                <Row label="Returned" value={formatMoney(Number(sale.returned_total))} />
                <Row label="Fee paid" value={formatMoney(Number(sale.fee_paid))} />
                <Row label="Fee remaining" value={formatMoney(Number(sale.fee_balance))} />
                <Row label="Sale remaining" value={formatMoney(Number(sale.balance))} strong />
              </div>
            </Section>

            <Section title="Fulfilment">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Type" value={FULFILLMENT_LABELS[sale.fulfillment]} />
                <Field label="Recipient" value={sale.recipient_name ?? "—"} />
                <Field label="Recipient phone" value={sale.recipient_phone ?? "—"} />
                <Field label="Address" value={sale.address ?? "—"} />
                <Field label="District" value={sale.location_name ?? "—"} />
                <Field label="Region" value={sale.region_name ?? "—"} />
                <Field label="Delivery company" value={sale.delivery_company_name ?? "—"} />
                <Field
                  label="Driver"
                  value={[sale.driver_name, sale.driver_phone].filter(Boolean).join(" · ") || "—"}
                />
                <Field label="Cargo company" value={sale.cargo_company_name ?? "—"} />
                <Field label="Delivery no" value={data.delivery?.delivery_no ?? "—"} />
                <Field label="Delivery status" value={data.delivery?.status ?? "—"} />
                <Field
                  label="To collect"
                  value={formatMoney(Number(data.delivery?.cod_amount ?? 0))}
                />
              </div>
            </Section>

            <Section title="Tracking history">
              {data.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tracking events yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.events.map((event) => (
                    <li key={event.id} className="flex flex-wrap justify-between gap-2">
                      <span>
                        <span className="font-medium">{event.status.replace(/_/g, " ")}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {formatDate(event.occurred_at)}
                          {event.driver_name ? ` · ${event.driver_name}` : ""}
                          {event.actor ? ` · ${event.actor}` : ""}
                          {event.note ? ` · ${event.note}` : ""}
                        </span>
                      </span>
                      <span className="num">{formatMoney(Number(event.amount_collected))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Collections">
              {data.collections.length === 0 ? (
                <p className="text-sm text-muted-foreground">No collections recorded.</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.collections.map((row) => (
                    <li key={row.id} className="flex flex-wrap justify-between gap-2">
                      <span className="text-muted-foreground">
                        {formatDate(row.payment_date)} · {PAYMENT_METHOD_LABELS[row.method]}
                        {row.reference ? ` · ${row.reference}` : ""}
                      </span>
                      <span className="num">{formatMoney(Number(row.amount))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Returns">
              {data.returns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No returns on this sale.</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.returns.map((row) => (
                    <li key={row.id} className="flex flex-wrap justify-between gap-2">
                      <span className="text-muted-foreground">{formatDate(row.return_date)}</span>
                      <span className="num">
                        {formatMoney(Number(row.total))} · refund{" "}
                        {formatMoney(Number(row.refund_amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Change history">
              {data.audit.length === 0 ? (
                <p className="text-sm text-muted-foreground">No changes recorded.</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.audit.map((entry, index) => (
                    <li key={`${entry.created_at}-${index}`} className="text-muted-foreground">
                      <span className="font-medium text-foreground">{entry.action}</span> ·{" "}
                      {entry.entity_table} · {formatDate(entry.created_at)}
                      {entry.actor ? ` · ${entry.actor}` : ""}
                      {entry.reason ? ` · ${entry.reason}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "num font-bold" : "num"}>{value}</span>
    </div>
  );
}
