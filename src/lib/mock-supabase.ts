/* eslint-disable @typescript-eslint/no-explicit-any */
import { MOCK_BUSINESS_OVERVIEW, MOCK_FINANCIAL_SNAPSHOT, mockDb } from "@/lib/mock-data";

function matchLike(val: string, pattern: string, caseInsensitive = false): boolean {
  const v = caseInsensitive ? val.toLowerCase() : val;
  const p = caseInsensitive ? pattern.toLowerCase() : pattern;
  const regexPattern = "^" + p.replace(/%/g, ".*").replace(/_/g, ".") + "$";
  try {
    return new RegExp(regexPattern).test(v);
  } catch {
    return v.includes(p.replace(/%/g, ""));
  }
}

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
        gt: (col: string, val: any) => {
          data = data.filter((item) => item[col] > val);
          return builder;
        },
        lt: (col: string, val: any) => {
          data = data.filter((item) => item[col] < val);
          return builder;
        },
        like: (col: string, pattern: string) => {
          data = data.filter((item) => matchLike(String(item[col] ?? ""), pattern, false));
          return builder;
        },
        ilike: (col: string, pattern: string) => {
          data = data.filter((item) => matchLike(String(item[col] ?? ""), pattern, true));
          return builder;
        },
        is: (col: string, val: any) => {
          if (val === null) {
            data = data.filter((item) => item[col] === null || item[col] === undefined);
          } else {
            data = data.filter((item) => item[col] === val);
          }
          return builder;
        },
        not: (col: string, op: string, val: any) => {
          if (op === "eq") {
            data = data.filter((item) => String(item[col]) !== String(val));
          } else if (op === "is" && val === null) {
            data = data.filter((item) => item[col] !== null && item[col] !== undefined);
          }
          return builder;
        },
        or: (_condition: string) => {
          return builder;
        },
        limit: (count: number) => {
          limitCount = count;
          return builder;
        },
        range: (from: number, to: number) => {
          data = data.slice(from, to + 1);
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
        insert: (newRows: any) => {
          const rows = Array.isArray(newRows) ? newRows : [newRows];
          const inserted = rows.map((r) => {
            const rowId = r.id || `mock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            return {
              id: rowId,
              created_at: new Date().toISOString(),
              ...r,
            };
          });
          if (!mockDb[table]) mockDb[table] = [];
          mockDb[table].unshift(...inserted);

          // Synchronize related views
          if (table === "products") {
            if (!mockDb.product_stock) mockDb.product_stock = [];
            for (const p of inserted) {
              mockDb.product_stock.unshift({
                product_id: p.id,
                name: p.name,
                sku: p.sku,
                unit: p.unit ?? "pcs",
                cost_price: Number(p.cost_price) || 0,
                sell_price: Number(p.sell_price) || 0,
                stock: Number(p.opening_stock) || 0,
                reorder_level: Number(p.reorder_level) || 0,
                active: p.active !== false,
              });
            }
          } else if (table === "customers") {
            if (!mockDb.customer_balances) mockDb.customer_balances = [];
            for (const c of inserted) {
              mockDb.customer_balances.unshift({
                customer_id: c.id,
                name: c.name,
                phone: c.phone,
                credit_limit: Number(c.credit_limit) || 0,
                current_balance: 0,
                total_sales: 0,
                total_paid: 0,
                active: c.active !== false,
              });
            }
          } else if (table === "suppliers") {
            if (!mockDb.supplier_balances) mockDb.supplier_balances = [];
            for (const s of inserted) {
              mockDb.supplier_balances.unshift({
                supplier_id: s.id,
                name: s.name,
                phone: s.phone,
                contact_person: s.contact_person,
                current_balance: Number(s.opening_balance) || 0,
                total_purchases: 0,
                total_paid: 0,
                active: s.active !== false,
              });
            }
          }

          const opResult: any = {
            data: inserted,
            error: null,
            select: (_cols = "*") => ({
              single: async () => ({ data: inserted[0] ?? null, error: null }),
              maybeSingle: async () => ({ data: inserted[0] ?? null, error: null }),
              then: (res: any) => Promise.resolve({ data: inserted, error: null }).then(res),
            }),
            single: async () => ({ data: inserted[0] ?? null, error: null }),
            maybeSingle: async () => ({ data: inserted[0] ?? null, error: null }),
            then: (res: any) => Promise.resolve({ data: inserted, error: null }).then(res),
          };
          return opResult;
        },
        update: (patch: any) => {
          return {
            eq: (col: string, val: any) => {
              if (mockDb[table]) {
                mockDb[table] = mockDb[table].map((item) => {
                  if (String(item[col]) === String(val)) {
                    return { ...item, ...patch, updated_at: new Date().toISOString() };
                  }
                  return item;
                });
              }
              const updatedItem = mockDb[table]?.find((i) => String(i[col]) === String(val));
              return {
                select: (_cols = "*") => ({
                  single: async () => ({ data: updatedItem ?? null, error: null }),
                  maybeSingle: async () => ({ data: updatedItem ?? null, error: null }),
                  then: (res: any) =>
                    Promise.resolve({ data: updatedItem ? [updatedItem] : [], error: null }).then(
                      res,
                    ),
                }),
                then: (res: any) => Promise.resolve({ data: null, error: null }).then(res),
              };
            },
          };
        },
        delete: () => ({
          eq: (col: string, val: any) => {
            if (mockDb[table]) {
              mockDb[table] = mockDb[table].filter((item) => String(item[col]) !== String(val));
            }
            return {
              then: (res: any) => Promise.resolve({ data: null, error: null }).then(res),
            };
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
          const transactions = mockDb.financial_transactions || [];
          const cashTotal = accounts.reduce((acc, a) => acc + (Number(a.balance) || 0), 0);
          const receivablesTotal = sales.reduce(
            (acc, s) => acc + (Number(s.remaining_balance) || 0),
            0,
          );
          const inventoryValue = (mockDb.product_stock || products).reduce(
            (acc, p) => acc + (Number(p.cost_price) || 0) * (Number(p.stock) || 0),
            0,
          );

          const expenses = transactions
            .filter((t) => t.kind === "expense")
            .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
          const income = transactions
            .filter((t) => t.kind === "income")
            .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

          return {
            data: {
              ...MOCK_FINANCIAL_SNAPSHOT,
              cash_balance: cashTotal,
              receivables: receivablesTotal,
              business_capital: cashTotal + inventoryValue + receivablesTotal,
              today: {
                ...MOCK_FINANCIAL_SNAPSHOT.today,
                sales: sales.reduce((acc, s) => acc + (Number(s.total) || 0), 0),
                collections: sales.reduce((acc, s) => acc + (Number(s.paid_amount) || 0), 0),
                business_expenses: expenses,
                other_income: income,
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
          const inventoryValue = (mockDb.product_stock || products).reduce(
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
              open_orders: orders.filter((o) => o.status === "pending" || o.status === "confirmed")
                .length,
              active_deliveries: deliveries.filter(
                (d) => d.status !== "delivered" && d.status !== "cancelled",
              ).length,
            },
            error: null,
          };
        }

        case "sales_smart_defaults":
          return {
            data: {
              most_sold_product_id: mockDb.products?.[0]?.id ?? null,
              most_used_payment_channel_id: "chan-evc",
              most_used_delivery_company_id: mockDb.delivery_companies?.[0]?.id ?? null,
              most_used_driver_id: mockDb.drivers?.[0]?.id ?? null,
              most_used_district_id: "loc-hodan",
              most_used_cargo_company_id: mockDb.cargo_companies?.[0]?.id ?? null,
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
          mockDb.purchases_overview = [];
          mockDb.purchase_items = [];
          mockDb.orders = [];
          mockDb.orders_overview = [];
          mockDb.order_items = [];
          mockDb.deliveries = [];
          mockDb.deliveries_overview = [];
          mockDb.delivery_events = [];
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
          const saleNo = args.sale_no || `S${String(nextIndex).padStart(5, "0")}`;
          const newId = `sale-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const total = Number(args.total) || 0;
          const paidAmount = Number(args.paid_amount) || 0;
          const remainingBalance = Math.max(0, total - paidAmount);

          const customer = (mockDb.customers || []).find((c) => c.id === args.customer_id);

          const newSale = {
            id: newId,
            sale_no: saleNo,
            sale_date: args.sale_date || new Date().toISOString().slice(0, 10),
            sale_time: args.sale_time || new Date().toTimeString().slice(0, 5),
            customer_id: args.customer_id,
            customer_name: customer?.name || args.customer_name || "Walk-in Customer",
            customer_phone: customer?.phone || args.customer_phone || null,
            customer_address: customer?.address || args.customer_address || null,
            subtotal: Number(args.subtotal) || total,
            discount: Number(args.discount) || 0,
            vat_rate: Number(args.vat_rate) || 0,
            vat_amount: Number(args.vat_amount) || 0,
            delivery_fee: Number(args.delivery_fee) || 0,
            cargo_fee: Number(args.cargo_fee) || 0,
            total,
            paid_amount: paidAmount,
            remaining_balance: remainingBalance,
            payment_method: args.payment_method || "evc_plus",
            payment_channel_id: args.payment_channel_id || null,
            bank_name: args.bank_name || null,
            payment_status: remainingBalance === 0 ? "paid" : paidAmount > 0 ? "partial" : "debt",
            fulfillment_type: args.fulfillment_type || "pickup",
            delivery_status: args.fulfillment_type === "delivery" ? "pending" : null,
            driver_name: args.driver_name || null,
            driver_phone: args.driver_phone || null,
            cashier_name: "Admin User",
            created_at: new Date().toISOString(),
          };

          if (!mockDb.sales) mockDb.sales = [];
          if (!mockDb.sales_overview) mockDb.sales_overview = [];
          mockDb.sales.unshift(newSale);
          mockDb.sales_overview.unshift(newSale);

          // Record sale items & update stock
          if (Array.isArray(args.items)) {
            if (!mockDb.sale_items) mockDb.sale_items = [];
            for (const it of args.items) {
              const product = (mockDb.products || []).find((p) => p.id === it.product_id);
              const qty = Number(it.quantity) || 1;
              mockDb.sale_items.push({
                id: `sitem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                sale_id: newId,
                product_id: it.product_id,
                quantity: qty,
                unit_price: Number(it.unit_price) || 0,
                unit_cost: Number(product?.cost_price) || 0,
                line_total: (Number(it.unit_price) || 0) * qty,
                products: product ? { name: product.name } : null,
              });

              // Deduct stock in product_stock
              if (mockDb.product_stock) {
                mockDb.product_stock = mockDb.product_stock.map((ps) => {
                  if (ps.product_id === it.product_id) {
                    return { ...ps, stock: Math.max(0, (Number(ps.stock) || 0) - qty) };
                  }
                  return ps;
                });
              }
            }
          }

          // Update customer balance if debt/partial
          if (remainingBalance > 0 && args.customer_id && mockDb.customer_balances) {
            mockDb.customer_balances = mockDb.customer_balances.map((cb) => {
              if (cb.customer_id === args.customer_id) {
                return {
                  ...cb,
                  current_balance: (Number(cb.current_balance) || 0) + remainingBalance,
                  total_sales: (Number(cb.total_sales) || 0) + total,
                  total_paid: (Number(cb.total_paid) || 0) + paidAmount,
                };
              }
              return cb;
            });
          }

          // Update payment account balance if paid
          if (paidAmount > 0 && mockDb.account_balances) {
            const accId = args.account_id || "acc-evc";
            mockDb.account_balances = mockDb.account_balances.map((ab) => {
              if (ab.account_id === accId) {
                return { ...ab, balance: (Number(ab.balance) || 0) + paidAmount };
              }
              return ab;
            });
          }

          return { data: newId, error: null };
        }

        case "update_sale": {
          if (mockDb.sales && args.sale_id) {
            mockDb.sales = mockDb.sales.map((s) => (s.id === args.sale_id ? { ...s, ...args } : s));
          }
          if (mockDb.sales_overview && args.sale_id) {
            mockDb.sales_overview = mockDb.sales_overview.map((s) =>
              s.id === args.sale_id ? { ...s, ...args } : s,
            );
          }
          return { data: null, error: null };
        }

        case "reverse_sale": {
          if (mockDb.sales && args.sale_id) {
            mockDb.sales = mockDb.sales.map((s) =>
              s.id === args.sale_id
                ? { ...s, payment_status: "reversed", notes: args.reason || "Reversed" }
                : s,
            );
          }
          if (mockDb.sales_overview && args.sale_id) {
            mockDb.sales_overview = mockDb.sales_overview.filter((s) => s.id !== args.sale_id);
          }
          return { data: null, error: null };
        }

        case "set_sale_extras": {
          if (mockDb.sales && args.sale_id) {
            mockDb.sales = mockDb.sales.map((s) => (s.id === args.sale_id ? { ...s, ...args } : s));
          }
          return { data: null, error: null };
        }

        case "record_collection": {
          const collId = `coll-${Date.now()}`;
          const amount = Number(args.amount) || 0;
          if (args.sale_id && mockDb.sales) {
            mockDb.sales = mockDb.sales.map((s) => {
              if (s.id === args.sale_id) {
                const newRem = Math.max(0, (Number(s.remaining_balance) || 0) - amount);
                return {
                  ...s,
                  paid_amount: (Number(s.paid_amount) || 0) + amount,
                  remaining_balance: newRem,
                  payment_status: newRem === 0 ? "paid" : "partial",
                };
              }
              return s;
            });
          }
          if (args.customer_id && mockDb.customer_balances) {
            mockDb.customer_balances = mockDb.customer_balances.map((cb) => {
              if (cb.customer_id === args.customer_id) {
                return {
                  ...cb,
                  current_balance: Math.max(0, (Number(cb.current_balance) || 0) - amount),
                  total_paid: (Number(cb.total_paid) || 0) + amount,
                };
              }
              return cb;
            });
          }
          return { data: collId, error: null };
        }

        case "create_sale_return": {
          const retId = `sret-${Date.now()}`;
          return { data: retId, error: null };
        }

        case "create_account_transfer": {
          const transId = `trans-${Date.now()}`;
          const amount = Number(args.amount) || 0;
          if (mockDb.account_balances) {
            mockDb.account_balances = mockDb.account_balances.map((ab) => {
              if (ab.account_id === args.from_account_id) {
                return { ...ab, balance: (Number(ab.balance) || 0) - amount };
              }
              if (ab.account_id === args.to_account_id) {
                return { ...ab, balance: (Number(ab.balance) || 0) + amount };
              }
              return ab;
            });
          }
          return { data: transId, error: null };
        }

        case "customer_statement": {
          const sales = (mockDb.sales_overview || []).filter(
            (s) => s.customer_id === args.customer_id,
          );
          const entries = sales.map((s) => ({
            entry_date: s.sale_date,
            kind: "sale",
            reference: s.sale_no,
            debit: Number(s.total) || 0,
            credit: Number(s.paid_amount) || 0,
            balance: Number(s.remaining_balance) || 0,
            note: `Sale ${s.sale_no}`,
          }));
          return { data: entries, error: null };
        }

        case "sale_statement": {
          const found = (mockDb.sales_overview || []).find(
            (s) => s.id === args._sale_id || s.sale_no === args._sale_id,
          );
          const items = (mockDb.sale_items || []).filter(
            (i) => i.sale_id === (found?.id ?? args._sale_id),
          );
          return {
            data: {
              sale: found || mockDb.sales_overview?.[0] || null,
              items: items.length > 0 ? items : mockDb.sale_items || [],
              payments: [],
              deliveries: [],
              events: [],
            },
            error: null,
          };
        }

        case "create_purchase": {
          const purId = `pur-${Date.now()}`;
          const total = Number(args.total) || 0;
          const newPur = {
            id: purId,
            purchase_date: args.purchase_date || new Date().toISOString().slice(0, 10),
            supplier_id: args.supplier_id,
            invoice_no: args.invoice_no || `INV-${Date.now().toString().slice(-4)}`,
            total,
            paid_amount: Number(args.paid_amount) || 0,
            remaining_balance: Math.max(0, total - (Number(args.paid_amount) || 0)),
            status: "received",
            notes: args.notes || null,
            created_at: new Date().toISOString(),
          };
          if (!mockDb.purchases) mockDb.purchases = [];
          if (!mockDb.purchases_overview) mockDb.purchases_overview = [];
          mockDb.purchases.unshift(newPur);
          mockDb.purchases_overview.unshift(newPur);
          return { data: purId, error: null };
        }

        case "create_purchase_return": {
          return { data: `pret-${Date.now()}`, error: null };
        }

        case "record_supplier_payment": {
          return { data: `spay-${Date.now()}`, error: null };
        }

        case "record_expense": {
          const expId = `exp-${Date.now()}`;
          const amount = Number(args.amount) || 0;
          if (!mockDb.financial_transactions) mockDb.financial_transactions = [];
          mockDb.financial_transactions.unshift({
            id: expId,
            transaction_date: args.expense_date || new Date().toISOString().slice(0, 10),
            kind: "expense",
            category: args.category || "General",
            amount,
            reference: args.reference || null,
            note: args.note || null,
            is_personal: args.is_personal ?? false,
          });
          if (mockDb.account_balances && args.account_id) {
            mockDb.account_balances = mockDb.account_balances.map((ab) => {
              if (ab.account_id === args.account_id) {
                return { ...ab, balance: (Number(ab.balance) || 0) - amount };
              }
              return ab;
            });
          }
          return { data: expId, error: null };
        }

        case "record_income": {
          const incId = `inc-${Date.now()}`;
          const amount = Number(args.amount) || 0;
          if (!mockDb.financial_transactions) mockDb.financial_transactions = [];
          mockDb.financial_transactions.unshift({
            id: incId,
            transaction_date: args.income_date || new Date().toISOString().slice(0, 10),
            kind: "income",
            category: args.source || "Other Income",
            amount,
            reference: args.reference || null,
            note: args.note || null,
            is_guaranteed: args.is_guaranteed ?? false,
          });
          if (mockDb.account_balances && args.account_id) {
            mockDb.account_balances = mockDb.account_balances.map((ab) => {
              if (ab.account_id === args.account_id) {
                return { ...ab, balance: (Number(ab.balance) || 0) + amount };
              }
              return ab;
            });
          }
          return { data: incId, error: null };
        }

        case "void_financial_transaction": {
          if (mockDb.financial_transactions && args.transaction_id) {
            mockDb.financial_transactions = mockDb.financial_transactions.filter(
              (t) => t.id !== args.transaction_id,
            );
          }
          return { data: null, error: null };
        }

        case "record_fulfillment_event": {
          const eventId = `fev-${Date.now()}`;
          if (!mockDb.delivery_events) mockDb.delivery_events = [];
          mockDb.delivery_events.unshift({
            id: eventId,
            delivery_id: args.delivery_id,
            event_type: args.event_type,
            driver_id: args.driver_id,
            amount_collected: args.amount_collected ?? 0,
            note: args.note ?? null,
            created_at: new Date().toISOString(),
          });
          return { data: eventId, error: null };
        }

        case "create_order": {
          const ordId = `ord-${Date.now()}`;
          const nextNo = `ORD-${String((mockDb.orders?.length ?? 0) + 1).padStart(4, "0")}`;
          const newOrder = {
            id: ordId,
            order_no: nextNo,
            order_date: args._order_date || new Date().toISOString().slice(0, 10),
            customer_id: args._customer_id,
            status: "pending",
            fulfillment: args._fulfillment || "delivery",
            delivery_fee: Number(args._delivery_fee) || 0,
            address: args._address || null,
            note: args._note || null,
            created_at: new Date().toISOString(),
          };
          if (!mockDb.orders) mockDb.orders = [];
          if (!mockDb.orders_overview) mockDb.orders_overview = [];
          mockDb.orders.unshift(newOrder);
          mockDb.orders_overview.unshift(newOrder);
          return { data: ordId, error: null };
        }

        case "cancel_order": {
          if (mockDb.orders && args._order_id) {
            mockDb.orders = mockDb.orders.map((o) =>
              o.id === args._order_id ? { ...o, status: "cancelled" } : o,
            );
          }
          if (mockDb.orders_overview && args._order_id) {
            mockDb.orders_overview = mockDb.orders_overview.map((o) =>
              o.id === args._order_id ? { ...o, status: "cancelled" } : o,
            );
          }
          return { data: null, error: null };
        }

        case "convert_order_to_sale": {
          const saleId = `sale-${Date.now()}`;
          if (mockDb.orders && args._order_id) {
            mockDb.orders = mockDb.orders.map((o) =>
              o.id === args._order_id ? { ...o, status: "converted", sale_id: saleId } : o,
            );
          }
          return { data: saleId, error: null };
        }

        case "create_delivery": {
          const delId = `del-${Date.now()}`;
          const newDel = {
            id: delId,
            order_id: args.order_id || null,
            sale_id: args.sale_id || null,
            driver_id: args.driver_id || null,
            zone_id: args.zone_id || null,
            cargo_company_id: args.cargo_company_id || null,
            fee: Number(args.fee) || 0,
            cod_amount: Number(args.cod_amount) || 0,
            recipient_name: args.recipient_name || null,
            recipient_phone: args.recipient_phone || null,
            address: args.address || null,
            note: args.note || null,
            status: "pending",
            created_at: new Date().toISOString(),
          };
          if (!mockDb.deliveries) mockDb.deliveries = [];
          if (!mockDb.deliveries_overview) mockDb.deliveries_overview = [];
          mockDb.deliveries.unshift(newDel);
          mockDb.deliveries_overview.unshift(newDel);
          return { data: delId, error: null };
        }

        case "update_delivery_status": {
          if (mockDb.deliveries && args._delivery_id) {
            mockDb.deliveries = mockDb.deliveries.map((d) =>
              d.id === args._delivery_id
                ? { ...d, status: args._status, driver_id: args._driver_id || d.driver_id }
                : d,
            );
          }
          return { data: null, error: null };
        }

        case "record_driver_handover": {
          const handId = `hand-${Date.now()}`;
          return { data: handId, error: null };
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
