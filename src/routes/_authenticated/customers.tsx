import { createFileRoute } from "@tanstack/react-router";
import { FileText, HandCoins, Pencil, Plus, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { Panel, StatTile } from "@/components/command-center/Panel";
import { CollectionDialog } from "@/components/sales/CollectionDialog";
import { CustomerDialog } from "@/components/sales/CustomerDialog";
import { StatementDialog } from "@/components/sales/StatementDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomerBalances, useCustomers } from "@/hooks/useSales";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { Customer } from "@/lib/sales-types";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Banadir Online FOS" },
      {
        name: "description",
        content:
          "Customer records, credit limits, outstanding receivables and statements in Banadir Online FOS.",
      },
      { property: "og:title", content: "Customers — Banadir Online FOS" },
      {
        property: "og:description",
        content: "Receivables and credit headroom straight from the customer balance model.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomersPage,
});

const ALL = "__all__";

function CustomersPage() {
  const { data: customers } = useCustomers();
  const { data: balances, isPending, isError } = useCustomerBalances();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [statementFor, setStatementFor] = useState<{ id: string; name: string } | null>(null);
  const [collectFor, setCollectFor] = useState<string | null>(null);

  const customerById = useMemo(() => new Map((customers ?? []).map((c) => [c.id, c])), [customers]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (balances ?? []).filter((row) => {
      if (filter === "active" && !row.active) return false;
      if (filter === "inactive" && row.active) return false;
      if (filter === "debt" && Number(row.balance) <= 0) return false;
      if (!term) return true;
      return (
        row.name.toLowerCase().includes(term) || (row.phone ?? "").toLowerCase().includes(term)
      );
    });
  }, [balances, search, filter]);

  const totalReceivable = (balances ?? []).reduce((sum, row) => sum + Number(row.balance), 0);
  const debtors = (balances ?? []).filter((row) => Number(row.balance) > 0).length;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">COMMERCE</p>
          <h1 className="text-xl font-bold sm:text-2xl">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Balances and credit headroom come from the customer balance read model.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Add customer
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Customers"
          value={formatNumber((balances ?? []).length)}
          loading={isPending}
        />
        <StatTile
          label="Active"
          value={formatNumber((balances ?? []).filter((r) => r.active).length)}
          loading={isPending}
        />
        <StatTile
          label="With debt"
          value={formatNumber(debtors)}
          tone={debtors > 0 ? "warning" : "default"}
          loading={isPending}
        />
        <StatTile
          label="Receivables"
          value={formatMoney(totalReceivable)}
          tone={totalReceivable > 0 ? "warning" : "default"}
          loading={isPending}
        />
      </div>

      <Panel icon={Users} title="Customer list" subtitle="Search, collect and open statements">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search customers"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger aria-label="Filter customers">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="debt">With outstanding debt</SelectItem>
              <SelectItem value="inactive">Inactive only</SelectItem>
              <SelectItem value={ALL}>All customers</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4">
          {isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              Customers unavailable — read failed.
            </p>
          ) : isPending ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No customers match these filters.
            </p>
          ) : (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[940px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-semibold">Customer</th>
                    <th className="px-3 py-2 text-right font-semibold">Sales</th>
                    <th className="px-3 py-2 text-right font-semibold">Returned</th>
                    <th className="px-3 py-2 text-right font-semibold">Paid</th>
                    <th className="px-3 py-2 text-right font-semibold">Balance</th>
                    <th className="px-3 py-2 text-right font-semibold">Credit left</th>
                    <th className="px-3 py-2 font-semibold">Last sale</th>
                    <th className="px-4 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.customer_id} className="hover:bg-accent/30">
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
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right">
                        {formatMoney(Number(row.sales_total))}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right text-muted-foreground">
                        {formatMoney(Number(row.returned_total))}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right">
                        {formatMoney(Number(row.paid_total))}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                        {formatMoney(Number(row.balance))}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-right text-muted-foreground">
                        {Number(row.credit_limit) > 0
                          ? formatMoney(Number(row.credit_available))
                          : "No limit"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                        {row.last_sale_date ? formatDate(row.last_sale_date) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Statement for ${row.name}`}
                          onClick={() => setStatementFor({ id: row.customer_id, name: row.name })}
                        >
                          <FileText className="size-4" />
                        </Button>
                        {Number(row.balance) > 0 ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Collect from ${row.name}`}
                            onClick={() => setCollectFor(row.customer_id)}
                          >
                            <HandCoins className="size-4" />
                          </Button>
                        ) : null}
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Edit ${row.name}`}
                          onClick={() => {
                            setEditing(customerById.get(row.customer_id) ?? null);
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

      <CustomerDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={editing} />
      <StatementDialog
        open={Boolean(statementFor)}
        onOpenChange={(open) => !open && setStatementFor(null)}
        customerId={statementFor?.id ?? null}
        customerName={statementFor?.name ?? null}
      />
      <CollectionDialog
        open={Boolean(collectFor)}
        onOpenChange={(open) => !open && setCollectFor(null)}
        customerId={collectFor}
      />
    </div>
  );
}
