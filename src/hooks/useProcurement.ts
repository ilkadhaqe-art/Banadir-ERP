import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  createPurchase,
  createPurchaseReturn,
  createSupplier,
  listExpenseCategories,
  listMoneyLedger,
  listPurchaseItems,
  listPurchases,
  listSupplierBalances,
  listSupplierPayments,
  listSuppliers,
  recordExpense,
  recordIncome,
  recordSupplierPayment,
  updateSupplier,
  voidMoneyEntry,
} from "@/lib/procurement.functions";
import type {
  CreatePurchaseInput,
  ExpenseCategory,
  LedgerEntry,
  MoneyEntryInput,
  PurchaseItemDetail,
  PurchaseOverview,
  PurchaseReturnInput,
  Supplier,
  SupplierBalance,
  SupplierInput,
  SupplierPayment,
  SupplierPaymentInput,
} from "@/lib/procurement-types";

/**
 * Phase 7 data layer: suppliers, purchases, payables, expenses and income.
 * Reads cache the database read models; every write invalidates stock,
 * payables, accounts and the financial engine because purchases move all four.
 */

const STALE = 20_000;

function mutationError(error: Error) {
  const message = /row-level security|permission denied/i.test(error.message)
    ? "You do not have permission to perform this action. Ask an admin or manager for access."
    : error.message;
  toast.error(message);
}

/** ---- Reads ---- */

export function useSuppliers() {
  const fn = useServerFn(listSuppliers);
  return useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: () => fn(),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useSupplierBalances() {
  const fn = useServerFn(listSupplierBalances);
  return useQuery<SupplierBalance[]>({
    queryKey: ["supplier-balances"],
    queryFn: () => fn(),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function usePurchases(params?: {
  from?: string;
  to?: string;
  supplier_id?: string;
  payment_status?: string;
  limit?: number;
}) {
  const fn = useServerFn(listPurchases);
  return useQuery<PurchaseOverview[]>({
    queryKey: ["purchases", params ?? null],
    queryFn: () => fn({ data: params ?? {} }),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function usePurchaseItems(purchaseId: string | null) {
  const fn = useServerFn(listPurchaseItems);
  return useQuery<PurchaseItemDetail[]>({
    queryKey: ["purchase-items", purchaseId],
    queryFn: () => fn({ data: { purchase_id: purchaseId as string } }),
    enabled: Boolean(purchaseId),
    staleTime: 0,
  });
}

export function useSupplierPayments(params?: { supplier_id?: string; limit?: number }) {
  const fn = useServerFn(listSupplierPayments);
  return useQuery<SupplierPayment[]>({
    queryKey: ["supplier-payments", params ?? null],
    queryFn: () => fn({ data: params ?? {} }),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

export function useExpenseCategories() {
  const fn = useServerFn(listExpenseCategories);
  return useQuery<ExpenseCategory[]>({
    queryKey: ["expense-categories"],
    queryFn: () => fn(),
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}

export function useMoneyLedger(params: {
  type: "expense" | "income";
  scope?: "business" | "personal" | "all";
  from?: string;
  to?: string;
  limit?: number;
}) {
  const fn = useServerFn(listMoneyLedger);
  return useQuery<LedgerEntry[]>({
    queryKey: ["money-ledger", params],
    queryFn: () => fn({ data: params }),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  });
}

/** ---- Invalidation ---- */

function useProcurementInvalidation() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all(
      [
        "suppliers",
        "supplier-balances",
        "supplier-payments",
        "purchases",
        "purchase-items",
        "money-ledger",
        "payment-accounts",
        "account-balances",
        "product-stock",
        "products",
        "inventory-movements",
        "financial-snapshot",
        "daily-financial-states",
        "financial-transactions",
        "business-overview",
        "reports",
        "audit-log",
      ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    );
  };
}

/** ---- Mutations ---- */

export function useCreateSupplier() {
  const fn = useServerFn(createSupplier);
  const invalidate = useProcurementInvalidation();
  return useMutation({
    mutationFn: (input: SupplierInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Supplier created");
    },
    onError: mutationError,
  });
}

export function useUpdateSupplier() {
  const fn = useServerFn(updateSupplier);
  const invalidate = useProcurementInvalidation();
  return useMutation({
    mutationFn: (input: Partial<SupplierInput> & { id: string }) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Supplier updated");
    },
    onError: mutationError,
  });
}

export function useCreatePurchase() {
  const fn = useServerFn(createPurchase);
  const invalidate = useProcurementInvalidation();
  return useMutation({
    mutationFn: (input: CreatePurchaseInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Purchase recorded — stock and payables updated");
    },
    onError: mutationError,
  });
}

export function useCreatePurchaseReturn() {
  const fn = useServerFn(createPurchaseReturn);
  const invalidate = useProcurementInvalidation();
  return useMutation({
    mutationFn: (input: PurchaseReturnInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Purchase return recorded");
    },
    onError: mutationError,
  });
}

export function useRecordSupplierPayment() {
  const fn = useServerFn(recordSupplierPayment);
  const invalidate = useProcurementInvalidation();
  return useMutation({
    mutationFn: (input: SupplierPaymentInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Supplier payment recorded");
    },
    onError: mutationError,
  });
}

export function useRecordExpense() {
  const fn = useServerFn(recordExpense);
  const invalidate = useProcurementInvalidation();
  return useMutation({
    mutationFn: (input: MoneyEntryInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Expense recorded");
    },
    onError: mutationError,
  });
}

export function useRecordIncome() {
  const fn = useServerFn(recordIncome);
  const invalidate = useProcurementInvalidation();
  return useMutation({
    mutationFn: (input: MoneyEntryInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Income recorded");
    },
    onError: mutationError,
  });
}

export function useVoidMoneyEntry() {
  const fn = useServerFn(voidMoneyEntry);
  const invalidate = useProcurementInvalidation();
  return useMutation({
    mutationFn: (input: { id: string; reason?: string }) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Entry voided — engine rebuilt");
    },
    onError: mutationError,
  });
}
