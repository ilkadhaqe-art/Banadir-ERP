import { Pencil, Undo2 } from "lucide-react";
import { useState } from "react";

import { TransactionDialog } from "./TransactionDialog";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useVoidTransaction } from "@/hooks/useFinancialMutations";
import { useFinancialTransactions } from "@/hooks/useFinancialSnapshot";
import type { FinancialTransaction } from "@/lib/financial-types";
import { formatDate, formatMoney } from "@/lib/format";

/**
 * Canonical ledger rows. Editing, re-dating or reversing a row triggers the
 * database rebuild from the earliest affected date — no client-side math.
 */
export function LedgerPanel() {
  const { data, isPending, isError } = useFinancialTransactions({ limit: 25 });
  const voidTxn = useVoidTransaction();
  const [editing, setEditing] = useState<FinancialTransaction | null>(null);

  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Canonical Ledger</h2>
          <p className="text-xs text-muted-foreground">
            Every change rebuilds the engine chain automatically.
          </p>
        </div>
      </div>

      {isError ? (
        <p className="px-4 py-6 text-sm text-destructive">
          Ledger unavailable — engine read failed.
        </p>
      ) : isPending ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 font-semibold">Date</th>
                <th className="px-4 py-2 font-semibold">Type</th>
                <th className="px-4 py-2 font-semibold">Description</th>
                <th className="px-4 py-2 text-right font-semibold">Amount</th>
                <th className="px-4 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((txn) => (
                <tr key={txn.id} className="hover:bg-accent/30">
                  <td className="num whitespace-nowrap px-4 py-2.5">{formatDate(txn.txn_date)}</td>
                  <td className="px-4 py-2.5 capitalize">
                    {txn.type}
                    <span className="ml-1 text-xs text-muted-foreground">({txn.scope})</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {txn.description ?? txn.category ?? "—"}
                  </td>
                  <td className="num whitespace-nowrap px-4 py-2.5 text-right font-medium">
                    {formatMoney(txn.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Edit transaction"
                      onClick={() => setEditing(txn)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Reverse transaction"
                      disabled={voidTxn.isPending}
                      onClick={() => voidTxn.mutate(txn.id)}
                    >
                      <Undo2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-6 text-sm text-muted-foreground">No transactions recorded yet.</p>
      )}

      <TransactionDialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        kind={(editing?.type as "sale") ?? "sale"}
        transaction={editing}
      />
    </section>
  );
}
