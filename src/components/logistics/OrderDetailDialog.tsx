import {
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  PhoneCall,
  Share2,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useDeliveries, useDrivers, useOrderDetail } from "@/hooks/useLogistics";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { OrderOverview } from "@/lib/logistics-types";
import { DELIVERY_STATUS_META, FULFILLMENT_LABELS, ORDER_STATUS_META } from "@/lib/logistics-types";
import {
  adminConfirmPayment,
  adminTogglePortalLink,
  adminUpdateTracking,
  getOrderPortalData,
  SOMALI_DELIVERY_STAGES,
  syncOrderToPortal,
  type OrderPortalData,
  type SomaliDeliveryStage,
} from "@/lib/order-portal-service";

/**
 * Read-only order dossier: customer, items, fulfillment, zone, cargo, driver,
 * delivery status, COD and the linked sale.
 * Also includes customer portal controls, Somali delivery tracking stages, and payment verification.
 */
export function OrderDetailDialog({
  order,
  onOpenChange,
  onConvertClick,
}: {
  order: OrderOverview | null;
  onOpenChange: (open: boolean) => void;
  onConvertClick?: (order: OrderOverview) => void;
}) {
  const { data, isPending } = useOrderDetail(order?.id ?? null);
  const { data: deliveries } = useDeliveries({ limit: 300 });
  const { data: drivers } = useDrivers();

  const delivery = order
    ? ((deliveries ?? []).find((row) => row.order_id === order.id) ?? null)
    : null;
  const head = data?.order ?? order;
  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const [portal, setPortal] = useState<OrderPortalData | null>(null);

  useEffect(() => {
    if (head) {
      const p = syncOrderToPortal(head, items);
      setPortal(p);
    }
  }, [head, items]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const portalUrl = portal ? `${origin}/order/${portal.portal_token}` : "";

  const handleCopyLink = () => {
    if (!portalUrl) return;
    navigator.clipboard.writeText(portalUrl);
    toast.success("Link-ga macaamiisha waa la koobiyeeyay!");
  };

  const handleTogglePortal = (checked: boolean) => {
    if (!head) return;
    const updated = adminTogglePortalLink(head.id, checked);
    if (updated) {
      setPortal({ ...updated });
      toast.success(checked ? "Customer portal enabled" : "Customer portal disabled");
    }
  };

  const handleConfirmPayment = () => {
    if (!head) return;
    const updated = adminConfirmPayment(head.id, head.total);
    if (updated) {
      setPortal({ ...updated });
      toast.success("Lacagta waa la xaqiijiyay (Payment Verified)!");
    }
  };

  const handleStageChange = (stage: SomaliDeliveryStage) => {
    if (!head) return;
    const updated = adminUpdateTracking(
      head.id,
      stage,
      portal?.driver_name ?? undefined,
      portal?.driver_phone ?? undefined,
    );
    if (updated) {
      setPortal({ ...updated });
      toast.success("Heerka gaarsiinta waa la cusbooneysiiyay");
    }
  };

  const handleDriverChange = (driverId: string) => {
    if (!head) return;
    const foundDriver = (drivers ?? []).find((d) => d.id === driverId);
    if (foundDriver) {
      const updated = adminUpdateTracking(
        head.id,
        portal?.tracking_stage === "darawal_lama_dalban"
          ? "darawal_loo_dalbay"
          : (portal?.tracking_stage ?? "darawal_loo_dalbay"),
        foundDriver.name,
        foundDriver.phone ?? undefined,
      );
      if (updated) {
        setPortal({ ...updated });
        toast.success(`Darawalka ${foundDriver.name} ayaa loo qoondeeyay`);
      }
    }
  };

  return (
    <Dialog open={Boolean(order)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <span className="num font-bold">{head?.order_no ?? "Order"}</span>
              {head ? (
                <Badge className={ORDER_STATUS_META[head.status].className} variant="outline">
                  {ORDER_STATUS_META[head.status].label}
                </Badge>
              ) : null}
              {portal ? (
                <Badge
                  variant="outline"
                  className={
                    portal.payment_status === "verified"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : portal.payment_status === "pending_verification"
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-slate-300 bg-slate-50 text-slate-600"
                  }
                >
                  {portal.payment_status === "verified"
                    ? "Paid & Verified"
                    : portal.payment_status === "pending_verification"
                      ? "Verification Pending"
                      : "Unpaid"}
                </Badge>
              ) : null}
            </DialogTitle>

            {head &&
              head.status !== "converted" &&
              head.status !== "cancelled" &&
              onConvertClick && (
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => {
                    onOpenChange(false);
                    onConvertClick(head);
                  }}
                >
                  Convert to Sale
                </Button>
              )}
          </div>
          <DialogDescription>
            Order overview, customer self-payment portal link, and Somali delivery tracking.
          </DialogDescription>
        </DialogHeader>

        {!head ? null : (
          <div className="space-y-4 text-sm">
            {/* Customer Self-Payment Portal Management Card */}
            <section className="rounded-xl border border-red-200 bg-red-50/40 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-red-600 text-white font-bold text-xs">
                    B
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-950">
                      Customer Payment Portal (Bogga Macmiilka)
                    </h4>
                    <p className="text-xs text-red-700">
                      Share this link so the customer can view items and pay via EVC Plus, E-Dahab,
                      or Jeeb.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="portal-toggle"
                    className="text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    Portal Active
                  </Label>
                  <Switch
                    id="portal-toggle"
                    checked={portal?.portal_enabled ?? true}
                    onCheckedChange={handleTogglePortal}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Input
                    readOnly
                    value={portalUrl}
                    className="bg-white pr-20 font-mono text-xs text-slate-700 shadow-xs"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                      onClick={handleCopyLink}
                    >
                      <Copy className="size-3" /> Copy
                    </Button>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="bg-white border-red-200 text-red-700 hover:bg-red-50"
                >
                  <a href={portalUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-3.5" /> Open Portal
                  </a>
                </Button>
              </div>

              {/* Payment Verification Status & Action */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-red-100 pt-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-700">Payment Status:</span>
                  <span
                    className={`font-bold ${
                      portal?.payment_status === "verified"
                        ? "text-emerald-700"
                        : portal?.payment_status === "pending_verification"
                          ? "text-amber-700"
                          : "text-red-600"
                    }`}
                  >
                    {portal?.payment_status === "verified"
                      ? "Verified (La Xaqiijiyay)"
                      : portal?.payment_status === "pending_verification"
                        ? "Customer Submitted (Awaiting Verification)"
                        : "Not Paid Yet"}
                  </span>
                  {portal?.payment_reference && (
                    <span className="font-mono text-slate-500">
                      Ref: {portal.payment_reference}
                    </span>
                  )}
                </div>

                {portal?.payment_status !== "verified" && head.status !== "cancelled" && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700 h-7 text-xs font-bold"
                    onClick={handleConfirmPayment}
                  >
                    <CheckCircle2 className="size-3.5" /> Confirm Payment (Xaqiiji Lacagta)
                  </Button>
                )}
              </div>
            </section>

            {/* Somali Delivery Tracking & Driver Section */}
            {head.fulfillment !== "pickup" && (
              <section className="rounded-xl border bg-slate-50/80 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Truck className="size-4 text-red-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Somali Delivery Tracking Stage
                    </h4>
                  </div>
                  {portal?.driver_phone && (
                    <Button size="sm" variant="outline" asChild className="h-7 text-xs">
                      <a href={`tel:${portal.driver_phone}`}>
                        <PhoneCall className="size-3" /> Call Driver ({portal.driver_phone})
                      </a>
                    </Button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Current Stage</Label>
                    <Select
                      value={portal?.tracking_stage ?? "darawal_lama_dalban"}
                      onValueChange={(val) => handleStageChange(val as SomaliDeliveryStage)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOMALI_DELIVERY_STAGES.map((stg) => (
                          <SelectItem key={stg.id} value={stg.id}>
                            {stg.step}. {stg.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Assign Driver</Label>
                    <Select value="" onValueChange={handleDriverChange}>
                      <SelectTrigger className="bg-white">
                        <SelectValue
                          placeholder={
                            portal?.driver_name
                              ? `Current: ${portal.driver_name}`
                              : "Select a driver"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {(drivers ?? []).map((dr) => (
                          <SelectItem key={dr.id} value={dr.id}>
                            {dr.name} {dr.phone ? `(${dr.phone})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            )}

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
                Delivery Dispatch Record
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
                    : "No delivery record dispatched yet."}
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
