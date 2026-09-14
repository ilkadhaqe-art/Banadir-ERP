import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  getFinancialSnapshot,
  listDailyStates,
  listFinancialTransactions,
} from "@/lib/financial.functions";
import type { DailyState, FinancialSnapshot, FinancialTransaction } from "@/lib/financial-types";

/** Reads the ONE canonical engine snapshot. Never recompute financial truth in a component. */
export function useFinancialSnapshot(date?: string) {
  const fetchSnapshot = useServerFn(getFinancialSnapshot);
  return useQuery<FinancialSnapshot>({
    queryKey: ["financial-snapshot", date ?? "today"],
    queryFn: () => fetchSnapshot({ data: date ? { date } : {} }),
    staleTime: 15_000,
    // Keep the last verified engine state on screen while refetching so no
    // widget ever flashes a false $0.00.
    placeholderData: (previous) => previous,
  });
}

export function useDailyStates(range?: { from?: string; to?: string }) {
  const fetchStates = useServerFn(listDailyStates);
  return useQuery<DailyState[]>({
    queryKey: ["daily-financial-states", range?.from ?? null, range?.to ?? null],
    queryFn: () => fetchStates({ data: range ?? {} }),
    staleTime: 15_000,
    placeholderData: (previous) => previous,
  });
}

export function useFinancialTransactions(params?: {
  from?: string;
  to?: string;
  type?: string;
  limit?: number;
}) {
  const fetchTxns = useServerFn(listFinancialTransactions);
  return useQuery<FinancialTransaction[]>({
    queryKey: ["financial-transactions", params ?? null],
    queryFn: () => fetchTxns({ data: params ?? {} }),
    staleTime: 15_000,
    placeholderData: (previous) => previous,
  });
}
