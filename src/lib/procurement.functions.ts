/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Procurement, Suppliers, and Money Ledger functions — connected to the real Banadir Online FOS engine.
 */

import { createRpcFn } from "@/lib/rpc-client";
import type {
  CreatePurchaseInput,
  ExpenseCategory,
  MoneyLedgerRow,
  PurchaseOverview,
  RecordExpenseInput,
  RecordIncomeInput,
  RecordSupplierPaymentInput,
  Supplier,
  SupplierBalance,
  SupplierInput,
  SupplierPaymentRow,
  VoidMoneyEntryInput,
} from "@/lib/procurement-types";

export const listSuppliers = createRpcFn<void, Supplier[]>("listSuppliers");

export const listSupplierBalances = createRpcFn<void, SupplierBalance[]>("listSupplierBalances");

export const listPurchases = createRpcFn<
  { supplier_id?: string; from?: string; to?: string; limit?: number },
  PurchaseOverview[]
>("listPurchases");

export const listPurchaseItems = createRpcFn<{ purchase_id: string }, any>("getPurchase");

export const listSupplierPayments = createRpcFn<
  { supplier_id?: string; purchase_id?: string; limit?: number },
  SupplierPaymentRow[]
>("listSupplierPayments");

export const listExpenseCategories = createRpcFn<void, ExpenseCategory[]>("listExpenseCategories");

export const listMoneyLedger = createRpcFn<
  { account_id?: string; txn_type?: string; from?: string; to?: string; limit?: number },
  MoneyLedgerRow[]
>("listFinancialTransactions");

export const createSupplier = createRpcFn<SupplierInput, any>("saveSupplier");

export const updateSupplier = createRpcFn<SupplierInput, any>("saveSupplier");

export const createPurchase = createRpcFn<CreatePurchaseInput, any>("createPurchase");

export const createPurchaseReturn = createRpcFn<any, any>("createPurchaseReturn");

export const recordSupplierPayment = createRpcFn<RecordSupplierPaymentInput, any>(
  "recordSupplierPayment",
);

export const recordExpense = createRpcFn<RecordExpenseInput, any>("recordExpense");

export const recordIncome = createRpcFn<RecordIncomeInput, any>("recordIncome");

export const voidMoneyEntry = createRpcFn<VoidMoneyEntryInput, any>("voidFinancialTransaction");
