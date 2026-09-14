import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  factoryReset,
  getBusinessOverview,
  listAccountBalancesReport,
  listAppSettings,
  listAuditLog,
  listCustomerSalesReport,
  listInventoryValuation,
  listMoneyReport,
  listProductSalesReport,
  listProfitLoss,
  listSalesDailyReport,
  saveAppSetting,
} from "@/lib/reports.functions";
import type {
  AccountBalanceReportRow,
  AppSetting,
  AuditLogRow,
  BusinessOverview,
  CustomerSalesReportRow,
  InventoryValuationRow,
  MoneyReportRow,
  ProductSalesReportRow,
  ProfitLossRow,
  SalesDailyReportRow,
} from "@/lib/reports-types";

/** Phase 8 read layer: every figure comes from a database view or RPC. */

const STALE = 30_000;

type Range = { from?: string; to?: string };

export function useBusinessOverview(range?: Range) {
  const fn = useServerFn(getBusinessOverview);
  return useQuery<BusinessOverview>({
    queryKey: ["business-overview", range ?? null],
    queryFn: () => fn({ data: range ?? {} }),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useSalesDailyReport(range?: Range) {
  const fn = useServerFn(listSalesDailyReport);
  return useQuery<SalesDailyReportRow[]>({
    queryKey: ["reports", "sales-daily", range ?? null],
    queryFn: () => fn({ data: range ?? {} }),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useProductSalesReport() {
  const fn = useServerFn(listProductSalesReport);
  return useQuery<ProductSalesReportRow[]>({
    queryKey: ["reports", "product-sales"],
    queryFn: () => fn(),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useCustomerSalesReport() {
  const fn = useServerFn(listCustomerSalesReport);
  return useQuery<CustomerSalesReportRow[]>({
    queryKey: ["reports", "customer-sales"],
    queryFn: () => fn(),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useMoneyReport(params: { kind: "expense" | "income"; from?: string; to?: string }) {
  const fn = useServerFn(listMoneyReport);
  return useQuery<MoneyReportRow[]>({
    queryKey: ["reports", "money", params],
    queryFn: () => fn({ data: params }),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useInventoryValuation() {
  const fn = useServerFn(listInventoryValuation);
  return useQuery<InventoryValuationRow[]>({
    queryKey: ["reports", "inventory-valuation"],
    queryFn: () => fn(),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useAccountBalancesReport() {
  const fn = useServerFn(listAccountBalancesReport);
  return useQuery<AccountBalanceReportRow[]>({
    queryKey: ["reports", "account-balances"],
    queryFn: () => fn(),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useProfitLoss(range?: Range) {
  const fn = useServerFn(listProfitLoss);
  return useQuery<ProfitLossRow[]>({
    queryKey: ["reports", "profit-loss", range ?? null],
    queryFn: () => fn({ data: range ?? {} }),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useAuditLog(limit = 200) {
  const fn = useServerFn(listAuditLog);
  return useQuery<AuditLogRow[]>({
    queryKey: ["audit-log", limit],
    queryFn: () => fn({ data: { limit } }),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useAppSettings() {
  const fn = useServerFn(listAppSettings);
  return useQuery<AppSetting[]>({
    queryKey: ["app-settings"],
    queryFn: () => fn(),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useSaveAppSetting() {
  const fn = useServerFn(saveAppSetting);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { key: string; value: string }) => fn({ data: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Setting saved");
    },
    onError: (error: Error) => {
      toast.error(
        /row-level security|permission denied/i.test(error.message)
          ? "Only owners and admins can change settings."
          : error.message,
      );
    },
  });
}

/** Factory reset: clears operational data, keeps the schema. Owner only. */
export function useFactoryReset() {
  const fn = useServerFn(factoryReset);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { confirm: string; include_masters?: boolean }) => fn({ data: input }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      toast.success("Factory reset complete — structure and settings preserved");
    },
    onError: (error: Error) => {
      toast.error(
        /row-level security|permission denied|Only the owner/i.test(error.message)
          ? "Only the owner can run a factory reset."
          : error.message,
      );
    },
  });
}
