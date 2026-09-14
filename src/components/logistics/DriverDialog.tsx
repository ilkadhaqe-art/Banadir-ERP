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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSaveDriver } from "@/hooks/useLogistics";
import type { Driver } from "@/lib/logistics-types";

const VEHICLES = ["motorcycle", "bajaj", "car", "van", "truck", "bicycle"];

/** Driver master-data popup — no money invariants, plain table write. */
export function DriverDialog({
  open,
  onOpenChange,
  driver,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: Driver | null;
}) {
  const save = useSaveDriver();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("motorcycle");
  const [license, setLicense] = useState("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName(driver?.name ?? "");
    setPhone(driver?.phone ?? "");
    setVehicle(driver?.vehicle_type ?? "motorcycle");
    setLicense(driver?.license_no ?? "");
    setNotes(driver?.notes ?? "");
    setActive(driver?.active ?? true);
  }, [open, driver]);

  const validation = name.trim() ? null : "Enter the driver name.";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (save.isPending || validation) return;
    await save.mutateAsync({
      ...(driver ? { id: driver.id } : {}),
      name: name.trim(),
      phone: phone.trim() || null,
      vehicle_type: vehicle,
      license_no: license.trim() || null,
      notes: notes.trim() || null,
      active,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>{driver ? "Edit driver" : "New driver"}</DialogTitle>
          <DialogDescription>Drivers carry COD until it is handed over.</DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="driver-name">Name</Label>
            <Input id="driver-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="driver-phone">Phone</Label>
              <Input id="driver-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle</Label>
              <Select value={vehicle} onValueChange={setVehicle}>
                <SelectTrigger aria-label="Vehicle type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="driver-license">License no</Label>
              <Input
                id="driver-license"
                value={license}
                onChange={(e) => setLicense(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="driver-notes">Notes</Label>
              <Textarea
                id="driver-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
            <Label htmlFor="driver-active">Active</Label>
            <Switch id="driver-active" checked={active} onCheckedChange={setActive} />
          </div>

          {validation ? <p className="text-sm text-destructive">{validation}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || Boolean(validation)}>
              {save.isPending ? "Saving…" : "Save driver"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
