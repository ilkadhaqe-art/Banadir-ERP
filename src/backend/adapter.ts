/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDatabase, SqlDatabase } from "./db/database";
import { createSale, voidSale, recordCustomerPayment } from "./services/sales.service";
import { createPurchase, voidPurchase } from "./services/purchases.service";
import {
  getBusinessOverview,
  getFinancialSnapshot,
  recordExpense,
  recordIncome,
  createAccountTransfer,
} from "./services/financial.service";
import { adjustStock } from "./services/inventory.service";
import {
  assignDriver,
  updateDeliveryStatus,
  recordDriverHandover,
} from "./services/logistics.service";

function resolveSqlBaseQuery(table: string): { baseSql: string; primaryKey: string } {
  switch (table) {
    case "product_stock":
    case "products":
      return {
        baseSql: `SELECT id, id as product_id, sku, name, category_id, brand_id, unit, cost_price, sell_price, stock, reorder_level, barcode, image_url, active, created_at, updated_at FROM products`,
        primaryKey: "id",
      };
    case "sales_overview":
    case "sales":
      return {
        baseSql: `SELECT s.*, COALESCE(s.customer_name, c.name) as customer_name, COALESCE(s.customer_phone, c.phone) as customer_phone FROM sales s LEFT JOIN customers c ON s.customer_id = c.id`,
        primaryKey: "id",
      };
    case "customer_balances":
    case "customers":
      return {
        baseSql: `SELECT id, id as customer_id, name, phone, email, address, credit_limit, current_balance, total_sales, total_paid, active, created_at, updated_at FROM customers`,
        primaryKey: "id",
      };
    case "supplier_balances":
    case "suppliers":
      return {
        baseSql: `SELECT id, id as supplier_id, name, contact_person, phone, email, address, opening_balance, current_balance, total_purchases, total_paid, notes, active, created_at, updated_at FROM suppliers`,
        primaryKey: "id",
      };
    case "purchases_overview":
    case "purchases":
      return {
        baseSql: `SELECT p.*, s.name as supplier_name, s.phone as supplier_phone FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id`,
        primaryKey: "id",
      };
    case "orders_overview":
    case "orders":
      return {
        baseSql: `SELECT o.*, COALESCE(o.customer_name, c.name) as customer_name, COALESCE(o.customer_phone, c.phone) as customer_phone FROM orders o LEFT JOIN customers c ON o.customer_id = c.id`,
        primaryKey: "id",
      };
    case "deliveries_overview":
    case "deliveries":
      return {
        baseSql: `SELECT d.*, s.sale_no, s.total as sale_total, s.remaining_balance as sale_balance, drv.name as driver_name, drv.phone as driver_phone, dz.name as zone_name, dc.name as delivery_company_name, cc.name as cargo_company_name FROM deliveries d LEFT JOIN sales s ON d.sale_id = s.id LEFT JOIN drivers drv ON d.driver_id = drv.id LEFT JOIN delivery_zones dz ON d.zone_id = dz.id LEFT JOIN delivery_companies dc ON d.delivery_company_id = dc.id LEFT JOIN cargo_companies cc ON d.cargo_company_id = cc.id`,
        primaryKey: "id",
      };
    case "account_balances":
    case "account_balances_report":
    case "payment_accounts":
      return {
        baseSql: `SELECT id, id as account_id, name, kind, scope, account_number, balance, active, created_at, updated_at FROM payment_accounts`,
        primaryKey: "id",
      };
    case "daily_financial_states":
      return {
        baseSql: `SELECT * FROM daily_financial_states`,
        primaryKey: "day",
      };
    case "financial_rules":
      return {
        baseSql: `SELECT * FROM financial_rules`,
        primaryKey: "id",
      };
    case "financial_transactions":
      return {
        baseSql: `SELECT ft.*, pa.name as account_name FROM financial_transactions ft LEFT JOIN payment_accounts pa ON ft.account_id = pa.id`,
        primaryKey: "id",
      };
    case "inventory_movements":
      return {
        baseSql: `SELECT im.*, p.name as product_name, p.sku as product_sku FROM inventory_movements im LEFT JOIN products p ON im.product_id = p.id`,
        primaryKey: "id",
      };
    case "product_categories":
      return { baseSql: "SELECT * FROM product_categories", primaryKey: "id" };
    case "product_brands":
      return { baseSql: "SELECT * FROM product_brands", primaryKey: "id" };
    case "locations":
      return { baseSql: "SELECT * FROM locations", primaryKey: "id" };
    case "delivery_zones":
      return { baseSql: "SELECT * FROM delivery_zones", primaryKey: "id" };
    case "delivery_companies":
      return { baseSql: "SELECT * FROM delivery_companies", primaryKey: "id" };
    case "cargo_companies":
      return { baseSql: "SELECT * FROM cargo_companies", primaryKey: "id" };
    case "drivers":
      return { baseSql: "SELECT * FROM drivers", primaryKey: "id" };
    case "payment_channels":
      return { baseSql: "SELECT * FROM payment_channels", primaryKey: "id" };
    case "app_settings":
      return { baseSql: "SELECT * FROM app_settings", primaryKey: "key" };
    case "user_roles":
      return { baseSql: "SELECT * FROM user_roles", primaryKey: "id" };
    case "profiles":
      return { baseSql: "SELECT * FROM profiles", primaryKey: "id" };
    default:
      return { baseSql: `SELECT * FROM ${table}`, primaryKey: "id" };
  }
}

