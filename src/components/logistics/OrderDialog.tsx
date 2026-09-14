import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProductStock } from "@/hooks/useCatalog";
import {
  useCargoCompanies,
  useCargoRates,
  useCreateOrder,
  useDeliveryZones,
} from "@/hooks/useLogistics";
import { useCustomerBalances, useCustomers } from "@/hooks/useSales";
import { dayKey, formatMoney, formatNumber } from "@/lib/format";
import type { FulfillmentType, OrderLineInput } from "@/lib/logistics-types";
import { FULFILLMENT_TYPES } from "@/lib/logistics-types";

const WALK_IN = "__walk_in__";
const NONE = "__none__";

type Line = OrderLineInput & { key: string };

function newLine(): Line {
  return { key: crypto.randomUUID(), product_id: "", quantity: 1, unit_price: 0 };
}

/** Order intake popup. create_order() owns numbering, totals and validation. */
export function OrderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: products } = useProductStock();
  const { data: customers } = useCustomers();
  const { data: balances } = useCustomerBalances();
  const { data: zones } = useDeliveryZones();
  const { data: companies } = useCargoCompanies();
  const { data: cargoRates } = useCargoRates();
  const create = useCreateOrder();

  const [orderDate, setOrderDate] = useState(dayKey());
  const [customer, setCustomer] = useState(WALK_IN);
  const [fulfillment, setFulfillment] = useState<FulfillmentType>("pickup");
  const [zone, setZone] = useState(NONE);
  const [company, setCompany] = useState(NONE);
  const [address, setAddress] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]);

  useEffect(() => {
    if (!open) return;
    setOrderDate(dayKey());
    setCustomer(WALK_IN);
    setFulfillment("pickup");
    setZone(NONE);
    setCompany(NONE);
    setAddress("");
    setDeliveryFee("0");
    setDiscount("0");
    setNote("");
    setLines([newLine()]);
  }, [open]);

  const activeProducts = useMemo(() => (products ?? []).filter((p) => p.active), [products]);

  /** Receivables headroom for the chosen customer, straight from the balance view. */
  const customerBalance = useMemo(
    () =>
      customer === WALK_IN
        ? null
        : ((balances ?? []).find((row) => row.customer_id === customer) ?? null),
    [balances, customer],
  );

  const subtotal = lines.reduce(
    (sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_price || 0),
    0,
  );
  const total = subtotal - (Number(discount) || 0) + (Number(deliveryFee) || 0);

  /**
   * Cargo pricing: the active rate for the selected company (and zone, when one
   * is chosen) drives the fee so intake matches the cargo rate card.
   */
  const cargoRate = useMemo(() => {
    if (fulfillment !== "cargo" || company === NONE) return null;
    const candidates = (cargoRates ?? []).filter(
      (rate) => rate.active && rate.company_id === company,
    );
    return (
      candidates.find((rate) => zone !== NONE && rate.zone_id === zone) ?? candidates[0] ?? null
    );
  }, [cargoRates, fulfillment, company, zone]);

  useEffect(() => {
    if (cargoRate) setDeliveryFee(String(Number(cargoRate.rate)));
  }, [cargoRate]);

  const filled = lines.filter((l) => l.product_id && Number(l.quantity) > 0);

  const validation = (() => {
    if (filled.length === 0) return "Add at least one product line.";
    if (fulfillment === "delivery" && zone === NONE) return "Choose a delivery zone.";
    if (fulfillment === "cargo" && company === NONE) return "Choose a cargo company.";
    if (total < 0) return "Total cannot be negative.";
    return null;
  })();

  const patch = (key: string, next: Partial<Line>) =>
    setLines((rows) => rows.map((row) => (row.key === key ? { ...row, ...next } : row)));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (create.isPending || validation) return;
    await create.mutateAsync({
      order_date: orderDate,
      customer_id: customer === WALK_IN ? null : customer,
      items: filled.map((l) => ({
        product_id: l.product_id,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
      })),
      discount: Number(discount) || 0,
      fulfillment,
      delivery_fee: Number(deliveryFee) || 0,
      zone_id: zone === NONE ? null : zone,
      cargo_company_id: company === NONE ? null : company,
      address: address.trim() || null,
      note: note.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>New order</DialogTitle>
          <DialogDescription>
            Orders reserve nothing until they are converted to a sale.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="order-date">Order date</Label>
              <Input
                id="order-date"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={customer} onValueChange={setCustomer}>
                <SelectTrigger aria-label="Customer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={WALK_IN}>Walk-in</SelectItem>
                  {(customers ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customerBalance ? (
                <p className="text-xs text-muted-foreground">
                  Owes <span className="num">{formatMoney(Number(customerBalance.balance))}</span> ·
                  credit left{" "}
                  <span
                    className={`num ${Number(customerBalance.credit_available) <= 0 ? "text-destructive" : ""}`}
                  >
                    {formatMoney(Number(customerBalance.credit_available))}
                  </span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setLines((r) => [...r, newLine()])}
              >
                <Plus className="size-4" /> Add line
              </Button>
            </div>
            {lines.map((line) => {
              const selected = activeProducts.find((p) => p.product_id === line.product_id);
              return (
                <div
                  key={line.key}
                  className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_auto]"
                >
                  <div className="space-y-1">
                    <Select
                      value={line.product_id}
                      onValueChange={(value) => {
                        const product = activeProducts.find((p) => p.product_id === value);
                        patch(line.key, {
                          product_id: value,
                          unit_price: product ? Number(product.sell_price) : line.unit_price,
                        });
                      }}
                    >
                      <SelectTrigger aria-label="Product">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeProducts.map((p) => (
                          <SelectItem key={p.product_id} value={p.product_id}>
                            {p.name} · {p.sku} · {formatNumber(Number(p.stock_on_hand))} in stock
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selected ? (
                      <p className="text-xs text-muted-foreground">
                        <span className="num">{selected.sku}</span> ·{" "}
                        <span className={selected.is_low_stock ? "text-destructive" : ""}>
                          {formatNumber(Number(selected.stock_on_hand))} in stock
                        </span>
                      </p>
                    ) : null}
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    aria-label="Quantity"
                    value={line.quantity}
                    onChange={(e) => patch(line.key, { quantity: Number(e.target.value) })}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    aria-label="Unit price"
                    value={line.unit_price}
                    onChange={(e) => patch(line.key, { unit_price: Number(e.target.value) })}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Remove line"
                    onClick={() =>
                      setLines((rows) =>
                        rows.length > 1 ? rows.filter((r) => r.key !== line.key) : rows,
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Fulfillment</Label>
              <Select
                value={fulfillment}
                onValueChange={(v) => setFulfillment(v as FulfillmentType)}
              >
                <SelectTrigger aria-label="Fulfillment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FULFILLMENT_TYPES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delivery-fee">Delivery fee</Label>
              <Input
                id="delivery-fee"
                type="number"
                min="0"
                step="any"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
              />
            </div>
            {fulfillment !== "pickup" ? (
              <div className="space-y-1.5">
                <Label>Zone</Label>
                <Select
                  value={zone}
                  onValueChange={(value) => {
                    setZone(value);
                    if (fulfillment === "delivery") {
                      const z = (zones ?? []).find((row) => row.id === value);
                      if (z) setDeliveryFee(String(Number(z.default_fee)));
                    }
                  }}
                >
                  <SelectTrigger aria-label="Delivery zone">
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No zone</SelectItem>
                    {(zones ?? [])
                      .filter((z) => z.active)
                      .map((z) => (
                        <SelectItem key={z.id} value={z.id}>
                          {z.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {fulfillment === "cargo" ? (
              <div className="space-y-1.5">
                <Label>Cargo company</Label>
                <Select value={company} onValueChange={setCompany}>
                  <SelectTrigger aria-label="Cargo company">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No company</SelectItem>
                    {(companies ?? [])
                      .filter((c) => c.active)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {cargoRate ? (
                  <p className="text-xs text-muted-foreground">
                    Rate card: <span className="num">{formatMoney(Number(cargoRate.rate))}</span>
                    {cargoRate.destination ? ` · ${cargoRate.destination}` : ""}
                  </p>
                ) : company !== NONE ? (
                  <p className="text-xs text-muted-foreground">
                    No active rate for this company — enter the fee manually.
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="order-discount">Discount</Label>
              <Input
                id="order-discount"
                type="number"
                min="0"
                step="any"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="order-address">Address</Label>
              <Input
                id="order-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, landmark, district"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="order-note">Note</Label>
              <Textarea id="order-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          <div className="rounded-xl bg-muted p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="num">{formatMoney(subtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between font-semibold">
              <span>Total</span>
              <span className="num">{formatMoney(total)}</span>
            </div>
          </div>

          {validation ? <p className="text-sm text-destructive">{validation}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || Boolean(validation)}>
              {create.isPending ? "Saving…" : "Create order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
