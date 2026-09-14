import { Package, Plus, Save, Search, Trash2, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CustomerDialog } from "@/components/sales/CustomerDialog";
import { ReceiptDialog } from "@/components/sales/ReceiptDialog";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProducts, useProductStock } from "@/hooks/useCatalog";
import {
  useDeliveryCompanies,
  useLocations,
  useRateLookup,
  useSmartDefaults,
} from "@/hooks/useFulfillment";
import { useCargoCompanies, useDrivers } from "@/hooks/useLogistics";
import {
  useCreateSale,
  useCustomerBalances,
  useNextSaleNo,
  usePaymentAccounts,
  usePaymentChannels,
  useSaleItems,
  useUpdateSale,
} from "@/hooks/useSales";
import { dayKey, formatMoney, formatNumber } from "@/lib/format";
import type { FulfillmentType } from "@/lib/logistics-types";
import { FULFILLMENT_TYPES } from "@/lib/logistics-types";
import { useSignedImageUrls } from "@/lib/product-images";
import type { PaymentMethod, SaleLineInput, SaleOverview } from "@/lib/sales-types";

const WALK_IN = "__walk_in__";
const NONE = "__none__";

type Line = SaleLineInput & { key: string };

function clockValue(date: Date = new Date()) {
  return `${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}

/**
 * New / edit sale popup. Stock, prices and customer credit come from the read
 * models; create_sale() and update_sale() own stock checks, credit limits,
 * VAT, the advance (Hormaris) split, the sale number and the engine rebuild.
 */
export function SaleDialog({
  open,
  onOpenChange,
  sale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale?: SaleOverview | null;
}) {
  const editing = Boolean(sale);
  const { data: stock, isPending: stockPending } = useProductStock();
  const { data: products } = useProducts();
  const { data: balances } = useCustomerBalances();
  const { data: accounts } = usePaymentAccounts();
  const { data: defaults } = useSmartDefaults();
  const { data: locations } = useLocations();
  const { data: deliveryCompanies } = useDeliveryCompanies();
  const { data: cargoCompanies } = useCargoCompanies();
  const { data: drivers } = useDrivers();
  const { data: channels } = usePaymentChannels();
  const { data: nextNo } = useNextSaleNo(open && !sale);
  const { data: existingItems } = useSaleItems(editing && open ? (sale?.id ?? null) : null);
  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const pending = createSale.isPending || updateSale.isPending;

  const [saleDate, setSaleDate] = useState(dayKey());
  const [saleClock, setSaleClock] = useState(clockValue());
  const [customerId, setCustomerId] = useState(WALK_IN);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("0");
  const [paymentMode, setPaymentMode] = useState<"full_paid" | "partial" | "full_debt">(
    "full_paid",
  );
  const [partialAmount, setPartialAmount] = useState("");
  const [saleNo, setSaleNo] = useState("");
  const [channelId, setChannelId] = useState("");
  const [bankName, setBankName] = useState("");
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");

  const [fulfillment, setFulfillment] = useState<FulfillmentType>("pickup");
  const [locationId, setLocationId] = useState(NONE);
  const [regionId, setRegionId] = useState(NONE);
  const [deliveryCompanyId, setDeliveryCompanyId] = useState(NONE);
  const [driverId, setDriverId] = useState(NONE);
  const [cargoCompanyId, setCargoCompanyId] = useState(NONE);
  const [fee, setFee] = useState("0");
  const [feeTouched, setFeeTouched] = useState(false);
  const [advance, setAdvance] = useState("0");
  const [recipient, setRecipient] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const districts = useMemo(
    () => (locations ?? []).filter((l) => l.level === "district" && l.active),
    [locations],
  );
  const regions = useMemo(
    () => (locations ?? []).filter((l) => l.level === "region" && l.active),
    [locations],
  );

  /** Reset on open: edit loads the sale, create applies the smart defaults. */
  useEffect(() => {
    if (!open) return;
    setSearch("");
    setFeeTouched(editing);
    if (sale) {
      setSaleDate(sale.sale_date);
      setSaleClock(sale.sale_time ? clockValue(new Date(sale.sale_time)) : clockValue());
      setCustomerId(sale.customer_id ?? WALK_IN);
      setDiscount(String(Number(sale.discount)));
      setSaleNo(sale.sale_no);
      setChannelId(sale.payment_channel_id ?? "");
      setBankName(sale.bank_name ?? "");
      setAccountId(sale.account_id ?? "");
      setNote(sale.note ?? "");
      setFulfillment(sale.fulfillment);
      setLocationId(sale.location_id ?? NONE);
      setRegionId(sale.region_id ?? NONE);
      setDeliveryCompanyId(sale.delivery_company_id ?? NONE);
      setDriverId(sale.driver_id ?? NONE);
      setCargoCompanyId(sale.cargo_company_id ?? NONE);
      setFee(String(Number(sale.delivery_fee) + Number(sale.cargo_fee)));
      setAdvance(String(Number(sale.advance_amount)));
      setRecipient(sale.recipient_name ?? "");
      setPhone(sale.recipient_phone ?? "");
      setAddress(sale.address ?? "");
      const goodsPaid = Number(sale.paid_amount);
      setPaymentMode(
        goodsPaid >= Number(sale.total) ? "full_paid" : goodsPaid > 0 ? "partial" : "full_debt",
      );
      setPartialAmount(String(Math.max(goodsPaid - Number(sale.advance_amount), 0)));
      return;
    }
    setSaleDate(dayKey());
    setSaleClock(clockValue());
    setCustomerId(WALK_IN);
    setLines([]);
    setDiscount("0");
    setPaymentMode("full_paid");
    setPartialAmount("");
    setBankName("");
    setNote("");
    setFulfillment("pickup");
    setLocationId(defaults?.location_id ?? NONE);
    setRegionId(defaults?.region_id ?? NONE);
    setDeliveryCompanyId(defaults?.delivery_company_id ?? NONE);
    setDriverId(defaults?.driver_id ?? NONE);
    setCargoCompanyId(defaults?.cargo_company_id ?? NONE);
    setFee("0");
    setAdvance("0");
    setRecipient("");
    setPhone("");
    setAddress("");
  }, [open, sale, editing, defaults]);

  /** New sale: prefill the editable S00001-style reference. */
  useEffect(() => {
    if (!open || editing || !nextNo?.sale_no) return;
    setSaleNo(nextNo.sale_no);
  }, [open, editing, nextNo]);

  /** Default payment channel: EVC Plus (flagged in the database). */
  useEffect(() => {
    if (!open || channelId || !channels?.length) return;
    setChannelId((channels.find((c) => c.is_default) ?? channels[0]!).id);
  }, [open, channelId, channels]);

  /** Edit mode: hydrate the existing lines once they arrive. */
  useEffect(() => {
    if (!open || !editing || !existingItems) return;
    setLines(
      existingItems.map((item) => ({
        key: item.id,
        product_id: item.product_id,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
      })),
    );
  }, [open, editing, existingItems]);

  const channel = (channels ?? []).find((row) => row.id === channelId) ?? null;
  const method: PaymentMethod = channel?.method ?? "cash";
  const channelGroups = useMemo(() => {
    const groups = new Map<string, typeof channels>();
    for (const row of channels ?? []) {
      const list = groups.get(row.group_name) ?? [];
      list.push(row);
      groups.set(row.group_name, list as never);
    }
    return Array.from(groups.entries());
  }, [channels]);

  const activeAccounts = useMemo(
    () => (accounts ?? []).filter((a) => a.active && a.scope === "business"),
    [accounts],
  );

  useEffect(() => {
    if (!accountId && activeAccounts.length > 0) setAccountId(activeAccounts[0]!.id);
  }, [accountId, activeAccounts]);

  const resolveImage = useSignedImageUrls((products ?? []).map((p) => p.image_url));
  const imageByProduct = useMemo(
    () => new Map((products ?? []).map((p) => [p.id, resolveImage(p.image_url)])),
    [products, resolveImage],
  );

  const sellable = useMemo(
    () => (stock ?? []).filter((row) => row.active && Number(row.stock_on_hand) > 0),
    [stock],
  );

  /** Editing keeps lines whose stock is already consumed by this sale. */
  const stockById = useMemo(
    () => new Map((stock ?? []).map((row) => [row.product_id, row])),
    [stock],
  );

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    const preferred = defaults?.product_id;
    const list = term
      ? sellable.filter(
          (row) =>
            row.name.toLowerCase().includes(term) ||
            row.sku.toLowerCase().includes(term) ||
            (row.barcode ?? "").toLowerCase().includes(term),
        )
      : [...sellable].sort((a, b) =>
          a.product_id === preferred ? -1 : b.product_id === preferred ? 1 : 0,
        );
    return list.slice(0, 8);
  }, [sellable, search, defaults]);

  const companyDrivers = useMemo(
    () =>
      (drivers ?? []).filter(
        (d) =>
          d.active &&
          (deliveryCompanyId === NONE ? !d.company_id : d.company_id === deliveryCompanyId),
      ),
    [drivers, deliveryCompanyId],
  );
  const driver = (drivers ?? []).find((d) => d.id === driverId) ?? null;

  /** Delivery carries the driver's own name and phone, not a recipient. */
  useEffect(() => {
    if (fulfillment !== "delivery" || !driver) return;
    setRecipient(driver.name);
    setPhone(driver.phone ?? "");
  }, [fulfillment, driver]);

  const customer = (balances ?? []).find((row) => row.customer_id === customerId);

  /** Rate cards prefill the fee; a manual edit always wins. */
  const rate = useRateLookup({
    kind: fulfillment === "cargo" ? "cargo" : "delivery",
    location_id: fulfillment === "cargo" ? nullable(regionId) : nullable(locationId),
    company_id: fulfillment === "cargo" ? nullable(cargoCompanyId) : nullable(deliveryCompanyId),
    driver_id: fulfillment === "delivery" ? nullable(driverId) : null,
    on: saleDate,
    enabled: fulfillment !== "pickup",
  });

  useEffect(() => {
    if (fulfillment === "pickup" || feeTouched) return;
    if (typeof rate.data === "number") setFee(String(rate.data));
  }, [rate.data, fulfillment, feeTouched]);

  useEffect(() => {
    if (fulfillment !== "pickup") return;
    setFee("0");
  }, [fulfillment]);

  /** Merchant payments carry VAT automatically at the configured rate. */
  const vatRate = method === "merchant" ? Number(defaults?.merchant_vat_rate ?? 0) : 0;

  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
  const cogs = lines.reduce(
    (sum, line) => sum + line.quantity * Number(stockById.get(line.product_id)?.cost_price ?? 0),
    0,
  );
  const discountValue = Math.max(Number(discount) || 0, 0);
  const vatAmount = Math.round(Math.max(subtotal - discountValue, 0) * vatRate * 100) / 100;
  const total = Math.max(subtotal - discountValue, 0) + vatAmount;
  const feeValue = fulfillment === "pickup" ? 0 : Math.max(Number(fee) || 0, 0);
  const advanceValue = fulfillment === "cargo" ? 0 : Math.max(Number(advance) || 0, 0);
  const advanceToFee = Math.min(advanceValue, feeValue);
  const advanceToGoods = advanceValue - advanceToFee;
  const effectiveMode = fulfillment === "cargo" ? "full_paid" : paymentMode;
  const paidNow =
    effectiveMode === "full_paid"
      ? Math.max(total - advanceToGoods, 0)
      : effectiveMode === "partial"
        ? Number(partialAmount) || 0
        : 0;
  const goodsPaid = advanceToGoods + paidNow;
  const goodsBalance = Math.max(total - goodsPaid, 0);
  const feeBalance = Math.max(feeValue - advanceToFee, 0);

  const addLine = (productId: string) => {
    const row = stockById.get(productId);
    if (!row) return;
    setLines((prev) => {
      const existing = prev.find((line) => line.product_id === productId);
      if (existing) {
        return prev.map((line) =>
          line.product_id === productId ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...prev,
        {
          key: `${productId}-${Date.now()}`,
          product_id: productId,
          quantity: 1,
          unit_price: Number(row.sell_price),
        },
      ];
    });
    setSearch("");
  };

  const needsCustomer = goodsBalance > 0 || feeBalance > 0;
  const needsAccount = goodsPaid + advanceToFee > 0;

  const validation = (() => {
    if (lines.length === 0) return "Add at least one product.";
    if (lines.some((line) => line.quantity <= 0)) return "Every line needs a quantity above zero.";
    if (!editing) {
      for (const line of lines) {
        const row = stockById.get(line.product_id);
        if (row && line.quantity > Number(row.stock_on_hand)) {
          return `Only ${formatNumber(Number(row.stock_on_hand))} ${row.unit} of ${row.name} in stock.`;
        }
      }
    }
    if (discountValue > subtotal) return "Discount cannot exceed the subtotal.";
    if (goodsPaid > total) return "Payments cannot exceed the sale total.";
    if (needsCustomer && customerId === WALK_IN)
      return "Sales with an outstanding balance need a customer.";
    if (needsAccount && !accountId) return "Choose the account that received the payment.";
    if (!saleNo.trim()) return "Ref NO is required.";
    if (!channelId) return "Choose the payment method.";
    if (channel?.requires_bank_name && !bankName.trim()) return "Type the bank name.";
    if (fulfillment === "delivery" && deliveryCompanyId === NONE && driverId === NONE)
      return "Choose the delivery company or driver.";
    if (fulfillment === "delivery" && locationId === NONE) return "Choose the delivery district.";
    if (fulfillment === "cargo" && cargoCompanyId === NONE) return "Choose the cargo company.";
    if (fulfillment === "cargo" && regionId === NONE) return "Choose the destination region.";
    return null;
  })();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending || validation) return;
    const payload = {
      sale_no: saleNo.trim(),
      payment_channel_id: channelId || null,
      bank_name: channel?.requires_bank_name ? bankName.trim() || null : null,
      sale_date: saleDate,
      sale_time: new Date(`${saleDate}T${saleClock || "00:00"}:00`).toISOString(),
      customer_id: customerId === WALK_IN ? null : customerId,
      items: lines.map(({ product_id, quantity, unit_price }) => ({
        product_id,
        quantity,
        unit_price,
      })),
      discount: discountValue,
      paid_amount: paidNow,
      advance_amount: advanceValue,
      vat_rate: vatRate,
      payment_method: method,
      account_id: needsAccount ? accountId : null,
      note: note.trim() || null,
      fulfillment,
      delivery_fee: fulfillment === "delivery" ? feeValue : 0,
      cargo_fee: fulfillment === "cargo" ? feeValue : 0,
      recipient_name: fulfillment === "delivery" ? recipient.trim() || null : null,
      recipient_phone: fulfillment === "delivery" ? phone.trim() || null : null,
      address: fulfillment === "delivery" ? address.trim() || null : null,
      location_id: fulfillment === "delivery" ? nullable(locationId) : null,
      region_id: fulfillment === "cargo" ? nullable(regionId) : null,
      delivery_company_id: fulfillment === "delivery" ? nullable(deliveryCompanyId) : null,
      driver_id: fulfillment === "delivery" ? nullable(driverId) : null,
      cargo_company_id: fulfillment === "cargo" ? nullable(cargoCompanyId) : null,
    };
    if (sale) {
      await updateSale.mutateAsync({ sale_id: sale.id, ...payload });
      onOpenChange(false);
      setReceiptId(sale.id);
      return;
    }
    const created = await createSale.mutateAsync(payload);
    onOpenChange(false);
    setReceiptId(created.id);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto sm:w-full">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit sale ${sale?.sale_no}` : "New sale"}</DialogTitle>
            <DialogDescription>
              Stock, credit limits, VAT, the advance split, payment status and the sale reference
              are decided by the database. Backdating recalculates targets automatically.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="s-ref">Ref NO</Label>
              <Input
                id="s-ref"
                required
                value={saleNo}
                onChange={(e) => setSaleNo(e.target.value)}
                placeholder="S00001"
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated and editable — the database refuses duplicates.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="s-date">Sale date</Label>
                <Input
                  id="s-date"
                  type="date"
                  required
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="s-time">Time</Label>
                <Input
                  id="s-time"
                  type="time"
                  value={saleClock}
                  onChange={(e) => setSaleClock(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Customer</Label>
                <div className="flex gap-2">
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger aria-label="Select customer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={WALK_IN}>Walk-in (no customer)</SelectItem>
                      {(balances ?? [])
                        .filter((row) => row.active)
                        .map((row) => (
                          <SelectItem key={row.customer_id} value={row.customer_id}>
                            {row.name}
                            {row.phone ? ` · ${row.phone}` : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="New customer"
                    onClick={() => setCustomerOpen(true)}
                  >
                    <UserPlus className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            {customer ? (
              <p className="-mt-2 text-xs text-muted-foreground">
                Outstanding{" "}
                <span className="num font-medium text-foreground">
                  {formatMoney(Number(customer.balance))}
                </span>{" "}
                · limit {formatMoney(Number(customer.credit_limit))} · available{" "}
                {formatMoney(Number(customer.credit_available))}
              </p>
            ) : null}

            <div className="grid gap-1.5">
              <Label htmlFor="s-search">Add products</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="s-search"
                  className="pl-9"
                  placeholder="Search name, SKU or barcode"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {stockPending ? (
                <p className="text-xs text-muted-foreground">Loading stock…</p>
              ) : sellable.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No product currently has stock on hand.
                </p>
              ) : (
                <div className="max-h-52 overflow-y-auto rounded-xl border border-border">
                  {matches.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground">No product matches.</p>
                  ) : (
                    matches.map((row) => (
                      <button
                        key={row.product_id}
                        type="button"
                        onClick={() => addLine(row.product_id)}
                        className="flex w-full items-center gap-3 border-b border-border/70 px-3 py-2 text-left text-sm last:border-0 hover:bg-accent/40"
                      >
                        <ProductThumb
                          url={imageByProduct.get(row.product_id) ?? null}
                          name={row.name}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{row.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {row.sku} · {formatNumber(Number(row.stock_on_hand))} {row.unit} on hand
                          </span>
                        </span>
                        <span className="num shrink-0 text-sm font-semibold">
                          {formatMoney(Number(row.sell_price))}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {lines.length > 0 ? (
              <div className="-mx-1 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-2 font-semibold">Product</th>
                      <th className="px-2 py-2 text-right font-semibold">Cost</th>
                      <th className="px-2 py-2 text-right font-semibold">Price</th>
                      <th className="px-2 py-2 text-right font-semibold">Qty</th>
                      <th className="px-2 py-2 text-right font-semibold">Line</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lines.map((line) => {
                      const row = stockById.get(line.product_id);
                      const over =
                        !editing && row ? line.quantity > Number(row.stock_on_hand) : false;
                      return (
                        <tr key={line.key}>
                          <td className="px-2 py-2">
                            <span className="flex items-center gap-2">
                              <ProductThumb
                                url={imageByProduct.get(line.product_id) ?? null}
                                name={row?.name ?? "Product"}
                              />
                              <span className="min-w-0">
                                <span className="block truncate font-medium">
                                  {row?.name ?? "Product"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatNumber(Number(row?.stock_on_hand ?? 0))} {row?.unit} on
                                  hand
                                </span>
                              </span>
                            </span>
                          </td>
                          <td className="num px-2 py-2 text-right text-muted-foreground">
                            {formatMoney(Number(row?.cost_price ?? 0))}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="ml-auto h-9 w-24 text-right"
                              aria-label={`Unit price for ${row?.name ?? "product"}`}
                              value={line.unit_price}
                              onChange={(e) =>
                                setLines((prev) =>
                                  prev.map((l) =>
                                    l.key === line.key
                                      ? { ...l, unit_price: Number(e.target.value) }
                                      : l,
                                  ),
                                )
                              }
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              className={`ml-auto h-9 w-20 text-right ${over ? "border-destructive" : ""}`}
                              aria-label={`Quantity for ${row?.name ?? "product"}`}
                              value={line.quantity}
                              onChange={(e) =>
                                setLines((prev) =>
                                  prev.map((l) =>
                                    l.key === line.key
                                      ? { ...l, quantity: Number(e.target.value) }
                                      : l,
                                  ),
                                )
                              }
                            />
                          </td>
                          <td className="num px-2 py-2 text-right font-semibold">
                            {formatMoney(line.quantity * line.unit_price)}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Remove line"
                              onClick={() =>
                                setLines((prev) => prev.filter((l) => l.key !== line.key))
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label>Fulfillment</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {FULFILLMENT_TYPES.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={fulfillment === option.value ? "default" : "outline"}
                    onClick={() => {
                      setFulfillment(option.value);
                      setFeeTouched(false);
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {fulfillment !== "pickup" ? (
              <div className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2">
                {fulfillment === "delivery" ? (
                  <>
                    <div className="grid gap-1.5">
                      <Label>Delivery company</Label>
                      <Select
                        value={deliveryCompanyId}
                        onValueChange={(v) => {
                          setDeliveryCompanyId(v);
                          setFeeTouched(false);
                        }}
                      >
                        <SelectTrigger aria-label="Delivery company">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Independent driver</SelectItem>
                          {(deliveryCompanies ?? [])
                            .filter((c) => c.active)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Driver</Label>
                      <Select
                        value={driverId}
                        onValueChange={(v) => {
                          setDriverId(v);
                          setFeeTouched(false);
                        }}
                      >
                        <SelectTrigger aria-label="Driver">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Unassigned</SelectItem>
                          {companyDrivers.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                              {d.phone ? ` · ${d.phone}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>District</Label>
                      <Select
                        value={locationId}
                        onValueChange={(v) => {
                          setLocationId(v);
                          setFeeTouched(false);
                        }}
                      >
                        <SelectTrigger aria-label="District">
                          <SelectValue placeholder="Choose district" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>No district</SelectItem>
                          {districts.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-1.5">
                      <Label>Cargo company</Label>
                      <Select
                        value={cargoCompanyId}
                        onValueChange={(v) => {
                          setCargoCompanyId(v);
                          setFeeTouched(false);
                        }}
                      >
                        <SelectTrigger aria-label="Cargo company">
                          <SelectValue placeholder="Choose cargo company" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Not chosen</SelectItem>
                          {(cargoCompanies ?? [])
                            .filter((c) => c.active)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Destination region</Label>
                      <Select
                        value={regionId}
                        onValueChange={(v) => {
                          setRegionId(v);
                          setFeeTouched(false);
                        }}
                      >
                        <SelectTrigger aria-label="Destination region">
                          <SelectValue placeholder="Choose region" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Not chosen</SelectItem>
                          {regions.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              {l.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="grid gap-1.5">
                  <Label htmlFor="s-fee">
                    {fulfillment === "cargo" ? "Cargo fee" : "Delivery fee"}
                  </Label>
                  <Input
                    id="s-fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={fee}
                    onChange={(e) => {
                      setFee(e.target.value);
                      setFeeTouched(true);
                    }}
                  />
                  {typeof rate.data === "number" ? (
                    <p className="text-xs text-muted-foreground">
                      Rate card: {formatMoney(rate.data)}
                    </p>
                  ) : null}
                </div>
                {fulfillment === "delivery" ? (
                  <div className="grid gap-1.5">
                    <Label htmlFor="s-advance">Advance collected (Hormaris)</Label>
                    <Input
                      id="s-advance"
                      type="number"
                      min="0"
                      step="0.01"
                      value={advance}
                      onChange={(e) => setAdvance(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Settles the fee first ({formatMoney(advanceToFee)}), the rest pays the goods (
                      {formatMoney(advanceToGoods)}).
                    </p>
                  </div>
                ) : null}
                {fulfillment === "delivery" ? (
                  <>
                    <div className="grid gap-1.5">
                      <Label htmlFor="s-recipient">Driver name</Label>
                      <Input
                        id="s-recipient"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="s-phone">Driver phone</Label>
                      <Input
                        id="s-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5 sm:col-span-2">
                      <Label htmlFor="s-address">Address</Label>
                      <Input
                        id="s-address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="s-discount">Discount</Label>
                <Input
                  id="s-discount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Payment method</Label>
                <Select value={channelId} onValueChange={setChannelId}>
                  <SelectTrigger aria-label="Payment method">
                    <SelectValue placeholder="Choose payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {channelGroups.map(([group, list]) => (
                      <SelectGroup key={group}>
                        <SelectLabel>{group}</SelectLabel>
                        {(list ?? []).map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
                {channel?.requires_bank_name ? (
                  <Input
                    aria-label="Bank name"
                    placeholder="Bank name"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                ) : null}
                {vatRate > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Merchant VAT {(vatRate * 100).toFixed(0)}% applied automatically.
                  </p>
                ) : null}
              </div>
            </div>

            <div className={`grid gap-2 ${fulfillment === "cargo" ? "hidden" : ""}`}>
              <Label>Payment status</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["full_paid", "Full paid"],
                    ["partial", "Partial payment"],
                    ["full_debt", "Full debt"],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    variant={paymentMode === value ? "default" : "outline"}
                    onClick={() => setPaymentMode(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {paymentMode === "partial" ? (
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  aria-label="Amount paid now"
                  placeholder="Amount paid now"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                />
              ) : null}
            </div>

            <div className="grid gap-2">
              {needsAccount ? (
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger aria-label="Receiving account">
                    <SelectValue placeholder="Receiving account" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="s-note">Note</Label>
              <Textarea
                id="s-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="rounded-xl bg-muted/60 p-3 text-sm">
              <Row label="Subtotal" value={subtotal} />
              <Row label="Discount" value={discountValue} />
              {vatAmount > 0 ? (
                <Row label={`VAT (${(vatRate * 100).toFixed(0)}%)`} value={vatAmount} />
              ) : null}
              <Row label="Cost of goods" value={cogs} />
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="font-semibold">Goods total</span>
                <span className="num text-lg font-bold">{formatMoney(total)}</span>
              </div>
              <Row label="Paid on goods" value={goodsPaid} />
              <Row label="Goods balance (debt)" value={goodsBalance} />
              {fulfillment !== "pickup" ? (
                <>
                  <Row
                    label={fulfillment === "cargo" ? "Cargo fee" : "Delivery fee"}
                    value={feeValue}
                  />
                  <Row label="Fee paid in advance" value={advanceToFee} />
                  <Row label="Fee to collect" value={feeBalance} />
                </>
              ) : null}
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="font-semibold">To collect on delivery</span>
                <span className="num font-bold">{formatMoney(goodsBalance + feeBalance)}</span>
              </div>
            </div>

            {validation ? (
              <Badge variant="outline" className="w-fit border-destructive text-destructive">
                {validation}
              </Badge>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || Boolean(validation)}>
                {pending ? (
                  "Saving…"
                ) : editing ? (
                  <>
                    <Save className="size-4" /> Save changes
                  </>
                ) : (
                  <>
                    <Plus className="size-4" /> Record sale
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CustomerDialog
        quick
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        onCreated={(id) => setCustomerId(id)}
      />

      <ReceiptDialog
        open={Boolean(receiptId)}
        onOpenChange={(next) => {
          if (!next) setReceiptId(null);
        }}
        saleId={receiptId}
      />
    </>
  );
}

function nullable(value: string) {
  return value === NONE || !value ? null : value;
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="num font-semibold">{formatMoney(value)}</span>
    </div>
  );
}

function ProductThumb({ url, name }: { url: string | null; name: string }) {
  if (!url) {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Package className="size-4" />
      </span>
    );
  }
  return (
    <img src={url} alt={name} loading="lazy" className="size-10 shrink-0 rounded-lg object-cover" />
  );
}
