import { useState } from "react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useDeliveryCompanies,
  useDeliveryRates,
  useLocations,
  useSaveDeliveryCompany,
  useSaveDeliveryRate,
  useSaveLocation,
} from "@/hooks/useFulfillment";
import { useDrivers } from "@/hooks/useLogistics";
import { dayKey, formatMoney } from "@/lib/format";
import type { LocationLevel } from "@/lib/fulfillment-types";

const NONE = "__none__";

/** Setup panels for locations, delivery companies and rate cards. */
export function FulfillmentSetupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Delivery & cargo setup</DialogTitle>
          <DialogDescription>
            Districts and regions, delivery companies, and the rate cards used to price each
            delivery.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="locations">
          <TabsList>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="rates">Rates</TabsTrigger>
          </TabsList>
          <TabsContent value="locations">
            <LocationsPanel />
          </TabsContent>
          <TabsContent value="companies">
            <CompaniesPanel />
          </TabsContent>
          <TabsContent value="rates">
            <RatesPanel />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function LocationsPanel() {
  const { data: locations } = useLocations();
  const save = useSaveLocation();
  const [name, setName] = useState("");
  const [level, setLevel] = useState<LocationLevel>("district");
  const [parentId, setParentId] = useState(NONE);
  const regions = (locations ?? []).filter((row) => row.level === "region");

  return (
    <div className="space-y-4 pt-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="loc-name">Name</Label>
          <Input id="loc-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loc-level">Level</Label>
          <Select value={level} onValueChange={(value) => setLevel(value as LocationLevel)}>
            <SelectTrigger id="loc-level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="district">District</SelectItem>
              <SelectItem value="region">Region</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loc-parent">Region</Label>
          <Select value={parentId} onValueChange={setParentId}>
            <SelectTrigger id="loc-parent">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {regions.map((region) => (
                <SelectItem key={region.id} value={region.id}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        disabled={!name.trim() || save.isPending}
        onClick={() =>
          save.mutate(
            { name: name.trim(), level, parent_id: parentId === NONE ? null : parentId },
            { onSuccess: () => setName("") },
          )
        }
      >
        Add location
      </Button>
      <ul className="divide-y divide-border text-sm">
        {(locations ?? []).map((row) => (
          <li key={row.id} className="flex justify-between py-1.5">
            <span>{row.name}</span>
            <span className="text-muted-foreground">{row.level}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompaniesPanel() {
  const { data: companies } = useDeliveryCompanies();
  const save = useSaveDeliveryCompany();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <div className="space-y-4 pt-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="dc-name">Company name</Label>
          <Input id="dc-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dc-phone">Phone</Label>
          <Input id="dc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <Button
        disabled={!name.trim() || save.isPending}
        onClick={() =>
          save.mutate(
            { name: name.trim(), phone: phone.trim() || null },
            {
              onSuccess: () => {
                setName("");
                setPhone("");
              },
            },
          )
        }
      >
        Add company
      </Button>
      <ul className="divide-y divide-border text-sm">
        {(companies ?? []).map((row) => (
          <li key={row.id} className="flex justify-between py-1.5">
            <span>{row.name}</span>
            <span className="num text-muted-foreground">{row.phone ?? "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RatesPanel() {
  const { data: rates } = useDeliveryRates();
  const { data: locations } = useLocations();
  const { data: companies } = useDeliveryCompanies();
  const { data: drivers } = useDrivers();
  const save = useSaveDeliveryRate();

  const [locationId, setLocationId] = useState(NONE);
  const [companyId, setCompanyId] = useState(NONE);
  const [driverId, setDriverId] = useState(NONE);
  const [rate, setRate] = useState("0");
  const [from, setFrom] = useState(dayKey(new Date()));

  return (
    <div className="space-y-4 pt-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="rate-location">Location</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger id="rate-location">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {(locations ?? []).map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.name} ({row.level})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rate-company">Delivery company</Label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger id="rate-company">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {(companies ?? []).map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rate-driver">Driver</Label>
          <Select value={driverId} onValueChange={setDriverId}>
            <SelectTrigger id="rate-driver">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>None</SelectItem>
              {(drivers ?? []).map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rate-amount">Rate</Label>
          <Input
            id="rate-amount"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rate-from">Effective from</Label>
          <Input
            id="rate-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
      </div>
      <Button
        disabled={locationId === NONE || save.isPending}
        onClick={() =>
          save.mutate({
            location_id: locationId,
            company_id: companyId === NONE ? null : companyId,
            driver_id: driverId === NONE ? null : driverId,
            rate: Number(rate) || 0,
            effective_from: from,
          })
        }
      >
        Save rate
      </Button>
      <ul className="divide-y divide-border text-sm">
        {(rates ?? []).map((row) => (
          <li key={row.id} className="flex flex-wrap justify-between gap-2 py-1.5">
            <span>
              {row.location_name ?? "—"}
              <span className="text-muted-foreground">
                {" "}
                · {row.company_name ?? row.driver_name ?? "Any"} · from {row.effective_from}
              </span>
            </span>
            <span className="num">{formatMoney(Number(row.rate))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
