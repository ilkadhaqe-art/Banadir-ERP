import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  createFinancialRule,
  getObligationSummary,
  listFinancialRules,
  setFinancialRuleActive,
  updateFinancialRule,
  type FinancialRuleInput,
} from "@/lib/financial.functions";
import type { FinancialRule, ObligationSummary } from "@/lib/financial-types";

/**
 * Rules are canonical engine inputs. Writes land in financial_rules and the
 * database trigger rebuilds the daily chain — the client only invalidates.
 */
function useEngineInvalidation() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ["financial-rules"] });
    await queryClient.invalidateQueries({ queryKey: ["obligation-summary"] });
    await queryClient.invalidateQueries({ queryKey: ["financial-snapshot"] });
    await queryClient.invalidateQueries({ queryKey: ["daily-financial-states"] });
  };
}

function mutationError(error: Error) {
  toast.error(
    /row-level security|permission denied/i.test(error.message)
      ? "You do not have permission to change financial rules."
      : error.message,
  );
}

export function useFinancialRules() {
  const fetchRules = useServerFn(listFinancialRules);
  return useQuery<FinancialRule[]>({
    queryKey: ["financial-rules"],
    queryFn: () => fetchRules(),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function useObligationSummary(date?: string) {
  const fetchSummary = useServerFn(getObligationSummary);
  return useQuery<ObligationSummary>({
    queryKey: ["obligation-summary", date ?? "today"],
    queryFn: () => fetchSummary({ data: date ? { date } : {} }),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function useCreateFinancialRule() {
  const fn = useServerFn(createFinancialRule);
  const invalidate = useEngineInvalidation();
  return useMutation({
    mutationFn: (input: FinancialRuleInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Rule added — engine rebuilt");
    },
    onError: mutationError,
  });
}

export function useUpdateFinancialRule() {
  const fn = useServerFn(updateFinancialRule);
  const invalidate = useEngineInvalidation();
  return useMutation({
    mutationFn: (input: Partial<FinancialRuleInput> & { id: string }) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Rule updated — engine rebuilt");
    },
    onError: mutationError,
  });
}

export function useSetFinancialRuleActive() {
  const fn = useServerFn(setFinancialRuleActive);
  const invalidate = useEngineInvalidation();
  return useMutation({
    mutationFn: (input: { id: string; active: boolean; effective_to?: string | null }) =>
      fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Rule status updated — engine rebuilt");
    },
    onError: mutationError,
  });
}
