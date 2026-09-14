/**
 * Fulfillment, Locations, and Rates functions — connected to the real Banadir Online FOS engine.
 */

import { createRpcFn } from "@/lib/rpc-client";
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

export const listLocations = createRpcFn<void, LocationRow[]>("listDeliveryZones");

export const saveLocation = createRpcFn<LocationInput, { id: string }>("saveDeliveryZone");

export const listDeliveryCompanies = createRpcFn<void, DeliveryCompany[]>("listDeliveryCompanies");

export const saveDeliveryCompany = createRpcFn<DeliveryCompanyInput, { id: string }>(
  "saveDeliveryCompany",
);

export const listDeliveryRates = createRpcFn<
  { company_id?: string; location_id?: string },
  DeliveryRate[]
>("listCargoRates");

export const saveDeliveryRate = createRpcFn<DeliveryRateInput, { id: string }>("saveCargoRate");

export const lookupRate = createRpcFn<
  { location_id: string; company_id?: string | null },
  { rate: number; currency: string }
>("lookupDeliveryRate");

export const getSmartDefaults = createRpcFn<{ customer_id: string }, SmartDefaults>(
  "getSmartDefaults",
);

export const getSaleStatement = createRpcFn<{ sale_id: string }, SaleStatement>("getSale");

export const recordFulfillmentEvent = createRpcFn<FulfillmentEventInput, { id: string }>(
  "recordFulfillmentEvent",
);
