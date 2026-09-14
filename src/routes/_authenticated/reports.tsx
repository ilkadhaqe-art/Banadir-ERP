import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { useState } from "react";

import { EmptyState, Panel, StatTile } from "@/components/command-center/Panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useBusinessOverview,
  useCustomerSalesReport,
  useInventoryValuation,
  useProductSalesReport,
  useSalesDailyReport,
} from "@/hooks/useReports";
import { dayKey, formatDate, formatMoney, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Banadir Online FOS" },
      {
        name: "description",
        content:
          "Daily sales, product performance, customer revenue and inventory valuation reports.",
      },
      { property: "og:title", content: "Reports — Banadir Online FOS" },
      {
        property: "og:description",
        content: "Every figure is produced by a database view — nothing recomputed in the browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function startOfMonth() {
  const now = new Date();
  return dayKey(new Date(now.getFullYear(), now.getMonth(), 1));
}

function Loading() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}

function ReportsPage() {
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(dayKey());

  const range = { from, to };
  const overview = useBusinessOverview(range);
  const daily = useSalesDailyReport(range);
  const products = useProductSalesReport();
  const customers = useCustomerSalesReport();
  const valuation = useInventoryValuation();

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">INSIGHT</p>
        <h1 className="text-xl font-bold sm:text-2xl">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Period reporting across sales, products, customers and stock value.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-md">
        <div className="grid gap-1.5">
          <Label htmlFor="report-from">From</Label>
          <Input
            id="report-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="report-to">To</Label>
          <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Sales"
          value={formatMoney(Number(overview.data?.sales ?? 0))}
          loading={overview.isPending}
        />
        <StatTile
          label="Gross profit"
          value={formatMoney(Number(overview.data?.gross_profit ?? 0))}
          tone="positive"
          loading={overview.isPending}
        />
        <StatTile
          label="Expenses"
          value={formatMoney(Number(overview.data?.expenses ?? 0))}
          tone="negative"
          loading={overview.isPending}
        />
        <StatTile
          label="Stock value"
          value={formatMoney(Number(overview.data?.stock_value ?? 0))}
          loading={overview.isPending}
        />
      </div>

      <Panel icon={BarChart3} title="Report explorer" subtitle="Switch between report views">
        <Tabs defaultValue="daily">
          <TabsList className="flex-wrap">
            <TabsTrigger value="daily">Daily sales</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="stock">Inventory value</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-4">
            {daily.isPending ? (
              <Loading />
            ) : (daily.data ?? []).length === 0 ? (
              <EmptyState label="No sales in this period." />
            ) : (
              <div className="-mx-4 overflow-x-auto sm:mx-0">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 font-semibold">Day</th>
                      <th className="px-3 py-2 text-right font-semibold">Sales</th>
                      <th className="px-3 py-2 text-right font-semibold">Revenue</th>
                      <th className="px-3 py-2 text-right font-semibold">Paid</th>
                      <th className="px-3 py-2 text-right font-semibold">Debt</th>
                      <th className="px-3 py-2 text-right font-semibold">COGS</th>
                      <th className="px-4 py-2 text-right font-semibold">Gross profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(daily.data ?? []).map((row) => (
                      <tr key={row.day} className="hover:bg-accent/30">
                        <td className="whitespace-nowrap px-4 py-2.5">{formatDate(row.day)}</td>
                        <td className="num px-3 py-2.5 text-right">
                          {formatNumber(Number(row.sales_count))}
                        </td>
                        <td className="num px-3 py-2.5 text-right font-semibold">
                          {formatMoney(Number(row.sales_total))}
                        </td>
                        <td className="num px-3 py-2.5 text-right">
                          {formatMoney(Number(row.paid_total))}
                        </td>
                        <td className="num px-3 py-2.5 text-right text-muted-foreground">
                          {formatMoney(Number(row.debt_total))}
                        </td>
                        <td className="num px-3 py-2.5 text-right text-muted-foreground">
                          {formatMoney(Number(row.cogs_total))}
                        </td>
                        <td className="num px-4 py-2.5 text-right font-semibold">
                          {formatMoney(Number(row.gross_profit))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="products" className="mt-4">
            {products.isPending ? (
              <Loading />
            ) : (products.data ?? []).length === 0 ? (
              <EmptyState label="No product sales yet." />
            ) : (
              <div className="-mx-4 overflow-x-auto sm:mx-0">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 font-semibold">Product</th>
                      <th className="px-3 py-2 text-right font-semibold">Qty sold</th>
                      <th className="px-3 py-2 text-right font-semibold">Revenue</th>
                      <th className="px-3 py-2 text-right font-semibold">Cost</th>
                      <th className="px-3 py-2 text-right font-semibold">Profit</th>
                      <th className="px-4 py-2 font-semibold">Last sold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(products.data ?? []).map((row) => (
                      <tr key={row.product_id} className="hover:bg-accent/30">
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.sku ?? "—"}</p>
                        </td>
                        <td className="num px-3 py-2.5 text-right">
                          {formatNumber(Number(row.quantity_sold))}
                        </td>
                        <td className="num px-3 py-2.5 text-right font-semibold">
                          {formatMoney(Number(row.revenue))}
                        </td>
                        <td className="num px-3 py-2.5 text-right text-muted-foreground">
                          {formatMoney(Number(row.cost))}
                        </td>
                        <td className="num px-3 py-2.5 text-right font-semibold">
                          {formatMoney(Number(row.profit))}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                          {row.last_sold_on ? formatDate(row.last_sold_on) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="customers" className="mt-4">
            {customers.isPending ? (
              <Loading />
            ) : (customers.data ?? []).length === 0 ? (
              <EmptyState label="No customer sales yet." />
            ) : (
              <div className="-mx-4 overflow-x-auto sm:mx-0">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 font-semibold">Customer</th>
                      <th className="px-3 py-2 text-right font-semibold">Sales</th>
                      <th className="px-3 py-2 text-right font-semibold">Revenue</th>
                      <th className="px-3 py-2 text-right font-semibold">Paid</th>
                      <th className="px-3 py-2 text-right font-semibold">Outstanding</th>
                      <th className="px-4 py-2 font-semibold">Last sale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(customers.data ?? []).map((row) => (
                      <tr key={row.customer_id} className="hover:bg-accent/30">
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{row.name}</p>
                          <p className="num text-xs text-muted-foreground">{row.phone ?? "—"}</p>
                        </td>
                        <td className="num px-3 py-2.5 text-right">
                          {formatNumber(Number(row.sales_count))}
                        </td>
                        <td className="num px-3 py-2.5 text-right font-semibold">
                          {formatMoney(Number(row.sales_total))}
                        </td>
                        <td className="num px-3 py-2.5 text-right">
                          {formatMoney(Number(row.paid_total))}
                        </td>
                        <td className="num px-3 py-2.5 text-right">
                          {formatMoney(Number(row.outstanding))}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                          {row.last_sale_on ? formatDate(row.last_sale_on) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="stock" className="mt-4">
            {valuation.isPending ? (
              <Loading />
            ) : (valuation.data ?? []).length === 0 ? (
              <EmptyState label="No stock to value." />
            ) : (
              <div className="-mx-4 overflow-x-auto sm:mx-0">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 font-semibold">Product</th>
                      <th className="px-3 py-2 text-right font-semibold">On hand</th>
                      <th className="px-3 py-2 text-right font-semibold">Cost</th>
                      <th className="px-3 py-2 text-right font-semibold">Stock value</th>
                      <th className="px-4 py-2 text-right font-semibold">Retail value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(valuation.data ?? []).map((row) => (
                      <tr key={row.product_id} className="hover:bg-accent/30">
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{row.name}</p>
                          <p className="text-xs text-muted-foreground">{row.sku ?? "—"}</p>
                        </td>
                        <td className="num px-3 py-2.5 text-right">
                          {formatNumber(Number(row.stock_on_hand))}
                        </td>
                        <td className="num px-3 py-2.5 text-right text-muted-foreground">
                          {formatMoney(Number(row.cost_price))}
                        </td>
                        <td className="num px-3 py-2.5 text-right font-semibold">
                          {formatMoney(Number(row.stock_value))}
                        </td>
                        <td className="num px-4 py-2.5 text-right">
                          {formatMoney(Number(row.retail_value))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Panel>
    </div>
  );
}
