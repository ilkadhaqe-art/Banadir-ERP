import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  assignDeliveryDriver,
  cancelOrder,
  collectDeliveryPayment,
  convertOrderToSale,
  createDelivery,
  createOrder,
  getDeliveryDetail,
  getOrderDetail,
  listCargoCompanies,
  listCargoRates,
  listDeliveries,
  listDeliveryZones,
  listDriverBalances,
  listDriverHandovers,
  listDriverPerformance,
  listDrivers,
  listOrders,
  recordDriverHandover,
  saveCargoCompany,
  saveCargoRate,
  saveDeliveryZone,
  saveDriver,
  setDeliveryStatus,
  updateOrderStatus,
} from "@/lib/logistics.functions";
import type {
  CargoCompany,
  CargoCompanyInput,
  CargoRate,
  CargoRateInput,
  ConvertOrderInput,
  CreateDeliveryInput,
  CreateOrderInput,
  DeliveryCollectionInput,
  DeliveryDetail,
  DeliveryOverview,
  DeliveryStatus,
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

/**
 * Phase 6 data layer: orders, deliveries, drivers and COD handovers.
 *
 * Reads cache the Phase 6 read models; every write invalidates the logistics
 * caches plus the commerce/financial caches, because converting an order or
 * handing over COD moves stock, receivables and the financial engine.
 */

const STALE = 20_000;

function mutationError(error: Error) {
  const message = /row-level security|permission denied/i.test(error.message)
    ? "You do not have permission to perform this action. Ask an admin or manager for access."
    : error.message;
  toast.error(message);
}

/** ---- Reads ---- */

export function useOrders(params?: { status?: string; limit?: number }) {
  const fn = useServerFn(listOrders);
  return useQuery<OrderOverview[]>({
    queryKey: ["orders", params ?? null],
    queryFn: () => fn({ data: params ?? {} }),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useOrderDetail(orderId: string | null) {
  const fn = useServerFn(getOrderDetail);
  return useQuery<{ order: OrderOverview; items: OrderItemDetail[] }>({
    queryKey: ["order-detail", orderId],
    queryFn: () => fn({ data: { order_id: orderId as string } }),
    enabled: Boolean(orderId),
    staleTime: 0,
  });
}

export function useDeliveries(params?: { status?: string; limit?: number }) {
  const fn = useServerFn(listDeliveries);
  return useQuery<DeliveryOverview[]>({
    queryKey: ["deliveries", params ?? null],
    queryFn: () => fn({ data: params ?? {} }),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useDeliveryDetail(deliveryId: string | null) {
  const fn = useServerFn(getDeliveryDetail);
  return useQuery<DeliveryDetail>({
    queryKey: ["delivery-detail", deliveryId],
    queryFn: () => fn({ data: { delivery_id: deliveryId as string } }),
    enabled: Boolean(deliveryId),
    staleTime: 0,
  });
}

export function useDeliveryZones() {
  const fn = useServerFn(listDeliveryZones);
  return useQuery<DeliveryZone[]>({
    queryKey: ["delivery-zones"],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useCargoCompanies() {
  const fn = useServerFn(listCargoCompanies);
  return useQuery<CargoCompany[]>({
    queryKey: ["cargo-companies"],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useCargoRates() {
  const fn = useServerFn(listCargoRates);
  return useQuery<CargoRate[]>({
    queryKey: ["cargo-rates"],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useDrivers() {
  const fn = useServerFn(listDrivers);
  return useQuery<Driver[]>({
    queryKey: ["drivers"],
    queryFn: () => fn(),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useDriverBalances() {
  const fn = useServerFn(listDriverBalances);
  return useQuery<DriverBalance[]>({
    queryKey: ["driver-balances"],
    queryFn: () => fn(),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useDriverPerformance() {
  const fn = useServerFn(listDriverPerformance);
  return useQuery<DriverPerformance[]>({
    queryKey: ["driver-performance"],
    queryFn: () => fn(),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useDriverHandovers(params?: { driver_id?: string; limit?: number }) {
  const fn = useServerFn(listDriverHandovers);
  return useQuery<DriverHandover[]>({
    queryKey: ["driver-handovers", params ?? null],
    queryFn: () => fn({ data: params ?? {} }),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

/** ---- Invalidation ---- */

function useLogisticsInvalidation() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all(
      [
        "orders",
        "order-detail",
        "deliveries",
        "delivery-detail",
        "delivery-zones",
        "cargo-companies",
        "cargo-rates",
        "drivers",
        "driver-balances",
        "driver-performance",
        "driver-handovers",
        "sales",
        "sale-items",
        "customers",
        "customer-balances",
        "payment-accounts",
        "account-balances",
        "product-stock",
        "products",
        "inventory-movements",
        "financial-snapshot",
        "daily-financial-states",
        "financial-transactions",
        "obligation-summary",
      ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    );
  };
}

/** ---- Mutations ---- */

export function useCreateOrder() {
  const fn = useServerFn(createOrder);
  const invalidate = useLogisticsInvalidation();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Order created");
    },
    onError: mutationError,
  });
}

export function useUpdateOrderStatus() {
  const fn = useServerFn(updateOrderStatus);
  const invalidate = useLogisticsInvalidation();
  return useMutation({
    mutationFn: (input: { order_id: string; status: "confirmed" | "ready" }) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Order status updated");
    },
    onError: mutationError,
  });
}

export function useCancelOrder() {
  const fn = useServerFn(cancelOrder);
  const invalidate = useLogisticsInvalidation();
  return useMutation({
    mutationFn: (input: { order_id: string }) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Order cancelled");
    },
    onError: mutationError,
  });
}

export function useConvertOrder() {
  const fn = useServerFn(convertOrderToSale);
  const invalidate = useLogisticsInvalidation();
  return useMutation({
    mutationFn: (input: ConvertOrderInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Order converted to a sale — stock and engine updated");
    },
    onError: mutationError,
  });
}

export function useCreateDelivery() {
  const fn = useServerFn(createDelivery);
  const invalidate = useLogisticsInvalidation();
  return useMutation({
    mutationFn: (input: CreateDeliveryInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Delivery created");
    },
    onError: mutationError,
  });
}

export function useAssignDriver() {
  const fn = useServerFn(assignDeliveryDriver);
  const invalidate = useLogisticsInvalidation();
  return useMutation({
    mutationFn: (input: { delivery_id: string; driver_id: string }) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Driver assigned");
    },
    onError: mutationError,
  });
}

export function useSetDeliveryStatus() {
  const fn = useServerFn(setDeliveryStatus);
  const invalidate = useLogisticsInvalidation();
  return useMutation({
    mutationFn: (input: {
      delivery_id: string;
      status: Exclude<DeliveryStatus, "pending">;
      note?: string | null;
    }) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Delivery updated");
    },
    onError: mutationError,
  });
}

export function useRecordHandover() {
  const fn = useServerFn(recordDriverHandover);
  const invalidate = useLogisticsInvalidation();
  return useMutation({
    mutationFn: (input: HandoverInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Handover recorded — cash moved to the account");
    },
    onError: mutationError,
  });
}

export function useSaveDriver() {
  const fn = useServerFn(saveDriver);
  const invalidate = useLogisticsInvalidation();
  return useMutation({
    mutationFn: (input: DriverInput & { id?: string }) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Driver saved");
    },
    onError: mutationError,
  });
}

export function useSaveDeliveryZone() {
  const fn = useServerFn(saveDeliveryZone);
  const invalidate = useLogisticsInvalidation();
  return useMutation({
    mutationFn: (input: DeliveryZoneInput & { id?: string }) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Zone saved");
    },
    onError: mutationError,
  });
}

export function useSaveCargoCompany() {
  const fn = useServerFn(saveCargoCompany);
  const invalidate = useLogisticsInvalidation();
  return useMutation({
    mutationFn: (input: CargoCompanyInput & { id?: string }) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Cargo company saved");
    },
    onError: mutationError,
  });
}

export function useSaveCargoRate() {
  const fn = useServerFn(saveCargoRate);
  const invalidate = useLogisticsInvalidation();
  return useMutation({
    mutationFn: (input: CargoRateInput & { id?: string }) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Cargo rate saved");
    },
    onError: mutationError,
  });
}

export function useCollectDeliveryPayment() {
  const fn = useServerFn(collectDeliveryPayment);
  const invalidate = useLogisticsInvalidation();
  return useMutation({
    mutationFn: (input: DeliveryCollectionInput) => fn({ data: input }),
    onSuccess: async (result) => {
      await invalidate();
      toast.success(
        result.remaining > 0
          ? `Collection recorded — ${result.remaining} still outstanding`
          : "Collection recorded — order fully collected",
      );
    },
    onError: mutationError,
  });
}
