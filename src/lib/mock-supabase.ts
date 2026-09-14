/* eslint-disable @typescript-eslint/no-explicit-any */
import { MOCK_BUSINESS_OVERVIEW, MOCK_FINANCIAL_SNAPSHOT, mockDb } from "@/lib/mock-data";

export function createMockSupabase() {
  return {
    from: (table: string) => {
      let data = [...(mockDb[table] || [])];
      let limitCount: number | null = null;

      const builder: any = {
        select: (_cols = "*") => builder,
        order: (col: string, options?: { ascending?: boolean }) => {
          const asc = options?.ascending !== false;
          data.sort((a, b) => {
            const vA = a[col] ?? "";
            const vB = b[col] ?? "";
            if (vA < vB) return asc ? -1 : 1;
            if (vA > vB) return asc ? 1 : -1;
            return 0;
          });
          return builder;
        },
        eq: (col: string, val: any) => {
          data = data.filter((item) => String(item[col]) === String(val));
          return builder;
        },
        neq: (col: string, val: any) => {
          data = data.filter((item) => String(item[col]) !== String(val));
          return builder;
        },
        in: (col: string, vals: any[]) => {
          const set = new Set(vals.map(String));
          data = data.filter((item) => set.has(String(item[col])));
          return builder;
        },
        gte: (col: string, val: any) => {
          data = data.filter((item) => item[col] >= val);
          return builder;
        },
        lte: (col: string, val: any) => {
          data = data.filter((item) => item[col] <= val);
          return builder;
        },
        limit: (count: number) => {
          limitCount = count;
          return builder;
        },
        maybeSingle: async () => {
          return { data: data[0] ?? null, error: null };
        },
        single: async () => {
          return { data: data[0] ?? null, error: null };
        },
        then: (resolve: (res: { data: any[]; error: null }) => void) => {
          const result = limitCount ? data.slice(0, limitCount) : data;
          return Promise.resolve({ data: result, error: null }).then(resolve);
        },
        insert: async (newRows: any) => {
          const rows = Array.isArray(newRows) ? newRows : [newRows];
          const inserted = rows.map((r) => ({
            id: r.id || `mock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            created_at: new Date().toISOString(),
            ...r,
          }));
          if (!mockDb[table]) mockDb[table] = [];
          mockDb[table].unshift(...inserted);
          return { data: inserted, error: null };
        },
        update: (patch: any) => ({
          eq: async (col: string, val: any) => {
            if (mockDb[table]) {
              mockDb[table] = mockDb[table].map((item) => {
                if (String(item[col]) === String(val)) {
                  return { ...item, ...patch };
                }
                return item;
              });
            }
            return { data: null, error: null };
          },
        }),
        delete: () => ({
          eq: async (col: string, val: any) => {
            if (mockDb[table]) {
              mockDb[table] = mockDb[table].filter((item) => String(item[col]) !== String(val));
            }
            return { data: null, error: null };
          },
        }),
      };
      return builder;
    },

    rpc: async (fn: string, args: Record<string, any> = {}) => {
      switch (fn) {
        case "financial_snapshot": {
          const sales = mockDb.sales || [];
          const products = mockDb.products || [];
          const accounts = mockDb.account_balances || [];
          const cashTotal = accounts.reduce((acc, a) => acc + (Number(a.balance) || 0), 0);
          const receivablesTotal = sales.reduce(
            (acc, s) => acc + (Number(s.remaining_balance) || 0),
            0,
          );
          const inventoryValue = products.reduce(
            (acc, p) => acc + (Number(p.cost_price) || 0) * (Number(p.stock) || 0),
            0,
          );

          return {
            data: {
              ...MOCK_FINANCIAL_SNAPSHOT,
              cash_balance: cashTotal,
              receivables: receivablesTotal,
              business_capital: cashTotal + inventoryValue,
              today: {
                ...MOCK_FINANCIAL_SNAPSHOT.today,
                sales: sales.reduce((acc, s) => acc + (Number(s.total) || 0), 0),
                collections: sales.reduce((acc, s) => acc + (Number(s.paid_amount) || 0), 0),
              },
            },
            error: null,
          };
        }

        case "business_overview": {
          const sales = mockDb.sales || [];
          const products = mockDb.products || [];
          const orders = mockDb.orders || [];
          const deliveries = mockDb.deliveries || [];
          const accounts = mockDb.account_balances || [];
          const totalSales = sales.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
          const cashTotal = accounts.reduce((acc, a) => acc + (Number(a.balance) || 0), 0);
          const receivablesTotal = sales.reduce(
            (acc, s) => acc + (Number(s.remaining_balance) || 0),
            0,
          );
          const inventoryValue = products.reduce(
            (acc, p) => acc + (Number(p.cost_price) || 0) * (Number(p.stock) || 0),
            0,
          );

          return {
            data: {
              ...MOCK_BUSINESS_OVERVIEW,
              sales: totalSales,
              receivables: receivablesTotal,
              stock_value: inventoryValue,
              cash_total: cashTotal,
              open_orders: orders.length,
              active_deliveries: deliveries.filter((d) => d.status !== "delivered").length,
            },
            error: null,
          };
        }

        case "sales_smart_defaults":
          return {
            data: {
              most_sold_product_id: mockDb.products?.[0]?.id ?? null,
              most_used_payment_channel_id: "chan-evc",
              most_used_delivery_company_id: null,
              most_used_driver_id: null,
              most_used_district_id: "loc-hodan",
              most_used_cargo_company_id: null,
              most_used_region_id: "loc-hargeisa",
            },
            error: null,
          };

        case "factory_reset": {
          mockDb.sales = [];
          mockDb.sales_overview = [];
          mockDb.sale_items = [];
          mockDb.customers = [];
          mockDb.customer_balances = [];
          mockDb.products = [];
          mockDb.product_stock = [];
          mockDb.purchases = [];
          mockDb.purchase_items = [];
          mockDb.orders = [];
          mockDb.order_items = [];
          mockDb.deliveries = [];
          mockDb.drivers = [];
          mockDb.financial_rules = [];
          mockDb.financial_transactions = [];
          mockDb.account_transfers = [];
          mockDb.account_balances = (mockDb.account_balances || []).map((a) => ({
            ...a,
            balance: 0.0,
          }));
          mockDb.account_balances_report = (mockDb.account_balances_report || []).map((a) => ({
            ...a,
            balance: 0.0,
            total_in: 0.0,
            total_out: 0.0,
            net_change: 0.0,
          }));
          return { data: { ok: true, include_masters: true }, error: null };
        }

        case "lookup_delivery_rate":
          return { data: 3.0, error: null };

        case "lookup_cargo_rate":
          return { data: 15.0, error: null };

        case "create_sale": {
          const nextIndex = (mockDb.sales?.length ?? 0) + 1;
          const saleNo = `S${String(nextIndex).padStart(5, "0")}`;
          const newId = `sale-${Date.now()}`;
          const newSale = {
            id: newId,
            sale_no: saleNo,
            sale_date: args.sale_date || new Date().toISOString().slice(0, 10),
            sale_time: args.sale_time || "12:00",
            customer_id: args.customer_id,
            customer_name: args.customer_name || "Customer",
            customer_phone: args.customer_phone,
            customer_address: args.customer_address,
            subtotal: args.subtotal || 100,
            discount: args.discount || 0,
            vat_rate: args.vat_rate || 0,
            vat_amount: args.vat_amount || 0,
            delivery_fee: args.delivery_fee || 0,
            cargo_fee: args.cargo_fee || 0,
            total: args.total || 100,
            paid_amount: args.paid_amount || 100,
            remaining_balance: Math.max(0, (args.total || 100) - (args.paid_amount || 100)),
            payment_method: args.payment_method || "evc_plus",
            payment_status: args.payment_status || "paid",
            fulfillment_type: args.fulfillment_type || "pickup",
            delivery_status: "pending",
            cashier_name: "Demo Admin",
            created_at: new Date().toISOString(),
          };
          if (!mockDb.sales) mockDb.sales = [];
          if (!mockDb.sales_overview) mockDb.sales_overview = [];
          mockDb.sales.unshift(newSale);
          mockDb.sales_overview.unshift(newSale);
          return { data: newId, error: null };
        }

        case "update_sale": {
          if (mockDb.sales && args.sale_id) {
            mockDb.sales = mockDb.sales.map((s) => (s.id === args.sale_id ? { ...s, ...args } : s));
          }
          return { data: null, error: null };
        }

        case "reverse_sale": {
          if (mockDb.sales_overview && args.sale_id) {
            mockDb.sales_overview = mockDb.sales_overview.filter((s) => s.id !== args.sale_id);
          }
          return { data: null, error: null };
        }

        case "set_sale_extras":
          return { data: null, error: null };

        case "record_collection":
          return { data: `coll-${Date.now()}`, error: null };

        case "customer_statement":
          return {
            data: [
              {
                entry_date: "2026-09-14",
                kind: "sale",
                reference: "S00001",
                debit: 1103.0,
                credit: 0,
                balance: 1103.0,
                note: "Sale S00001",
              },
              {
                entry_date: "2026-09-14",
                kind: "payment",
                reference: "PAY-101",
                debit: 0,
                credit: 1103.0,
                balance: 0,
                note: "EVC Plus Payment",
              },
            ],
            error: null,
          };

        case "sale_statement": {
          const found = (mockDb.sales_overview || []).find(
            (s) => s.id === args._sale_id || s.sale_no === args._sale_id,
          );
          return {
            data: {
              sale: found || mockDb.sales_overview?.[0] || null,
              items: mockDb.sale_items || [],
              payments: [],
              deliveries: [],
              events: [],
            },
            error: null,
          };
        }

        default:
          return { data: null, error: null };
      }
    },

    storage: {
      from: (_bucket: string) => ({
        upload: async (_path: string, _file: any) => ({
          data: { path: "sample-product.png" },
          error: null,
        }),
        getPublicUrl: (_path: string) => ({
          data: {
            publicUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80",
          },
        }),
        createSignedUrls: async (paths: string[]) => ({
          data: paths.map((p) => ({
            path: p,
            signedUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80",
          })),
          error: null,
        }),
      }),
    },
  };
}
