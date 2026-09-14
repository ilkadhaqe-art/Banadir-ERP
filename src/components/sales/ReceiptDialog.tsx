import { Download, Loader2, MessageCircle, Printer } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProducts } from "@/hooks/useCatalog";
import { useAppSettings } from "@/hooks/useReports";
import { useSaleItems, useSaleOverview } from "@/hooks/useSales";
import { formatMoney, formatNumber } from "@/lib/format";
import { useSignedImageUrls } from "@/lib/product-images";
import { PAYMENT_STATUS_LABELS } from "@/lib/sales-types";

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #receipt-sheet, #receipt-sheet * { visibility: visible !important; }
  #receipt-sheet {
    position: absolute; left: 0; top: 0; width: 100%;
    background: #fff !important; color: #111 !important;
    box-shadow: none !important; border: 0 !important;
  }
}
`;

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 text-sm ${strong ? "font-semibold" : ""}`}
    >
      <span className="text-[#555]">{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}

/**
 * Counter-friendly receipt for a saved sale. Everything shown here comes from
 * the database: the sale row, its lines, product images and the receipt
 * branding stored in app settings.
 */
export function ReceiptDialog({
  open,
  onOpenChange,
  saleId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string | null;
}) {
  const { data: sale } = useSaleOverview(open ? saleId : null);
  const { data: items } = useSaleItems(open && saleId ? saleId : null);
  const { data: products } = useProducts();
  const { data: settings } = useAppSettings();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const setting = (key: string, fallback = "") =>
    settings?.find((row) => row.key === key)?.value?.trim() || fallback;

  const logoRaw = setting("receipt_logo_url");
  const resolveImage = useSignedImageUrls([
    logoRaw,
    ...(products ?? []).map((product) => product.image_url),
  ]);
  const imageByProduct = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const product of products ?? []) map.set(product.id, resolveImage(product.image_url));
    return map;
  }, [products, resolveImage]);

  const businessName = setting("receipt_business_name", "Banadir Online");
  const logo = resolveImage(logoRaw);

  const print = () => window.print();

  const download = async () => {
    if (!sheetRef.current || !sale) return;
    setBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(sheetRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const image = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "px", format: [canvas.width, canvas.height] });
      pdf.addImage(image, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`Receipt-${sale.sale_no}.pdf`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not build the PDF");
    } finally {
      setBusy(false);
    }
  };

  const whatsapp = () => {
    if (!sale) return;
    const phone = (sale.customer_phone ?? "").replace(/[^0-9]/g, "");
    const lines = [
      `*${businessName}* — RECEIPT`,
      `Ref: ${sale.sale_no}`,
      `Date: ${sale.sale_date}`,
      sale.customer_name ? `Customer: ${sale.customer_name}` : "",
      ...(items ?? []).map(
        (item) =>
          `${formatNumber(item.quantity)} x ${item.product_name} = ${formatMoney(item.line_total)}`,
      ),
      sale.discount > 0 ? `Discount: ${formatMoney(sale.discount)}` : "",
      sale.vat_amount > 0 ? `VAT: ${formatMoney(sale.vat_amount)}` : "",
      sale.delivery_fee > 0 ? `Delivery fee: ${formatMoney(sale.delivery_fee)}` : "",
      sale.cargo_fee > 0 ? `Cargo fee: ${formatMoney(sale.cargo_fee)}` : "",
      `Total: ${formatMoney(sale.total)}`,
      `Payment: ${sale.payment_channel_name ?? sale.payment_method.replace("_", " ")}`,
      sale.bank_name ? `Bank: ${sale.bank_name}` : "",
      `Paid: ${formatMoney(sale.paid_amount)}`,
      `Balance: ${formatMoney(sale.balance)}`,
      `Status: ${PAYMENT_STATUS_LABELS[sale.payment_status]}`,
      sale.fulfillment !== "pickup" ? `Fulfillment: ${sale.fulfillment.toUpperCase()}` : "",
      sale.delivery_company_name ? `Company: ${sale.delivery_company_name}` : "",
      sale.cargo_company_name ? `Cargo: ${sale.cargo_company_name}` : "",
      sale.driver_name ? `Driver: ${sale.driver_name}` : "",
      sale.driver_phone ? `Driver phone: ${sale.driver_phone}` : "",
      sale.location_name ? `Location: ${sale.location_name}` : "",
      setting("receipt_footer", "Thank you for your business!"),
    ].filter(Boolean);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank", "noopener");
  };

  if (!sale) return null;

  const time = sale.sale_time ? new Date(sale.sale_time).toLocaleTimeString() : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
        <style>{PRINT_CSS}</style>
        <DialogHeader>
          <DialogTitle>Receipt {sale.sale_no}</DialogTitle>
          <DialogDescription>Print, download as PDF or send on WhatsApp.</DialogDescription>
        </DialogHeader>

        <div
          id="receipt-sheet"
          ref={sheetRef}
          className="mx-auto w-full max-w-[380px] rounded-xl bg-white p-5 text-[#111]"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            {logo ? <img src={logo} alt={businessName} className="h-16 object-contain" /> : null}
            <h2 className="text-lg font-bold tracking-wide">{businessName}</h2>
            {setting("receipt_tagline") ? (
              <p className="text-xs text-[#666]">{setting("receipt_tagline")}</p>
            ) : null}
            <p className="text-xs text-[#666]">
              {[setting("receipt_phone"), setting("receipt_whatsapp"), setting("receipt_email")]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {setting("receipt_address") ? (
              <p className="text-xs text-[#666]">{setting("receipt_address")}</p>
            ) : null}
          </div>

          {setting("receipt_header") ? (
            <p className="mt-3 text-center text-xs text-[#666]">{setting("receipt_header")}</p>
          ) : null}

          <div className="my-3 rounded-md bg-[#f3f4f6] py-1 text-center text-sm font-bold tracking-[0.3em]">
            RECEIPT
          </div>

          <div className="grid gap-1">
            <Line label="Ref NO" value={sale.sale_no} />
            <Line label="Date" value={`${sale.sale_date}${time ? ` ${time}` : ""}`} />
            <Line label="Customer" value={sale.customer_name ?? "Walk-in"} />
            {sale.customer_phone ? <Line label="Phone" value={sale.customer_phone} /> : null}
            {sale.customer_address ? <Line label="Address" value={sale.customer_address} /> : null}
          </div>

          <table className="mt-3 w-full text-xs">
            <thead>
              <tr className="border-y border-[#e5e7eb] text-left text-[#555]">
                <th className="py-1">Item</th>
                <th className="py-1 text-right">Qty</th>
                <th className="py-1 text-right">Price</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((item) => {
                const image = imageByProduct.get(item.product_id);
                return (
                  <tr key={item.id} className="border-b border-[#f1f1f1] align-middle">
                    <td className="py-1.5">
                      <div className="flex items-center gap-2">
                        {image ? (
                          <img
                            src={image}
                            alt={item.product_name}
                            className="size-7 rounded object-cover"
                          />
                        ) : null}
                        <span>{item.product_name}</span>
                      </div>
                    </td>
                    <td className="num py-1.5 text-right">{formatNumber(item.quantity)}</td>
                    <td className="num py-1.5 text-right">{formatMoney(item.unit_price)}</td>
                    <td className="num py-1.5 text-right">{formatMoney(item.line_total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-3 grid gap-1 border-t border-[#e5e7eb] pt-2">
            <Line label="Subtotal" value={formatMoney(sale.subtotal)} />
            {sale.discount > 0 ? (
              <Line label="Discount" value={formatMoney(sale.discount)} />
            ) : null}
            {sale.vat_amount > 0 ? (
              <Line label={`VAT (${sale.vat_rate}%)`} value={formatMoney(sale.vat_amount)} />
            ) : null}
            {sale.delivery_fee > 0 ? (
              <Line label="Delivery fee" value={formatMoney(sale.delivery_fee)} />
            ) : null}
            {sale.cargo_fee > 0 ? (
              <Line label="Cargo fee" value={formatMoney(sale.cargo_fee)} />
            ) : null}
          </div>

          <div className="mt-2 flex items-baseline justify-between rounded-md bg-[#16a34a] px-3 py-2 text-white">
            <span className="text-sm font-semibold">TOTAL</span>
            <span className="num text-lg font-bold">{formatMoney(sale.total)}</span>
          </div>

          <div className="mt-2 grid gap-1">
            <Line
              label="Payment"
              value={sale.payment_channel_name ?? sale.payment_method.replace("_", " ")}
            />
            {sale.bank_name ? <Line label="Bank" value={sale.bank_name} /> : null}
            <Line label="Paid" value={formatMoney(sale.paid_amount)} />
            <Line label="Balance" value={formatMoney(sale.balance)} strong />
            <Line label="Status" value={PAYMENT_STATUS_LABELS[sale.payment_status]} />
          </div>

          {sale.fulfillment !== "pickup" ? (
            <div className="mt-2 grid gap-1 border-t border-[#e5e7eb] pt-2">
              <Line label="Fulfillment" value={sale.fulfillment.toUpperCase()} />
              {sale.delivery_company_name ? (
                <Line label="Company" value={sale.delivery_company_name} />
              ) : null}
              {sale.cargo_company_name ? (
                <Line label="Cargo" value={sale.cargo_company_name} />
              ) : null}
              {sale.driver_name ? <Line label="Driver" value={sale.driver_name} /> : null}
              {sale.driver_phone ? <Line label="Driver phone" value={sale.driver_phone} /> : null}
              {sale.location_name ? <Line label="Location" value={sale.location_name} /> : null}
              {sale.address ? <Line label="Address" value={sale.address} /> : null}
            </div>
          ) : (
            <div className="mt-2 border-t border-[#e5e7eb] pt-2">
              <Line label="Fulfillment" value="PICKUP" />
            </div>
          )}

          {sale.note ? <p className="mt-2 text-xs text-[#666]">Note: {sale.note}</p> : null}
          {setting("receipt_payment_info") ? (
            <p className="mt-2 text-xs text-[#666]">{setting("receipt_payment_info")}</p>
          ) : null}
          {setting("receipt_notes") ? (
            <p className="mt-1 text-xs text-[#666]">{setting("receipt_notes")}</p>
          ) : null}
          <p className="mt-3 text-center text-xs font-medium">
            {setting("receipt_footer", "Thank you for your business!")}
          </p>
          {setting("receipt_terms") ? (
            <p className="mt-1 text-center text-[10px] text-[#888]">{setting("receipt_terms")}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2 print:hidden">
          <Button variant="outline" onClick={print}>
            <Printer className="size-4" /> Print
          </Button>
          <Button variant="outline" onClick={() => void download()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            PDF
          </Button>
          <Button onClick={whatsapp}>
            <MessageCircle className="size-4" /> WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
