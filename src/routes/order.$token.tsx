import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Package,
  Phone,
  PhoneCall,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import {
  customerCancelOrder,
  customerSubmitPayment,
  getOrderPortalData,
  SOMALI_DELIVERY_STAGES,
  type OrderPortalData,
} from "@/lib/order-portal-service";

export const Route = createFileRoute("/order/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Bixi Dalabkaaga — Banadir Online" },
      {
        name: "description",
        content: "Bogga lacag bixinta iyo la socodka dalabka macaamiisha Banadir Online.",
      },
      { property: "og:title", content: "Bixi Dalabkaaga — Banadir Online" },
      {
        property: "og:description",
        content: "EVC Plus, E-Dahab iyo Jeeb lacag bixin toos ah.",
      },
    ],
  }),
  component: OrderCustomerPortalPage,
});

function OrderCustomerPortalPage() {
  const { token } = Route.useParams();
  const [order, setOrder] = useState<OrderPortalData | null>(() => getOrderPortalData(token));
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"evc_plus" | "edahab" | "jeeb">("evc_plus");
  const [transactionRef, setTransactionRef] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state periodically or when storage changes
  useEffect(() => {
    const refresh = () => {
      const data = getOrderPortalData(token);
      if (data) setOrder(data);
    };

    refresh();
    const interval = setInterval(refresh, 2000);
    window.addEventListener("storage", refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", refresh);
    };
  }, [token]);

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-md rounded-2xl border bg-background p-6 text-center shadow-lg">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-7" />
          </div>
          <h1 className="text-xl font-bold">Dalabka Lama Helin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Lama helin dalabka aad raadinayso. Fadlan xaqiiji link-ga ama la xiriir maamulka Banadir
            Online.
          </p>
          <div className="mt-6">
            <Button variant="outline" asChild className="w-full">
              <a href="tel:+252615550123">
                <Phone className="size-4" /> La Xiriir Xarunta (+252 61 555 0123)
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!order.portal_enabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-md rounded-2xl border bg-background p-6 text-center shadow-lg">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <Clock className="size-7" />
          </div>
          <h1 className="text-xl font-bold">Link-ga Dalabka Waa La Xiray</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Boggan si ku meel gaar ah ayaa loo joojiyay ama maamulka ayaa xiray. Fadlan la xiriir
            Banadir Online si laguu caawiyo.
          </p>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === "cancelled";
  const isPaid = order.payment_status === "verified" || order.remaining_balance <= 0;
  const isPendingVerification = order.payment_status === "pending_verification";
  const remaining = Math.max(0, order.remaining_balance);

  // USSD codes based on specifications:
  // EVC Plus: *712*613888125*AMOUNT#
  // E-Dahab: *110*622888125*AMOUNT#
  // Jeeb: *812*613888125*AMOUNT#
  const ussdCodes = {
    evc_plus: `*712*613888125*${remaining}#`,
    edahab: `*110*622888125*${remaining}#`,
    jeeb: `*812*613888125*${remaining}#`,
  };

  const dialUrls = {
    evc_plus: `tel:*712*613888125*${remaining}%23`,
    edahab: `tel:*110*622888125*${remaining}%23`,
    jeeb: `tel:*812*613888125*${remaining}%23`,
  };

  const handlePayNowClick = () => {
    if (isCancelled || isPaid) return;
    setConfirmModalOpen(true);
  };

  const handleConfirmYes = () => {
    setConfirmModalOpen(false);
    setPaymentModalOpen(true);
  };

  const handleConfirmNo = () => {
    setConfirmModalOpen(false);
    const updated = customerCancelOrder(token, "Customer chose 'MAYA' on payment confirmation");
    if (updated) {
      setOrder({ ...updated });
      toast.error("Dalabka waa la joojiyay (Order Cancelled)");
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Koodhka lacag-bixinta waa la koobiyeeyay!");
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      const updated = customerSubmitPayment(token, paymentMethod, transactionRef);
      setIsSubmitting(false);
      setPaymentModalOpen(false);
      if (updated) {
        setOrder({ ...updated });
        toast.success("Xaqiijinta lacag-bixinta waa la diray!");
      }
    }, 400);
  };

  // Find active tracking step
  const activeStageIndex = SOMALI_DELIVERY_STAGES.findIndex((s) => s.id === order.tracking_stage);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Brand Bar */}
      <header className="sticky top-0 z-30 border-b bg-white/95 px-4 py-3 backdrop-blur shadow-xs">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-red-600 font-bold text-white shadow-sm">
              B
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight text-slate-900">
                Banadir Online
              </h1>
              <p className="text-[11px] font-medium text-slate-500">Adeegga Iibka & Gaarsiinta</p>
            </div>
          </div>
          <div>
            <Badge
              variant="outline"
              className={`font-semibold ${
                isCancelled
                  ? "border-red-300 bg-red-50 text-red-700"
                  : isPaid
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : isPendingVerification
                      ? "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-blue-300 bg-blue-50 text-blue-700"
              }`}
            >
              {isCancelled
                ? "Waa La Joojiyay"
                : isPaid
                  ? "Waa La Bixiyay"
                  : isPendingVerification
                    ? "Xaqiijin Ku Jirta"
                    : "Weli Lama Bixin"}
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl p-4 pb-24 space-y-4">
        {/* Status Notification Banners */}
        {isCancelled && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-red-800 shadow-xs">
            <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
            <div className="text-sm">
              <p className="font-bold">Dalabkan Waa La Joojiyay</p>
              <p className="mt-0.5 text-xs text-red-700">
                Dalabkan lama sii wadi doono. Haddii aad rabto inaad dib u furto ama caawinaad u
                baahan tahay, fadlan la xiriir xarunta Banadir Online.
              </p>
            </div>
          </div>
        )}

        {isPaid && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-800 shadow-xs">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            <div className="text-sm">
              <p className="font-bold">Lacagta Si Buuxda Waa Loo Bixiyay</p>
              <p className="mt-0.5 text-xs text-emerald-700">
                Mahadsanid! Lacagtaada si guul leh ayaa loo xaqiijiyay. Dalabkaaga waxaa lagu
                diyaarinayaa qaybta gaarsiinta.
              </p>
            </div>
          </div>
        )}

        {isPendingVerification && !isPaid && !isCancelled && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-amber-900 shadow-xs">
            <Clock className="mt-0.5 size-5 shrink-0 text-amber-600 animate-pulse" />
            <div className="text-sm">
              <p className="font-bold">Lacag-bixintaadu waxay ku jirtaa xaqiijin</p>
              <p className="mt-0.5 text-xs text-amber-800">
                Waxaan helnay codsigaaga lacag-bixinta. Maamulka Banadir Online ayaa xaqiijinaya
                dhaqdhaqaaqa daqiiqado gudahood. Boggani si toos ah ayuu isku cusbooneysiinayaa.
              </p>
            </div>
          </div>
        )}

        {/* Customer & Order Dossier Card */}
        <section className="rounded-2xl border bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between border-b pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Dalabka
              </span>
              <p className="font-mono text-base font-bold text-slate-900">{order.order_no}</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Taariikhda
              </span>
              <p className="text-sm font-medium text-slate-700">{formatDate(order.order_date)}</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Macmiilka
              </p>
              <p className="font-semibold text-slate-800">{order.customer_name}</p>
              {order.customer_phone && (
                <p className="font-mono text-xs text-slate-500">{order.customer_phone}</p>
              )}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Habka Qaadashada
              </p>
              <p className="font-semibold text-slate-800 capitalize">
                {order.fulfillment === "pickup"
                  ? "Goobta Ka Qaadasho (Pickup)"
                  : order.fulfillment === "cargo"
                    ? "Cargo / Gobollada"
                    : "Gaarsiin Toos ah (Delivery)"}
              </p>
            </div>
            {order.customer_address && (
              <div className="col-span-2 border-t pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Cinwaanka Gaarsiinta
                </p>
                <p className="text-xs text-slate-600">{order.customer_address}</p>
              </div>
            )}
          </div>
        </section>

        {/* Prominent Red Remaining Balance Box */}
        <section className="rounded-2xl border-2 border-red-500 bg-red-50/70 p-5 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-red-600">
            {isPaid ? "Lacagta Bixinteeda Waa La Dhammaystiray" : "Lacagta Dhiman / Hada Bixi"}
          </p>
          <div className="mt-1 flex items-baseline justify-center gap-1">
            <span className="font-mono text-4xl font-black tracking-tight text-red-600 sm:text-5xl">
              {formatMoney(remaining)}
            </span>
          </div>
          <p className="mt-1 text-xs text-red-700">
            {isPaid
              ? "Mahadsanid! Ma jiro lacag hadda kugu dhiman."
              : isCancelled
                ? "Dalabka waa la joojiyay, ma jirto lacag lagaa rabo."
                : "Fadlan bixi lacagta dhiman si dalabkaaga loogu soo diro."}
          </p>

          {!isPaid && !isCancelled && (
            <div className="mt-4">
              <Button
                size="lg"
                onClick={handlePayNowClick}
                className="w-full bg-red-600 py-6 text-base font-bold text-white shadow-md hover:bg-red-700 active:scale-[0.98]"
              >
                Hada Bixi Lacagta (${formatNumber(remaining)})
              </Button>
            </div>
          )}
        </section>

        {/* Product Items Section with Images */}
        <section className="rounded-2xl border bg-white p-4 shadow-xs">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Alaabta Ku Jirta Dalabka
          </h2>

          {order.items.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Faahfaahinta alaabta...</p>
          ) : (
            <div className="divide-y">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-slate-100 text-slate-400">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="size-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Package className="size-6 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatNumber(item.quantity)} x {formatMoney(item.unit_price)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-slate-900">
                      {formatMoney(item.line_total)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pricing Ledger Breakdown */}
          <div className="mt-4 space-y-1.5 border-t pt-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Wadarta Alaabta</span>
              <span className="font-mono">{formatMoney(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Qiimo-dhimis</span>
                <span className="font-mono">-{formatMoney(order.discount)}</span>
              </div>
            )}
            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Lacagta Gaarsiinta</span>
                <span className="font-mono">+{formatMoney(order.delivery_fee)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1.5 text-base font-bold text-slate-900">
              <span>Wadarta Guud</span>
              <span className="font-mono">{formatMoney(order.total)}</span>
            </div>
            {order.paid_amount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Horay loo bixiyay</span>
                <span className="font-mono">{formatMoney(order.paid_amount)}</span>
              </div>
            )}
          </div>
        </section>

        {/* Live Delivery Tracking Section */}
        {order.fulfillment !== "pickup" && (
          <section className="rounded-2xl border bg-white p-4 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Xaaladda Gaarsiinta
                </h2>
                <p className="text-sm font-semibold text-slate-800">
                  {SOMALI_DELIVERY_STAGES[activeStageIndex >= 0 ? activeStageIndex : 0]?.label}
                </p>
              </div>
              <Truck className="size-5 text-red-600" />
            </div>

            {/* Tracking Steps Timeline */}
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {SOMALI_DELIVERY_STAGES.map((stage, idx) => {
                const isPassed = idx <= activeStageIndex;
                const isCurrent = idx === activeStageIndex;
                return (
                  <div key={stage.id} className="relative">
                    <div
                      className={`absolute -left-6 top-0.5 flex size-5 items-center justify-center rounded-full border-2 bg-white transition-colors ${
                        isCurrent
                          ? "border-red-600 bg-red-600 text-white shadow-sm ring-4 ring-red-100"
                          : isPassed
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-300 text-slate-300"
                      }`}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-slate-300" />
                      )}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-bold ${
                          isCurrent
                            ? "text-red-600"
                            : isPassed
                              ? "text-slate-800"
                              : "text-slate-400"
                        }`}
                      >
                        {stage.label}
                      </p>
                      <p className="text-xs text-slate-500">{stage.sublabel}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Assigned Driver Card with Call Button */}
            {order.driver_name && (
              <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-red-100 text-red-700">
                    <Truck className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500">Darawalka Kuu Wada</p>
                    <p className="text-sm font-bold text-slate-900">{order.driver_name}</p>
                  </div>
                </div>
                {order.driver_phone ? (
                  <Button
                    size="sm"
                    asChild
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <a href={`tel:${order.driver_phone}`}>
                      <PhoneCall className="size-3.5" /> Wac Darawalka
                    </a>
                  </Button>
                ) : null}
              </div>
            )}
          </section>
        )}

        {/* Help & Support Footer Info */}
        <footer className="rounded-2xl border bg-white p-4 text-center text-xs text-slate-500 space-y-2">
          <div className="flex items-center justify-center gap-1.5 font-semibold text-slate-700">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span>Banadir Online - Bixin Toos ah & Sugan</span>
          </div>
          <p>
            Wixii su&apos;aal ama faahfaahin ah, fadlan nagala soo xiriir WhatsApp ama taleefanka:{" "}
            <a href="tel:+252615550123" className="font-bold text-red-600 underline">
              +252 61 555 0123
            </a>
          </p>
        </footer>
      </main>

      {/* 1. Confirmation Modal: "Ma hubtaa inaad Lacag dhan $[AMOUNT] u dirto Banadir Online?" */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertCircle className="size-6" />
            </div>
            <DialogTitle className="text-lg font-bold">Xaqiijinta Lacag Bixinta</DialogTitle>
            <DialogDescription className="text-sm font-medium text-slate-700 pt-2">
              Ma hubtaa inaad Lacag dhan{" "}
              <span className="font-bold text-red-600 text-base">{formatMoney(remaining)}</span> u
              dirto Banadir Online?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              size="lg"
              onClick={handleConfirmNo}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold"
            >
              MAYA (Jooji Dalabka)
            </Button>
            <Button
              size="lg"
              onClick={handleConfirmYes}
              className="bg-red-600 hover:bg-red-700 font-bold text-white"
            >
              HAA (Sii Wad)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Payment Method Selection Modal: EVC Plus, E-Dahab, Jeeb */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Dooro Habka Lacag Bixinta</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Garaac koodhka ku qoran habka aad doorato ama guji si aad toos ugu wacdo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitPayment} className="space-y-4 pt-2">
            <RadioGroup
              value={paymentMethod}
              onValueChange={(val) => setPaymentMethod(val as "evc_plus" | "edahab" | "jeeb")}
              className="space-y-3"
            >
              {/* EVC Plus */}
              <div
                className={`relative flex cursor-pointer items-start justify-between rounded-xl border p-3.5 transition-colors ${
                  paymentMethod === "evc_plus"
                    ? "border-red-600 bg-red-50/40"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
                onClick={() => setPaymentMethod("evc_plus")}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="evc_plus" id="opt-evc" className="mt-1 text-red-600" />
                  <div>
                    <Label htmlFor="opt-evc" className="cursor-pointer font-bold text-slate-900">
                      EVC Plus (Hormuud)
                    </Label>
                    <p className="font-mono text-sm font-bold text-red-600">{ussdCodes.evc_plus}</p>
                    <p className="text-[11px] text-slate-500">Lambarka Ganacsiga: 613888125</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs font-semibold"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyCode(ussdCodes.evc_plus);
                    }}
                  >
                    <Copy className="size-3" /> Koobiyeey
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    asChild
                    className="h-8 bg-red-600 hover:bg-red-700 px-2.5 text-xs text-white"
                  >
                    <a href={dialUrls.evc_plus}>
                      <Phone className="size-3" /> Garaac
                    </a>
                  </Button>
                </div>
              </div>

              {/* E-Dahab */}
              <div
                className={`relative flex cursor-pointer items-start justify-between rounded-xl border p-3.5 transition-colors ${
                  paymentMethod === "edahab"
                    ? "border-red-600 bg-red-50/40"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
                onClick={() => setPaymentMethod("edahab")}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="edahab" id="opt-edahab" className="mt-1 text-red-600" />
                  <div>
                    <Label htmlFor="opt-edahab" className="cursor-pointer font-bold text-slate-900">
                      E-Dahab (Somtel)
                    </Label>
                    <p className="font-mono text-sm font-bold text-red-600">{ussdCodes.edahab}</p>
                    <p className="text-[11px] text-slate-500">Lambarka Ganacsiga: 622888125</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs font-semibold"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyCode(ussdCodes.edahab);
                    }}
                  >
                    <Copy className="size-3" /> Koobiyeey
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    asChild
                    className="h-8 bg-red-600 hover:bg-red-700 px-2.5 text-xs text-white"
                  >
                    <a href={dialUrls.edahab}>
                      <Phone className="size-3" /> Garaac
                    </a>
                  </Button>
                </div>
              </div>

              {/* Jeeb */}
              <div
                className={`relative flex cursor-pointer items-start justify-between rounded-xl border p-3.5 transition-colors ${
                  paymentMethod === "jeeb"
                    ? "border-red-600 bg-red-50/40"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
                onClick={() => setPaymentMethod("jeeb")}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="jeeb" id="opt-jeeb" className="mt-1 text-red-600" />
                  <div>
                    <Label htmlFor="opt-jeeb" className="cursor-pointer font-bold text-slate-900">
                      Jeeb (Somnet)
                    </Label>
                    <p className="font-mono text-sm font-bold text-red-600">{ussdCodes.jeeb}</p>
                    <p className="text-[11px] text-slate-500">Lambarka Ganacsiga: 613888125</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 text-xs font-semibold"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyCode(ussdCodes.jeeb);
                    }}
                  >
                    <Copy className="size-3" /> Koobiyeey
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    asChild
                    className="h-8 bg-red-600 hover:bg-red-700 px-2.5 text-xs text-white"
                  >
                    <a href={dialUrls.jeeb}>
                      <Phone className="size-3" /> Garaac
                    </a>
                  </Button>
                </div>
              </div>
            </RadioGroup>

            <div className="space-y-1.5 border-t pt-3">
              <Label htmlFor="tx-ref" className="text-xs font-semibold">
                Lambarka Dhaqdhaqaaqa / Ref ID (Ikhtiyaari)
              </Label>
              <Input
                id="tx-ref"
                placeholder="Tusaale: TR-9821734"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-slate-500">
                Geli lambarka fariinta xawaaladda si lacagtaadu si dhaqso leh ugu xaqiijiyo
                maamulka.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-red-600 py-6 text-sm font-bold text-white hover:bg-red-700"
              >
                {isSubmitting ? "Waa la dirayaa..." : "Waxaan Diray Lacagta (Xaqiiji)"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
