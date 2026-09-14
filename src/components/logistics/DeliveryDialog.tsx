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
import {
  useCargoCompanies,
  useCreateDelivery,
  useDeliveryZones,
  useDrivers,
  useOrders,
} from "@/hooks/useLogistics";
import type { OrderOverview } from "@/lib/logistics-types";

const NONE = "__none__";

/** Dispatch popup. create_delivery() owns numbering and the COD linkage. */
export function DeliveryDialog({
  open,
  onOpenChange,
  order,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: OrderOverview | null;
}) {
  const { data: orders } = useOrders({ limit: 200 });
  const { data: drivers } = useDrivers();
  const { data: zones } = useDeliveryZones();
  const { data: companies } = useCargoCompanies();
  const create = useCreateDelivery();

  const [orderId, setOrderId] = useState(NONE);
  const [driverId, setDriverId] = useState(NONE);
  const [zoneId, setZoneId] = useState(NONE);
  const [companyId, setCompanyId] = useState(NONE);
  const [fee, setFee] = useState("0");
  const [cod, setCod] = useState("0");
  const [recipient, setRecipient] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");

  const deliverable = useMemo(
    () =>
      (orders ?? []).filter(
        (o) => !o.delivery_id && o.status !== "cancelled" && o.fulfillment !== "pickup",
      ),
    [orders],
  );

  useEffect(() => {
    if (!open) return;
    setOrderId(order?.id ?? NONE);
    setDriverId(NONE);
    setZoneId(order?.zone_id ?? NONE);
    setCompanyId(order?.cargo_company_id ?? NONE);
    setFee(String(Number(order?.delivery_fee ?? 0)));
    setCod(String(Number(order?.total ?? 0)));
    setRecipient(order?.customer_name ?? "");
    setPhone(order?.customer_phone ?? "");
    setAddress(order?.delivery_address ?? "");
    setNote("");
  }, [open, order]);

  const validation = (() => {
    if (orderId === NONE) return "Choose the order to deliver.";
    if (Number(fee) < 0 || Number(cod) < 0) return "Amounts cannot be negative.";
    return null;
  })();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (create.isPending || validation) return;
    await create.mutateAsync({
      order_id: orderId,
      driver_id: driverId === NONE ? null : driverId,
      zone_id: zoneId === NONE ? null : zoneId,
      cargo_company_id: companyId === NONE ? null : companyId,
      fee: Number(fee) || 0,
      cod_amount: Number(cod) || 0,
      recipient_name: recipient.trim() || null,
      recipient_phone: phone.trim() || null,
      address: address.trim() || null,
      note: note.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>New delivery</DialogTitle>
          <DialogDescription>Dispatch an order to a driver or a cargo company.</DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label>Order</Label>
            <Select
              value={orderId}
              onValueChange={(value) => {
                setOrderId(value);
                const row = (orders ?? []).find((o) => o.id === value);
                if (row) {
                  setZoneId(row.zone_id ?? NONE);
                  setCompanyId(row.cargo_company_id ?? NONE);
                  setFee(String(Number(row.delivery_fee)));
                  setCod(String(Number(row.total)));
                  setRecipient(row.customer_name ?? "");
                  setPhone(row.customer_phone ?? "");
                  setAddress(row.delivery_address ?? "");
                }
              }}
            >
              <SelectTrigger aria-label="Order">
                <SelectValue placeholder="Select order" />
              </SelectTrigger>
              <SelectContent>
                {(order
                  ? [order, ...deliverable.filter((o) => o.id !== order.id)]
                  : deliverable
                ).map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.order_no} — {o.customer_name ?? "Walk-in"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Driver</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger aria-label="Driver">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {(drivers ?? [])
                    .filter((d) => d.active)
                    .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Zone</Label>
              <Select value={zoneId} onValueChange={setZoneId}>
                <SelectTrigger aria-label="Zone">
                  <SelectValue />
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
            <div className="space-y-1.5">
              <Label>Cargo company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger aria-label="Cargo company">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {(companies ?? [])
                    .filter((c) => c.active)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delivery-fee-input">Fee</Label>
              <Input
                id="delivery-fee-input"
                type="number"
                min="0"
                step="any"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delivery-cod">COD amount</Label>
              <Input
                id="delivery-cod"
                type="number"
                min="0"
                step="any"
                value={cod}
                onChange={(e) => setCod(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delivery-recipient">Recipient</Label>
              <Input
                id="delivery-recipient"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="delivery-phone">Phone</Label>
              <Input id="delivery-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="delivery-address">Address</Label>
              <Input
                id="delivery-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="delivery-note">Note</Label>
              <Textarea id="delivery-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          {validation ? <p className="text-sm text-destructive">{validation}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || Boolean(validation)}>
              {create.isPending ? "Saving…" : "Create delivery"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
