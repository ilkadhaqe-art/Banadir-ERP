import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import type {
  DeliveryCompany,
  DeliveryCompanyInput,
  DeliveryRate,
  DeliveryRateInput,
  FulfillmentEventInput,
  LocationInput,
  LocationRow,
  SaleStatement,
  SmartDefaults,
} from "@/lib/fulfillment-types";
import {
  getSaleStatement,
  getSmartDefaults,
  listDeliveryCompanies,
  listDeliveryRates,
  listLocations,
  lookupRate,
  recordFulfillmentEvent,
  saveDeliveryCompany,
  saveDeliveryRate,
  saveLocation,
} from "@/lib/fulfillment.functions";

/** Delivery / cargo reference data, tracking and the sale statement. */

const STALE = 60_000;

function mutationError(error: Error) {
  const message = /row-level security|permission denied/i.test(error.message)
    ? "You do not have permission to perform this action. Ask an admin or manager for access."
    : error.message;
  toast.error(message);
}

export function useLocations() {
  const fn = useServerFn(listLocations);
  return useQuery<LocationRow[]>({
    queryKey: ["locations"],
    queryFn: () => fn(),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useDeliveryCompanies() {
  const fn = useServerFn(listDeliveryCompanies);
  return useQuery<DeliveryCompany[]>({
    queryKey: ["delivery-companies"],
    queryFn: () => fn(),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useDeliveryRates() {
  const fn = useServerFn(listDeliveryRates);
  return useQuery<DeliveryRate[]>({
    queryKey: ["delivery-rates"],
    queryFn: () => fn(),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useSmartDefaults() {
  const fn = useServerFn(getSmartDefaults);
  return useQuery<SmartDefaults>({
    queryKey: ["sales-smart-defaults"],
    queryFn: () => fn(),
    staleTime: STALE,
  });
}

export function useSaleStatement(saleId: string | null) {
  const fn = useServerFn(getSaleStatement);
  return useQuery<SaleStatement | null>({
    queryKey: ["sale-statement", saleId],
    queryFn: () => fn({ data: { sale_id: saleId as string } }),
    enabled: Boolean(saleId),
    staleTime: 0,
  });
}

/** Applicable rate for a company/driver + location; used to prefill fees. */
export function useRateLookup(params: {
  kind: "delivery" | "cargo";
  location_id?: string | null;
  company_id?: string | null;
  driver_id?: string | null;
  on?: string | null;
  enabled?: boolean;
}) {
  const fn = useServerFn(lookupRate);
  const enabled =
    (params.enabled ?? true) &&
    Boolean(params.location_id) &&
    Boolean(params.company_id || params.driver_id);
  return useQuery<number | null>({
    queryKey: [
      "rate-lookup",
      params.kind,
      params.location_id ?? null,
      params.company_id ?? null,
      params.driver_id ?? null,
      params.on ?? null,
    ],
    queryFn: () =>
      fn({
        data: {
          kind: params.kind,
          location_id: params.location_id as string,
          company_id: params.company_id ?? null,
          driver_id: params.driver_id ?? null,
          on: params.on ?? null,
        },
      }),
    enabled,
    staleTime: STALE,
  });
}

function useFulfillmentInvalidation() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all(
      [
        "locations",
        "delivery-companies",
        "delivery-rates",
        "rate-lookup",
        "sales",
        "sale-statement",
        "sales-smart-defaults",
        "deliveries",
        "delivery-detail",
        "driver-balances",
        "collections",
        "customer-balances",
        "customer-statement",
        "account-balances",
        "financial-snapshot",
        "daily-financial-states",
        "financial-transactions",
        "product-stock",
        "products",
        "inventory-movements",
      ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    );
  };
}

export function useSaveLocation() {
  const fn = useServerFn(saveLocation);
  const invalidate = useFulfillmentInvalidation();
  return useMutation({
    mutationFn: (input: LocationInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Location saved");
    },
    onError: mutationError,
  });
}

export function useSaveDeliveryCompany() {
  const fn = useServerFn(saveDeliveryCompany);
  const invalidate = useFulfillmentInvalidation();
  return useMutation({
    mutationFn: (input: DeliveryCompanyInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Delivery company saved");
    },
    onError: mutationError,
  });
}

export function useSaveDeliveryRate() {
  const fn = useServerFn(saveDeliveryRate);
  const invalidate = useFulfillmentInvalidation();
  return useMutation({
    mutationFn: (input: DeliveryRateInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Rate saved");
    },
    onError: mutationError,
  });
}

export function useRecordFulfillmentEvent() {
  const fn = useServerFn(recordFulfillmentEvent);
  const invalidate = useFulfillmentInvalidation();
  return useMutation({
    mutationFn: (input: FulfillmentEventInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Tracking updated");
    },
    onError: mutationError,
  });
}
