/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Logistics and Orders functions — connected to the real Banadir Online FOS engine.
 */

import { createRpcFn } from "@/lib/rpc-client";
import type {
  CargoCompany,
  CargoCompanyInput,
  CargoRate,
  CargoRateInput,
  ConvertOrderInput,
  CreateDeliveryInput,
  CreateOrderInput,
  DeliveryCollection,
  DeliveryDetail,
  DeliveryOverview,
  DeliverySaleLink,
  DeliveryZone,
  DeliveryZoneInput,
  Driver,
  DriverBalance,
  DriverHandover,
  DriverInput,
  DriverPerformance,
  HandoverInput,
  OrderItemDetail,
  OrderOverview,
} from "@/lib/logistics-types";

// Orders
export const listOrders = createRpcFn<{ status?: string; limit?: number }, OrderOverview[]>(
  "listOrders",
);

export const getOrderDetail = createRpcFn<
  { order_id: string },
  { order: OrderOverview; items: OrderItemDetail[] }
>("getOrder");

export const createOrder = createRpcFn<
  CreateOrderInput,
  { id: string; order_no: string; total: number; balance: number }
>("createOrder");

export const updateOrderStatus = createRpcFn<
  { order_id: string; status: string; notes?: string },
  any
>("updateOrderStatus");

export const cancelOrder = createRpcFn<{ order_id: string }, any>("cancelOrder");

export const convertOrderToSale = createRpcFn<ConvertOrderInput, any>("convertOrderToSale");

// Deliveries
export const listDeliveries = createRpcFn<
  { status?: string; driver_id?: string; limit?: number },
  DeliveryOverview[]
>("listDeliveries");

export const getDeliveryDetail = createRpcFn<{ delivery_id: string }, DeliveryDetail>(
  "getDelivery",
);

export const createDelivery = createRpcFn<CreateDeliveryInput, { id: string; delivery_no: string }>(
  "createDelivery",
);

export const assignDeliveryDriver = createRpcFn<{ delivery_id: string; driver_id: string }, any>(
  "updateDeliveryStatus",
);

export const setDeliveryStatus = createRpcFn<
  { delivery_id: string; status: any; driver_id?: string | null; notes?: string | null },
  any
>("updateDeliveryStatus");

export const collectDeliveryPayment = createRpcFn<
  { delivery_id: string; amount: number; payment_account_id: string; notes?: string },
  any
>("collectDeliveryPayment");

// Master Data: Drivers
export const listDrivers = createRpcFn<void, Driver[]>("listDrivers");

export const saveDriver = createRpcFn<DriverInput, { id: string }>("saveDriver");

export const listDriverBalances = createRpcFn<void, DriverBalance[]>("driverBalances");

export const listDriverPerformance = createRpcFn<void, DriverPerformance[]>("driverBalances");

export const listDriverHandovers = createRpcFn<
  { driver_id?: string; limit?: number },
  DriverHandover[]
>("listDriverHandovers");

export const recordDriverHandover = createRpcFn<
  HandoverInput,
  { id: string; handover_no: string; amount: number }
>("recordDriverHandover");

// Master Data: Zones & Cargo
export const listDeliveryZones = createRpcFn<void, DeliveryZone[]>("listDeliveryZones");

export const saveDeliveryZone = createRpcFn<DeliveryZoneInput, { id: string }>("saveDeliveryZone");

export const listCargoCompanies = createRpcFn<void, CargoCompany[]>("listCargoCompanies");

export const saveCargoCompany = createRpcFn<CargoCompanyInput, { id: string }>("saveCargoCompany");

export const listCargoRates = createRpcFn<{ company_id?: string }, CargoRate[]>("listCargoRates");

export const saveCargoRate = createRpcFn<CargoRateInput, { id: string }>("saveCargoRate");
