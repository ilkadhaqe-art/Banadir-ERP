import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import {
  createTransaction,
  updateTransaction,
  voidTransaction,
  type TransactionInput,
} from "@/lib/financial.functions";

/**
 * All financial writes go straight to the canonical tables. The database
 * triggers rebuild_financial_chain() from the earliest affected date, so the
 * client only has to invalidate its caches and re-read the canonical snapshot.
 */
function useEngineInvalidation() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ["financial-snapshot"] });
    await queryClient.invalidateQueries({ queryKey: ["daily-financial-states"] });
    await queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
    await queryClient.invalidateQueries({ queryKey: ["financial-rules"] });
    await queryClient.invalidateQueries({ queryKey: ["obligation-summary"] });
  };
}

export function useCreateTransaction() {
  const fn = useServerFn(createTransaction);
  const invalidate = useEngineInvalidation();
  return useMutation({
    mutationFn: (input: TransactionInput) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Recorded — engine rebuilt");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateTransaction() {
  const fn = useServerFn(updateTransaction);
  const invalidate = useEngineInvalidation();
  return useMutation({
    mutationFn: (input: Partial<TransactionInput> & { id: string }) => fn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Updated — engine rebuilt");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useVoidTransaction() {
  const fn = useServerFn(voidTransaction);
  const invalidate = useEngineInvalidation();
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Reversed — engine rebuilt");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