export function createSqlSupabaseAdapter(db: SqlDatabase) {
  return {
    from: (table: string) => {
      const { baseSql } = resolveSqlBaseQuery(table);
      const realTable =
        table === "product_stock"
          ? "products"
          : table === "sales_overview"
            ? "sales"
            : table === "customer_balances"
              ? "customers"
              : table === "supplier_balances"
                ? "suppliers"
                : table === "purchases_overview"
                  ? "purchases"
                  : table === "orders_overview"
                    ? "orders"
                    : table === "deliveries_overview"
                      ? "deliveries"
                      : table === "account_balances" || table === "account_balances_report"
                        ? "payment_accounts"
                        : table;

      const whereClauses: string[] = [];
      const queryParams: any[] = [];
      let orderClause = "";
      let limitCount: number | null = null;
      let offsetCount: number | null = null;

      const executeQuery = () => {
        let sql = `SELECT * FROM (${baseSql}) as t`;
        if (whereClauses.length > 0) {
          sql += ` WHERE ${whereClauses.join(" AND ")}`;
        }
        if (orderClause) {
          sql += ` ${orderClause}`;
        }
        if (limitCount !== null) {
          sql += ` LIMIT ${limitCount}`;
          if (offsetCount !== null) {
            sql += ` OFFSET ${offsetCount}`;
          }
        }
        return db.query(sql, queryParams);
      };

      const builder: any = {
        select: (_cols = "*") => builder,
        order: (col: string, options?: { ascending?: boolean }) => {
          const asc = options?.ascending !== false ? "ASC" : "DESC";
          orderClause = `ORDER BY t.${col} ${asc}`;
          return builder;
        },
        eq: (col: string, val: any) => {
          whereClauses.push(`t.${col} = ?`);
          queryParams.push(val);
          return builder;
        },
        neq: (col: string, val: any) => {
          whereClauses.push(`t.${col} != ?`);
          queryParams.push(val);
          return builder;
        },
        in: (col: string, vals: any[]) => {
          if (!vals || vals.length === 0) {
            whereClauses.push("1=0");
          } else {
            const placeholders = vals.map(() => "?").join(",");
            whereClauses.push(`t.${col} IN (${placeholders})`);
            queryParams.push(...vals);
          }
          return builder;
        },
        gte: (col: string, val: any) => {
          whereClauses.push(`t.${col} >= ?`);
          queryParams.push(val);
          return builder;
        },
        lte: (col: string, val: any) => {
          whereClauses.push(`t.${col} <= ?`);
          queryParams.push(val);
          return builder;
        },
        gt: (col: string, val: any) => {
          whereClauses.push(`t.${col} > ?`);
          queryParams.push(val);
          return builder;
        },
        lt: (col: string, val: any) => {
          whereClauses.push(`t.${col} < ?`);
          queryParams.push(val);
          return builder;
        },
        like: (col: string, pattern: string) => {
          whereClauses.push(`t.${col} LIKE ?`);
          queryParams.push(pattern);
          return builder;
        },
        ilike: (col: string, pattern: string) => {
          whereClauses.push(`LOWER(t.${col}) LIKE LOWER(?)`);
          queryParams.push(pattern);
          return builder;
        },
        is: (col: string, val: any) => {
          if (val === null) {
            whereClauses.push(`t.${col} IS NULL`);
          } else {
            whereClauses.push(`t.${col} = ?`);
            queryParams.push(val);
          }
          return builder;
        },
        not: (col: string, op: string, val: any) => {
          if (op === "eq") {
            whereClauses.push(`t.${col} != ?`);
            queryParams.push(val);
          } else if (op === "is" && val === null) {
            whereClauses.push(`t.${col} IS NOT NULL`);
          }
          return builder;
        },
        or: (_condition: string) => builder,
        limit: (count: number) => {
          limitCount = count;
          return builder;
        },
        range: (from: number, to: number) => {
          limitCount = to - from + 1;
          offsetCount = from;
          return builder;
        },
        maybeSingle: async () => {
          limitCount = 1;
          const rows = executeQuery();
          return { data: rows[0] ?? null, error: null };
        },
        single: async () => {
          limitCount = 1;
          const rows = executeQuery();
          return { data: rows[0] ?? null, error: null };
        },
        then: (resolve: (res: { data: any[]; error: null }) => void) => {
          const rows = executeQuery();
          return Promise.resolve({ data: rows, error: null }).then(resolve);
        },

        insert: (newRows: any) => {
          const rows = Array.isArray(newRows) ? newRows : [newRows];
          const insertedResults: any[] = [];

          db.transaction(() => {
            for (const r of rows) {
              const rowId =
                r.id ||
                `${realTable.slice(0, 4)}-${Math.random().toString(36).substring(2, 9)}-${Date.now()}`;
              const rowWithId = { id: rowId, ...r };

              // Remove virtual or joined fields if present
              const cleanRow: Record<string, any> = {};
              for (const [k, v] of Object.entries(rowWithId)) {
                if (
                  k.endsWith("_name") &&
                  k !== "customer_name" &&
                  k !== "driver_name" &&
                  k !== "cashier_name"
                )
                  continue;
                if (k.endsWith("_phone") && k !== "customer_phone" && k !== "driver_phone")
                  continue;
                cleanRow[k] = v;
              }

              const cols = Object.keys(cleanRow);
              const vals = Object.values(cleanRow);
              const placeholders = cols.map(() => "?").join(",");

              db.run(
                `INSERT INTO ${realTable} (${cols.join(",")}) VALUES (${placeholders})`,
                vals as any[],
              );

              insertedResults.push(rowWithId);
            }
          });

          const resultPayload = {
            data: insertedResults,
            error: null,
            select: (_cols = "*") => ({
              single: async () => ({ data: insertedResults[0] ?? null, error: null }),
              maybeSingle: async () => ({ data: insertedResults[0] ?? null, error: null }),
              then: (res: any) => Promise.resolve({ data: insertedResults, error: null }).then(res),
            }),
            single: async () => ({ data: insertedResults[0] ?? null, error: null }),
            maybeSingle: async () => ({ data: insertedResults[0] ?? null, error: null }),
            then: (res: any) => Promise.resolve({ data: insertedResults, error: null }).then(res),
          };
          return resultPayload;
        },

        update: (patch: Record<string, any>) => {
          return {
            eq: (col: string, val: any) => {
              const cleanPatch: Record<string, any> = {};
              for (const [k, v] of Object.entries(patch)) {
                if (k.endsWith("_name") && k !== "customer_name" && k !== "driver_name") continue;
                cleanPatch[k] = v;
              }

              const cols = Object.keys(cleanPatch);
              const vals = Object.values(cleanPatch);
              const setAssignments = cols.map((c) => `${c} = ?`).join(", ");

              db.run(`UPDATE ${realTable} SET ${setAssignments} WHERE ${col} = ?`, [
                ...vals,
                val,
              ] as any[]);

              const updatedItem = db.get<Record<string, any>>(
                `SELECT * FROM ${realTable} WHERE ${col} = ?`,
                [val],
              );

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
            db.run(`DELETE FROM ${realTable} WHERE ${col} = ?`, [val]);
            return {
              then: (res: any) => Promise.resolve({ data: null, error: null }).then(res),
            };
          },
        }),
      };

      return builder;
    },

    rpc: async (fn: string, args: Record<string, any> = {}) => {
      try {
        switch (fn) {
          case "financial_snapshot": {
            const data = await getFinancialSnapshot();
            return {
              data: {
                cash_balance: data.cash_in_accounts,
                receivables: data.customer_receivables,
                supplier_payables: data.supplier_payables,
                stock_value: data.inventory_asset_value,
                business_capital: data.net_worth,
                today: {
                  sales: data.customer_receivables,
                  collections: data.cash_in_accounts,
                  business_expenses: data.total_expenses,
                  other_income: 0,
                },
              },
              error: null,
            };
          }

          case "business_overview": {
            const ov = await getBusinessOverview(args._from, args._to);
            const openOrdersCount =
              db.get<{ count: number }>(
                "SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'confirmed')",
              )?.count || 0;
            const activeDelivCount =
              db.get<{ count: number }>(
                "SELECT COUNT(*) as count FROM deliveries WHERE status NOT IN ('delivered', 'cancelled')",
              )?.count || 0;

            return {
              data: {
                sales: ov.total_sales,
                collections: ov.total_paid,
                receivables: ov.total_debt,
                sales_count: ov.sales_count,
                stock_value: ov.gross_profit,
                open_orders: openOrdersCount,
                active_deliveries: activeDelivCount,
              },
              error: null,
            };
          }

          case "sales_smart_defaults": {
            const topProduct = db.get<{ product_id: string }>(
              `SELECT product_id, COUNT(*) as c FROM sale_items GROUP BY product_id ORDER BY c DESC LIMIT 1`,
            );
            const topDriver = db.get<{ driver_id: string }>(
              `SELECT driver_id, COUNT(*) as c FROM deliveries WHERE driver_id IS NOT NULL GROUP BY driver_id ORDER BY c DESC LIMIT 1`,
            );
            return {
              data: {
                most_sold_product_id: topProduct?.product_id || "prod-sam-a55",
                most_used_payment_channel_id: "chan-evc",
                most_used_delivery_company_id: "deliv-banadir",
                most_used_driver_id: topDriver?.driver_id || "driver-guuleed",
                most_used_district_id: "loc-hodan",
                most_used_cargo_company_id: "cargo-buraaq",
                most_used_region_id: "loc-hargeisa",
              },
              error: null,
            };
          }

          case "lookup_delivery_rate": {
            const zone = db.get<{ fee: number }>(
              "SELECT fee FROM delivery_zones WHERE id = ? OR name = ?",
              [args.district_id || args.zone_id, args.district_name || ""],
            );
            return { data: zone?.fee || 2.5, error: null };
          }

          case "lookup_cargo_rate": {
            const rate = db.get<{ rate: number }>(
              "SELECT rate FROM cargo_rates WHERE company_id = ? AND region_id = ?",
              [args.cargo_company_id, args.region_id],
            );
            return { data: rate?.rate || 15.0, error: null };
          }

          case "create_sale": {
            const sale = await createSale({
              customerId: args.customer_id,
              customerName: args.customer_name,
              customerPhone: args.customer_phone,
              customerAddress: args.customer_address,
              items: args.items || [],
              discount: Number(args.discount) || 0,
              vatRate: Number(args.vat_rate) || 0,
              deliveryFee: Number(args.delivery_fee) || 0,
              cargoFee: Number(args.cargo_fee) || 0,
              paidAmount: args.paid_amount !== undefined ? Number(args.paid_amount) : undefined,
              paymentMethod: args.payment_method || "cash",
              paymentChannelId: args.payment_channel_id,
              accountId: args.account_id,
              fulfillmentType: args.fulfillment_type || "pickup",
              driverId: args.driver_id,
              deliveryCompanyId: args.delivery_company_id,
              cargoCompanyId: args.cargo_company_id,
              notes: args.notes,
              createdBy: args.created_by,
            });
            return { data: sale, error: null };
          }

          case "void_sale":
          case "reverse_sale": {
            const res = await voidSale(
              args.sale_id,
              args.reason || "Reversed by user",
              args.user_id,
            );
            return { data: res, error: null };
          }

          case "record_customer_payment": {
            const res = await recordCustomerPayment(
              args.customer_id,
              Number(args.amount),
              args.payment_method || "cash",
              args.account_id,
              args.sale_id,
              args.note,
              args.user_id,
            );
            return { data: res, error: null };
          }

          case "create_account_transfer": {
            const res = await createAccountTransfer({
              fromAccountId: args.from_account_id,
              toAccountId: args.to_account_id,
              amount: Number(args.amount),
              note: args.note,
              createdBy: args.user_id,
            });
            return { data: res, error: null };
          }

          case "record_expense": {
            const res = await recordExpense({
              amount: Number(args.amount),
              category: args.category,
              accountId: args.account_id,
              note: args.note,
              isPersonal: Boolean(args.is_personal),
              createdBy: args.user_id,
            });
            return { data: res, error: null };
          }

          case "record_income": {
            const res = await recordIncome({
              amount: Number(args.amount),
              category: args.category,
              accountId: args.account_id,
              note: args.note,
              isPersonal: Boolean(args.is_personal),
              createdBy: args.user_id,
            });
            return { data: res, error: null };
          }

          case "adjust_stock": {
            const res = await adjustStock(
              args.product_id,
              Number(args.new_stock),
              args.reason,
              args.user_id,
            );
            return { data: res, error: null };
          }

          case "assign_driver": {
            const res = await assignDriver(args.delivery_id, args.driver_id, args.user_id);
            return { data: res, error: null };
          }

          case "update_delivery_status": {
            const res = await updateDeliveryStatus(
              args.delivery_id,
              args.status,
              args.note,
              args.collected_amount ? Number(args.collected_amount) : undefined,
              args.user_id,
            );
            return { data: res, error: null };
          }

          case "driver_handover": {
            const res = await recordDriverHandover({
              driverId: args.driver_id,
              amount: Number(args.amount),
              accountId: args.account_id,
              notes: args.notes,
              userId: args.user_id,
            });
            return { data: res, error: null };
          }

          default:
            return { data: null, error: `Unknown RPC function: ${fn}` };
        }
      } catch (err: any) {
        console.error(`RPC Error [${fn}]:`, err);
        return { data: null, error: err.message || "Internal database error" };
      }
    },
  };
}
