/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Reports and System Analytics functions — connected to the real Banadir Online FOS engine.
 */

import { createRpcFn } from "@/lib/rpc-client";
import type {
  AccountBalanceReportRow,
  AuditLogRow,
  BusinessOverview,
  CustomerSalesReportRow,
  InventoryValuationRow,
  MoneyReportPayload,
  ProductSalesReportRow,
  ProfitLossPayload,
  SalesDailyReportRow,
} from "@/lib/reports-types";

export const getBusinessOverview = createRpcFn<{ from?: string; to?: string }, BusinessOverview>(
  "getBusinessOverview",
);

export const listSalesDailyReport = createRpcFn<
  { from?: string; to?: string; limit?: number },
  SalesDailyReportRow[]
>("listSales");

export const listProductSalesReport = createRpcFn<{ limit?: number }, ProductSalesReportRow[]>(
  "listProducts",
);

export const listCustomerSalesReport = createRpcFn<{ limit?: number }, CustomerSalesReportRow[]>(
  "listCustomerBalances",
);

export const listMoneyReport = createRpcFn<{ from?: string; to?: string }, MoneyReportPayload>(
  "getFinancialSnapshot",
);

export const listInventoryValuation = createRpcFn<void, InventoryValuationRow[]>("listProducts");

export const listAccountBalancesReport = createRpcFn<void, AccountBalanceReportRow[]>(
  "listPaymentAccounts",
);

export const listProfitLoss = createRpcFn<{ from?: string; to?: string }, ProfitLossPayload>(
  "getFinancialSnapshot",
);

export const listAuditLog = createRpcFn<{ limit?: number; action?: string }, AuditLogRow[]>(
  "listFinancialTransactions",
);

export const listAppSettings = createRpcFn<void, Record<string, string>>("getAppSettings");

export const saveAppSetting = createRpcFn<{ key: string; value: string }, { success: boolean }>(
  "saveAppSetting",
);

export const factoryReset = createRpcFn<void, any>("factoryReset");
