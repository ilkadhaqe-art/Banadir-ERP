/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Financial Snapshot and Ledger functions — connected to the real Banadir Online FOS engine.
 */

import { createRpcFn } from "@/lib/rpc-client";
import type {
  CreateRuleInput,
  CreateTransactionInput,
  DailyFinancialState,
  FinancialRule,
  FinancialSnapshot,
  FinancialTransaction,
  ObligationSummary,
} from "@/lib/financial-types";

export const getFinancialSnapshot = createRpcFn<void, FinancialSnapshot>("getFinancialSnapshot");

export const listDailyStates = createRpcFn<void, DailyFinancialState[]>("listDailyStates");

export const listFinancialRules = createRpcFn<void, FinancialRule[]>("listFinancialRules");

export const getObligationSummary = createRpcFn<void, ObligationSummary>("getFinancialSnapshot");

export const listFinancialTransactions = createRpcFn<
  {
    account_id?: string;
    category?: string;
    txn_type?: string;
    from?: string;
    to?: string;
    limit?: number;
  },
  FinancialTransaction[]
>("listFinancialTransactions");

export const createTransaction = createRpcFn<CreateTransactionInput, any>(
  "postFinancialTransaction",
);

export const updateTransaction = createRpcFn<any, any>("updateTransaction");

export const voidTransaction = createRpcFn<{ transaction_id: string; reason?: string }, any>(
  "voidFinancialTransaction",
);

export const createFinancialRule = createRpcFn<CreateRuleInput, any>("createFinancialRule");

export const updateFinancialRule = createRpcFn<any, any>("updateFinancialRule");

export const setFinancialRuleActive = createRpcFn<any, any>("setFinancialRuleActive");
