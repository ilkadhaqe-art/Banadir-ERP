import { createFileRoute } from "@tanstack/react-router";
import { Factory, HandCoins, Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Panel, StatTile, EmptyState } from "@/components/command-center/Panel";
import { SupplierDialog } from "@/components/procurement/SupplierDialog";
import { SupplierPaymentDialog } from "@/components/procurement/SupplierPaymentDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupplierBalances, useSuppliers } from "@/hooks/useProcurement";
import { formatMoney, formatNumber } from "@/lib/format";
import type { Supplier } from "@/lib/procurement-types";

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: () => ({
    meta: [
      { title: "Suppliers — Banadir Online FOS" },
      {
        name: "description",
        content: "Supplier master data, payables and settlements in Banadir Online FOS.",
      },
      { property: "og:title", content: "Suppliers — Banadir Online FOS" },
      {
        property: "og:description",
        content: "Payables per supplier straight from the supplier balance read model.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const { data: suppliers } = useSuppliers();
  const { data: balances, isPending, isError } = useSupplierBalances();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [payFor, setPayFor] = useState<{ id: string; name: string } | null>(null);

  const supplierById = useMemo(() => new Map((suppliers ?? []).map((s) => [s.id, s])), [suppliers]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return balances ?? [];
    return (balances ?? []).filter(
      (row) =>
        row.name.toLowerCase().includes(term) || (row.phone ?? "").toLowerCase().includes(term),
    );
  }, [balances, search]);

  const payables = (balances ?? []).reduce((sum, row) => sum + Number(row.balance), 0);
  const withDebt = (balances ?? []).filter((row) => Number(row.balance) > 0).length;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">
            PROCUREMENT
          </p>
          <h1 className="text-xl font-bold sm:text-2xl">Suppliers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Payables come from the supplier balance view — purchases minus returns minus payments.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Add supplier
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Suppliers"
          value={formatNumber((balances ?? []).length)}
          loading={isPending}
        />
        <StatTile
          label="Active"
          value={formatNumber((balances ?? []).filter((r) => r.active).length)}
          loading={isPending}
        />
        <StatTile
          label="With payables"
          value={formatNumber(withDebt)}
          tone={withDebt > 0 ? "warning" : "default"}
          loading={isPending}
        />
        <StatTile
          label="Total payables"
          value={formatMoney(payables)}
          tone={payables > 0 ? "warning" : "default"}
          loading={isPending}
        />
      </div>

      <Panel icon={Factory} title="Supplier list" subtitle="Search, settle and edit suppliers">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search suppliers"
          />
        </div>

        <div className="mt-4">
          {isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              Suppliers unavailable — read failed.
            </p>
          ) : isPending ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState label="No suppliers yet." />
          ) : (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-semibold">Supplier</th>
                    <th className="px-3 py-2 text-right font-semibold">Opening</th>
                    <th className="px-3 py-2 text-right font-semibold">Purchased</th>
                    <th className="px-3 py-2 text-right font-semibold">Returned</th>
                    <th className="px-3 py-2 text-right font-semibold">Paid</th>
                    <th className="px-3 py-2 text-right font-semibold">Balance</th>
                    <th className="px-4 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.supplier_id} className="hover:bg-accent/30">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{row.name}</p>
                            <p className="num truncate text-xs text-muted-foreground">
                              {row.phone ?? "—"}
                            </p>
                          </div>
                          {!row.active ? <Badge variant="outline">Inactive</Badge> : null}
                        </div>
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right text-muted-foreground">
                        {formatMoney(Number(row.opening_balance))}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right">
                        {formatMoney(Number(row.purchased))}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right text-muted-foreground">
                        {formatMoney(Number(row.returned))}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right">
                        {formatMoney(Number(row.paid))}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                        {formatMoney(Number(row.balance))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        {Number(row.balance) > 0 ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Pay ${row.name}`}
                            onClick={() => setPayFor({ id: row.supplier_id, name: row.name })}
                          >
                            <HandCoins className="size-4" />
                          </Button>
                        ) : null}
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Edit ${row.name}`}
                          onClick={() => {
                            setEditing(supplierById.get(row.supplier_id) ?? null);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      <SupplierDialog open={dialogOpen} onOpenChange={setDialogOpen} supplier={editing} />
      <SupplierPaymentDialog
        open={Boolean(payFor)}
        onOpenChange={(open) => !open && setPayFor(null)}
        supplierId={payFor?.id ?? null}
        supplierName={payFor?.name ?? null}
      />
    </div>
  );
}
