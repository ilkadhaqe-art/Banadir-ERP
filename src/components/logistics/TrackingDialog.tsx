import { useEffect, useState } from "react";

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
import { useRecordFulfillmentEvent } from "@/hooks/useFulfillment";
import { useDrivers } from "@/hooks/useLogistics";
import { usePaymentAccounts } from "@/hooks/useSales";
import { CARGO_TRACK_STEPS, DELIVERY_TRACK_STEPS } from "@/lib/fulfillment-types";
import { formatMoney } from "@/lib/format";
import type { SaleOverview } from "@/lib/sales-types";
import { PAYMENT_METHODS } from "@/lib/sales-types";
import type { PaymentMethod } from "@/lib/sales-types";

const NONE = "__none__";

/**
 * Tracking update for one sale. Delivered never implies paid: money moves only
 * when an amount is entered, and the database applies it.
 */
export function TrackingDialog({
  sale,
  onOpenChange,
}: {
  sale: SaleOverview | null;
  onOpenChange: (open: boolean) => void;
}) {
  const isCargo = sale?.fulfillment === "cargo";
  const steps = isCargo ? CARGO_TRACK_STEPS : DELIVERY_TRACK_STEPS;
  const { data: drivers } = useDrivers();
  const { data: accounts } = usePaymentAccounts();
  const record = useRecordFulfillmentEvent();

  const [status, setStatus] = useState<string>(steps[0].value);
  const [driverId, setDriverId] = useState<string>(NONE);
  const [amount, setAmount] = useState("0");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [accountId, setAccountId] = useState<string>(NONE);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!sale) return;
    setStatus(isCargo ? CARGO_TRACK_STEPS[0].value : DELIVERY_TRACK_STEPS[0].value);
    setDriverId(sale.driver_id ?? NONE);
    setAmount("0");
    setMethod("cash");
    setAccountId(NONE);
    setNote("");
  }, [sale, isCargo]);

  const collectable = Number(sale?.balance ?? 0) + Number(sale?.fee_balance ?? 0);

  return (
    <Dialog open={Boolean(sale)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Update tracking — {sale?.sale_no}</DialogTitle>
          <DialogDescription>
            Outstanding on this sale: {formatMoney(collectable)}. Leave the amount at zero when
            nothing was collected.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="track-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="track-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {steps.map((step) => (
                  <SelectItem key={step.value} value={step.value}>
                    {step.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isCargo ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="track-driver">Driver</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger id="track-driver">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {(drivers ?? []).map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                      {driver.phone ? ` · ${driver.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="track-amount">Amount collected</Label>
            <Input
              id="track-amount"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="track-method">Method</Label>
            <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
              <SelectTrigger id="track-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="track-account">Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="track-account">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No account</SelectItem>
                {(accounts ?? []).map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="track-note">Note</Label>
            <Textarea
              id="track-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!sale || record.isPending}
            onClick={() => {
              if (!sale) return;
              const value = Number(amount) || 0;
              record.mutate(
                {
                  sale_id: sale.id,
                  status,
                  driver_id: driverId === NONE ? null : driverId,
                  amount_collected: value,
                  account_id: accountId === NONE ? null : accountId,
                  method,
                  note: note.trim() || null,
                },
                { onSuccess: () => onOpenChange(false) },
              );
            }}
          >
            Save update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
