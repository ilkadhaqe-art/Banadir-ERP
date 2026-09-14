import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  createAccountTransfer,
  createCustomer,
  createSale,
  createSaleReturn,
  getCustomerStatement,
  getSale,
  listAccountBalances,
  listAccountTransfers,
  listCollections,
  listCustomerBalances,
  listCustomers,
  listPaymentAccounts,
  listPaymentChannels,
  peekNextSaleNo,
  listSaleItems,
  listSales,
  listSalesReturns,
  recordCollection,
  reverseSale,
  updateCustomer,
  updateSale,
} from "@/lib/sales.functions";
import type {
  AccountBalance,
  AccountTransfer,
  CollectionInput,
  CreateReturnInput,
  CreateSaleInput,
  Customer,
  CustomerBalance,
  CustomerInput,
  CustomerPayment,
  PaymentAccount,
  PaymentChannel,
  SaleItemWithReturns,
  SaleOverview,
  SalesReturn,
  StatementEntry,
  TransferInput,
  UpdateSaleInput,
} from "@/lib/sales-types";

/**
 * Phase 5 data layer. Reads cache the database read models; writes call the
 * atomic RPCs and then invalidate every dependent cache — including the
 * financial engine snapshot, because sales, collections, returns and transfers
 * all flow through the canonical pipeline.
 */

const STALE = 20_000;

function mutationError(error: Error) {
  const message = /row-level security|permission denied/i.test(error.message)
    ? "You do not have permission to perform this action. Ask an admin or manager for access."
    : error.message;
  toast.error(message);
}

/** ---- Reads ---- */

export function useSales(params?: {
  from?: string;
  to?: string;
  customer_id?: string;
  payment_status?: string;
  limit?: number;
}) {
  const fn = useServerFn(listSales);
  return useQuery<SaleOverview[]>({
    queryKey: ["sales", params ?? null],
    queryFn: () => fn({ data: params ?? {} }),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useSaleItems(saleId: string | null) {
  const fn = useServerFn(listSaleItems);
  return useQuery<SaleItemWithReturns[]>({
    queryKey: ["sale-items", saleId],
    queryFn: () => fn({ data: { sale_id: saleId as string } }),
    enabled: Boolean(saleId),
    staleTime: 0,
  });
}

export function useSaleOverview(saleId: string | null) {
  const fn = useServerFn(getSale);
  return useQuery<SaleOverview | null>({
    queryKey: ["sale-overview", saleId],
    queryFn: () => fn({ data: { sale_id: saleId as string } }),
    enabled: Boolean(saleId),
    staleTime: 0,
  });
}

export function useCustomers() {
  const fn = useServerFn(listCustomers);
  return useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: () => fn(),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useCustomerBalances() {
  const fn = useServerFn(listCustomerBalances);
  return useQuery<CustomerBalance[]>({
    queryKey: ["customer-balances"],
    queryFn: () => fn(),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useCustomerStatement(customerId: string | null) {
  const fn = useServerFn(getCustomerStatement);
  return useQuery<StatementEntry[]>({
    queryKey: ["customer-statement", customerId],
    queryFn: () => fn({ data: { customer_id: customerId as string } }),
    enabled: Boolean(customerId),
    staleTime: 0,
  });
}

export function useCollections(params?: { customer_id?: string; limit?: number }) {
  const fn = useServerFn(listCollections);
  return useQuery<CustomerPayment[]>({
    queryKey: ["collections", params ?? null],
    queryFn: () => fn({ data: params ?? {} }),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useSalesReturns(params?: { sale_id?: string; limit?: number }) {
  const fn = useServerFn(listSalesReturns);
  return useQuery<SalesReturn[]>({
    queryKey: ["sales-returns", params ?? null],
    queryFn: () => fn({ data: params ?? {} }),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function usePaymentAccounts() {
  const fn = useServerFn(listPaymentAccounts);
  return useQuery<PaymentAccount[]>({
    queryKey: ["payment-accounts"],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}

export function usePaymentChannels() {
  const fn = useServerFn(listPaymentChannels);
  return useQuery<PaymentChannel[]>({
    queryKey: ["payment-channels"],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}

/** Preview of the next reference number; refetched whenever the dialog opens. */
export function useNextSaleNo(enabled: boolean) {
  const fn = useServerFn(peekNextSaleNo);
  return useQuery<{ sale_no: string }>({
    queryKey: ["next-sale-no"],
    queryFn: () => fn(),
    enabled,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useAccountBalances() {
  const fn = useServerFn(listAccountBalances);
  return useQuery<AccountBalance[]>({
    queryKey: ["account-balances"],
    queryFn: () => fn(),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useAccountTransfers(limit?: number) {
  const fn = useServerFn(listAccountTransfers);
  return useQuery<AccountTransfer[]>({
    queryKey: ["account-transfers", limit ?? null],
    queryFn: () => fn({ data: limit ? { limit } : {} }),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

/** ---- Invalidation ---- */

/**
 * A single invalidation surface: any Phase 5 write can move stock, receivables,
 * account balances and the financial engine chain, so all of them are refetched.
 */
function useCommerceInvalidation() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all(
      [
        "sales",
        "sale-items",
        "sales-returns",
        "collections",
        "customers",
        "customer-balances",
        "customer-statement",
        "payment-accounts",
        "account-balances",
        "account-transfers",
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

export function useCreateSale() {
  const fn = useServerFn(createSale);
  const invalidate = useCommerceInvalidation();
  return useMutation({
    mutationFn: (input: CreateSaleInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Sale recorded — stock and engine updated");
    },
    onError: mutationError,
  });
}

export function useUpdateSale() {
  const fn = useServerFn(updateSale);
  const invalidate = useCommerceInvalidation();
  return useMutation({
    mutationFn: (input: UpdateSaleInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Sale updated — stock, money and targets recalculated");
    },
    onError: mutationError,
  });
}

export function useReverseSale() {
  const fn = useServerFn(reverseSale);
  const invalidate = useCommerceInvalidation();
  return useMutation({
    mutationFn: (input: { sale_id: string; reason?: string | null }) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Sale reversed — history kept");
    },
    onError: mutationError,
  });
}

export function useRecordCollection() {
  const fn = useServerFn(recordCollection);
  const invalidate = useCommerceInvalidation();
  return useMutation({
    mutationFn: (input: CollectionInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Collection recorded — balances updated");
    },
    onError: mutationError,
  });
}

export function useCreateSaleReturn() {
  const fn = useServerFn(createSaleReturn);
  const invalidate = useCommerceInvalidation();
  return useMutation({
    mutationFn: (input: CreateReturnInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Return recorded — sale and engine updated");
    },
    onError: mutationError,
  });
}

export function useCreateAccountTransfer() {
  const fn = useServerFn(createAccountTransfer);
  const invalidate = useCommerceInvalidation();
  return useMutation({
    mutationFn: (input: TransferInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Transfer recorded");
    },
    onError: mutationError,
  });
}

export function useCreateCustomer() {
  const fn = useServerFn(createCustomer);
  const invalidate = useCommerceInvalidation();
  return useMutation({
    mutationFn: (input: CustomerInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Customer created");
    },
    onError: mutationError,
  });
}

export function useUpdateCustomer() {
  const fn = useServerFn(updateCustomer);
  const invalidate = useCommerceInvalidation();
  return useMutation({
    mutationFn: (input: Partial<CustomerInput> & { id: string }) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Customer updated");
    },
    onError: mutationError,
  });
}
