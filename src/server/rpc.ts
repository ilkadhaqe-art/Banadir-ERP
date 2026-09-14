/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDb, initDb } from "./db";
import * as inventoryEngine from "./engines/inventory-engine";
import * as financialEngine from "./engines/financial-engine";
import * as salesEngine from "./engines/sales-engine";
import * as orderEngine from "./engines/order-engine";
import * as logisticsEngine from "./engines/logistics-engine";
import * as procurementEngine from "./engines/procurement-engine";
import * as accountingEngine from "./engines/accounting-engine";

export async function handleRpc(fnName: string, args: any = {}): Promise<any> {
  await initDb();
  const db = getDb();

  switch (fnName) {
    // ----------------------------------------------------
    // SALES & REVENUE
    // ----------------------------------------------------
    case "listSales":
    case "sales_overview": {
      const limit = args.limit ?? 100;
      let sql = "SELECT * FROM sales WHERE 1=1";
      const params: any[] = [];
      if (args.customer_id) {
        sql += " AND customer_id = ?";
        params.push(args.customer_id);
      }
      if (args.payment_status) {
        sql += " AND payment_status = ?";
        params.push(args.payment_status);
      }
      if (args.from) {
        sql += " AND sale_date >= ?";
        params.push(args.from);
      }
      if (args.to) {
        sql += " AND sale_date <= ?";
        params.push(args.to);
      }
      sql += " ORDER BY sale_date DESC, created_at DESC LIMIT ?";
      params.push(limit);

      const rs = await db.execute({ sql, args: params });
      return rs.rows;
    }

    case "getSale": {
      const saleRs = await db.execute({
        sql: "SELECT * FROM sales WHERE id = ? OR sale_no = ?",
        args: [args.id, args.id],
      });
      if (saleRs.rows.length === 0) return null;
      const sale = saleRs.rows[0];

      const itemsRs = await db.execute({
        sql: "SELECT * FROM sale_items WHERE sale_id = ?",
        args: [sale["id"]],
      });

      return {
        ...sale,
        items: itemsRs.rows,
      };
    }

    case "createSale":
    case "create_sale": {
      return await salesEngine.createSale(db, args);
    }

    case "reverseSale":
    case "reverse_sale": {
      return await salesEngine.reverseSale(db, args.sale_id, args.created_by);
    }

    case "nextSaleNumber":
    case "next_sale_number": {
      return await salesEngine.nextSaleNumber(db);
    }

    case "recordCollection":
    case "record_collection": {
      return await salesEngine.recordCollection(db, args);
    }

    // ----------------------------------------------------
    // ORDERS
    // ----------------------------------------------------
    case "listOrders":
    case "orders_overview": {
      let sql = "SELECT * FROM orders WHERE 1=1";
      const params: any[] = [];
      if (args.status) {
        sql += " AND status = ?";
        params.push(args.status);
      }
      if (args.customer_id) {
        sql += " AND customer_id = ?";
        params.push(args.customer_id);
      }
      sql += " ORDER BY order_date DESC, created_at DESC LIMIT ?";
      params.push(args.limit ?? 100);

      const rs = await db.execute({ sql, args: params });
      return rs.rows;
    }

    case "getOrder": {
      const oRs = await db.execute({
        sql: "SELECT * FROM orders WHERE id = ? OR order_no = ?",
        args: [args.id, args.id],
      });
      if (oRs.rows.length === 0) return null;
      const order = oRs.rows[0];

      const itemsRs = await db.execute({
        sql: "SELECT * FROM order_items WHERE order_id = ?",
        args: [order["id"]],
      });

      return {
        ...order,
        items: itemsRs.rows,
      };
    }

    case "createOrder":
    case "create_order": {
      return await orderEngine.createOrder(db, args);
    }

    case "convertOrderToSale":
    case "convert_order_to_sale": {
      return await orderEngine.convertOrderToSale(db, args);
    }

    case "cancelOrder":
    case "cancel_order": {
      return await orderEngine.cancelOrder(db, args.order_id);
    }

    case "nextOrderNumber":
    case "next_order_number": {
      return await orderEngine.nextOrderNumber(db);
    }

    // ----------------------------------------------------
    // DELIVERIES & LOGISTICS
    // ----------------------------------------------------
    case "listDeliveries":
    case "deliveries_overview": {
      let sql = "SELECT * FROM deliveries WHERE 1=1";
      const params: any[] = [];
      if (args.status) {
        sql += " AND status = ?";
        params.push(args.status);
      }
      if (args.driver_id) {
        sql += " AND driver_id = ?";
        params.push(args.driver_id);
      }
      sql += " ORDER BY created_at DESC LIMIT ?";
      params.push(args.limit ?? 100);

      const rs = await db.execute({ sql, args: params });
      return rs.rows;
    }

    case "getDelivery": {
      const rs = await db.execute({
        sql: "SELECT * FROM deliveries WHERE id = ? OR delivery_no = ?",
        args: [args.id, args.id],
      });
      return rs.rows[0] ?? null;
    }

    case "createDelivery":
    case "create_delivery": {
      return await logisticsEngine.createDelivery(db, args);
    }

    case "updateDeliveryStatus":
    case "update_delivery_status": {
      return await logisticsEngine.updateDeliveryStatus(db, args);
    }

    case "nextDeliveryNumber":
    case "next_delivery_number": {
      return await logisticsEngine.nextDeliveryNumber(db);
    }

    case "lookupDeliveryRate":
    case "lookup_delivery_rate": {
      return await logisticsEngine.lookupDeliveryRate(db, args.zone_id, args.company_id);
    }

    case "lookupCargoRate":
    case "lookup_cargo_rate": {
      return await logisticsEngine.lookupCargoRate(db, args.company_id, args.destination);
    }

    case "listDrivers": {
      const rs = await db.execute("SELECT * FROM drivers WHERE active = 1 ORDER BY name ASC");
      return rs.rows;
    }

    case "saveDriver": {
      const id = args.id || `drv-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO drivers (id, name, phone, vehicle_type, vehicle_plate, license_number, commission_rate, notes, active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
              ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                phone = excluded.phone,
                vehicle_type = excluded.vehicle_type,
                vehicle_plate = excluded.vehicle_plate,
                license_number = excluded.license_number,
                commission_rate = excluded.commission_rate,
                notes = excluded.notes,
                updated_at = datetime('now')`,
        args: [
          id,
          args.name,
          args.phone,
          args.vehicle_type ?? "Motorcycle",
          args.vehicle_plate ?? null,
          args.license_number ?? null,
          args.commission_rate ?? 0,
          args.notes ?? null,
        ],
      });
      return { id };
    }

    case "recordDriverHandover":
    case "record_driver_handover": {
      return await logisticsEngine.recordDriverHandover(db, args);
    }

    case "driverBalances":
    case "driver_balances": {
      const rs = await db.execute(`
        SELECT 
          d.id as driver_id,
          d.name as driver_name,
          d.phone,
          COALESCE(SUM(del.cod_collected), 0) as total_collected,
          COALESCE((SELECT SUM(amount) FROM driver_handovers WHERE driver_id = d.id), 0) as total_handed_over,
          (COALESCE(SUM(del.cod_collected), 0) - COALESCE((SELECT SUM(amount) FROM driver_handovers WHERE driver_id = d.id), 0)) as pending_cash,
          COUNT(del.id) as assigned_deliveries,
          SUM(CASE WHEN del.status = 'delivered' THEN 1 ELSE 0 END) as completed_deliveries
        FROM drivers d
        LEFT JOIN deliveries del ON del.driver_id = d.id
        WHERE d.active = 1
        GROUP BY d.id
      `);
      return rs.rows;
    }

    // ----------------------------------------------------
    // CATALOG & INVENTORY
    // ----------------------------------------------------
    case "listProducts":
    case "product_stock": {
      const rs = await db.execute(`
        SELECT p.*, c.name as category_name, b.name as brand_name
        FROM products p
        LEFT JOIN product_categories c ON c.id = p.category_id
        LEFT JOIN product_brands b ON b.id = p.brand_id
        WHERE p.is_active = 1
        ORDER BY p.name ASC
      `);
      return rs.rows;
    }

    case "getProduct": {
      const rs = await db.execute({
        sql: `SELECT p.*, c.name as category_name, b.name as brand_name
              FROM products p
              LEFT JOIN product_categories c ON c.id = p.category_id
              LEFT JOIN product_brands b ON b.id = p.brand_id
              WHERE p.id = ?`,
        args: [args.id],
      });
      return rs.rows[0] ?? null;
    }

    case "saveProduct": {
      const id = args.id || `prod-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO products (
          id, name, sku, barcode, description, category_id, brand_id,
          cost_price, selling_price, min_price, wholesale_price,
          stock_quantity, min_stock, max_stock, unit, image_url, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          sku = excluded.sku,
          barcode = excluded.barcode,
          description = excluded.description,
          category_id = excluded.category_id,
          brand_id = excluded.brand_id,
          cost_price = excluded.cost_price,
          selling_price = excluded.selling_price,
          min_price = excluded.min_price,
          wholesale_price = excluded.wholesale_price,
          stock_quantity = excluded.stock_quantity,
          min_stock = excluded.min_stock,
          max_stock = excluded.max_stock,
          unit = excluded.unit,
          image_url = excluded.image_url,
          updated_at = datetime('now')`,
        args: [
          id,
          args.name,
          args.sku,
          args.barcode ?? null,
          args.description ?? null,
          args.category_id ?? null,
          args.brand_id ?? null,
          args.cost_price ?? 0,
          args.selling_price ?? 0,
          args.min_price ?? 0,
          args.wholesale_price ?? 0,
          args.stock ?? args.stock_quantity ?? 0,
          args.min_stock ?? 5,
          args.max_stock ?? 1000,
          args.unit ?? "pcs",
          args.image_url ?? null,
        ],
      });
      return { id };
    }

    case "deleteProduct": {
      await db.execute({
        sql: "UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?",
        args: [args.id],
      });
      return { success: true };
    }

    case "listCategories": {
      const rs = await db.execute(
        "SELECT * FROM product_categories WHERE active = 1 ORDER BY name ASC",
      );
      return rs.rows;
    }

    case "saveCategory": {
      const id = args.id || `cat-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO product_categories (id, name, description, active) VALUES (?, ?, ?, 1)
              ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description`,
        args: [id, args.name, args.description ?? null],
      });
      return { id };
    }

    case "listBrands": {
      const rs = await db.execute(
        "SELECT * FROM product_brands WHERE active = 1 ORDER BY name ASC",
      );
      return rs.rows;
    }

    case "saveBrand": {
      const id = args.id || `brd-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO product_brands (id, name, description, active) VALUES (?, ?, ?, 1)
              ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description`,
        args: [id, args.name, args.description ?? null],
      });
      return { id };
    }

    case "listInventoryMovements": {
      const rs = await db.execute(`
        SELECT m.*, p.name as product_name, p.sku
        FROM inventory_movements m
        JOIN products p ON p.id = m.product_id
        ORDER BY m.created_at DESC LIMIT 200
      `);
      return rs.rows;
    }

    case "canSell":
    case "can_sell": {
      return await inventoryEngine.checkCanSell(db, args.product_id, args.requested_qty);
    }

    // ----------------------------------------------------
    // CUSTOMERS & SUPPLIERS
    // ----------------------------------------------------
    case "listCustomers": {
      const rs = await db.execute("SELECT * FROM customers WHERE active = 1 ORDER BY name ASC");
      return rs.rows;
    }

    case "saveCustomer": {
      const id = args.id || `cust-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO customers (id, name, phone, email, address, credit_limit, notes, active)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1)
              ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                phone = excluded.phone,
                email = excluded.email,
                address = excluded.address,
                credit_limit = excluded.credit_limit,
                notes = excluded.notes,
                updated_at = datetime('now')`,
        args: [
          id,
          args.name,
          args.phone ?? null,
          args.email ?? null,
          args.address ?? null,
          args.credit_limit ?? 0,
          args.notes ?? null,
        ],
      });
      return { id };
    }

    case "listCustomerBalances":
    case "customer_balances": {
      const rs = await db.execute(`
        SELECT 
          c.id as customer_id,
          c.name,
          c.phone,
          c.email,
          c.credit_limit,
          c.active,
          COALESCE(SUM(s.total), 0) as sales_total,
          COALESCE(SUM(s.returned_total), 0) as returned_total,
          COALESCE(SUM(s.paid_amount), 0) as paid_total,
          COALESCE(SUM(s.balance), 0) as balance,
          (c.credit_limit - COALESCE(SUM(s.balance), 0)) as credit_available,
          MAX(s.sale_date) as last_sale_date
        FROM customers c
        LEFT JOIN sales s ON s.customer_id = c.id AND s.status = 'completed'
        WHERE c.active = 1
        GROUP BY c.id
        ORDER BY balance DESC, c.name ASC
      `);
      return rs.rows;
    }

    case "customerStatement":
    case "customer_statement": {
      const customerId = args.customer_id;
      const salesRs = await db.execute({
        sql: "SELECT * FROM sales WHERE customer_id = ? ORDER BY sale_date ASC",
        args: [customerId],
      });
      const paymentsRs = await db.execute({
        sql: "SELECT * FROM customer_payments WHERE customer_id = ? ORDER BY payment_date ASC",
        args: [customerId],
      });
      return {
        sales: salesRs.rows,
        payments: paymentsRs.rows,
      };
    }

    case "listSuppliers": {
      const rs = await db.execute("SELECT * FROM suppliers WHERE active = 1 ORDER BY name ASC");
      return rs.rows;
    }

    case "saveSupplier": {
      const id = args.id || `sup-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO suppliers (id, name, contact_person, phone, email, address, notes, active)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1)
              ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                contact_person = excluded.contact_person,
                phone = excluded.phone,
                email = excluded.email,
                address = excluded.address,
                notes = excluded.notes,
                updated_at = datetime('now')`,
        args: [
          id,
          args.name,
          args.contact_person ?? null,
          args.phone ?? null,
          args.email ?? null,
          args.address ?? null,
          args.notes ?? null,
        ],
      });
      return { id };
    }

    case "listSupplierBalances":
    case "supplier_balances": {
      const rs = await db.execute(`
        SELECT 
          s.id as supplier_id,
          s.name,
          s.contact_person,
          s.phone,
          s.email,
          COALESCE(SUM(p.total), 0) as purchases_total,
          COALESCE(SUM(p.paid_amount), 0) as paid_total,
          COALESCE(SUM(p.balance), 0) as balance,
          MAX(p.purchase_date) as last_purchase_date
        FROM suppliers s
        LEFT JOIN purchases p ON p.supplier_id = s.id AND p.status = 'received'
        WHERE s.active = 1
        GROUP BY s.id
        ORDER BY balance DESC, s.name ASC
      `);
      return rs.rows;
    }

    // ----------------------------------------------------
    // PURCHASES & PROCUREMENT
    // ----------------------------------------------------
    case "listPurchases":
    case "purchases_overview": {
      const rs = await db.execute(
        "SELECT * FROM purchases ORDER BY purchase_date DESC, created_at DESC LIMIT 100",
      );
      return rs.rows;
    }

    case "getPurchase": {
      const pRs = await db.execute({
        sql: "SELECT * FROM purchases WHERE id = ? OR purchase_no = ?",
        args: [args.id, args.id],
      });
      if (pRs.rows.length === 0) return null;
      const purchase = pRs.rows[0];

      const itemsRs = await db.execute({
        sql: "SELECT * FROM purchase_items WHERE purchase_id = ?",
        args: [purchase["id"]],
      });

      return {
        ...purchase,
        items: itemsRs.rows,
      };
    }

    case "createPurchase":
    case "create_purchase": {
      return await procurementEngine.createPurchase(db, args);
    }

    case "nextPurchaseNumber":
    case "next_purchase_number": {
      return await procurementEngine.nextPurchaseNumber(db);
    }

    case "recordSupplierPayment":
    case "record_supplier_payment": {
      return await procurementEngine.recordSupplierPayment(db, args);
    }

    // ----------------------------------------------------
    // FINANCIALS, ACCOUNTS, EXPENSES & INCOME
    // ----------------------------------------------------
    case "getFinancialSnapshot":
    case "financial_snapshot": {
      return await financialEngine.getFinancialSnapshot(db);
    }

    case "getBusinessOverview":
    case "business_overview": {
      return await financialEngine.getBusinessOverview(db);
    }

    case "listFinancialTransactions": {
      let sql = "SELECT * FROM financial_transactions WHERE 1=1";
      const params: any[] = [];
      if (args.txn_type) {
        sql += " AND txn_type = ?";
        params.push(args.txn_type);
      }
      if (args.account_id) {
        sql += " AND (account_id = ? OR to_account_id = ?)";
        params.push(args.account_id, args.account_id);
      }
      sql += " ORDER BY txn_date DESC, created_at DESC LIMIT ?";
      params.push(args.limit ?? 200);

      const rs = await db.execute({ sql, args: params });
      return rs.rows;
    }

    case "listPaymentAccounts":
    case "account_balances": {
      const rs = await db.execute(
        "SELECT * FROM payment_accounts WHERE is_active = 1 ORDER BY name ASC",
      );
      return rs.rows;
    }

    case "savePaymentAccount": {
      const id = args.id || `acc-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO payment_accounts (id, name, code, type, currency, opening_balance, current_balance, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1)
              ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                code = excluded.code,
                type = excluded.type,
                currency = excluded.currency,
                updated_at = datetime('now')`,
        args: [
          id,
          args.name,
          args.code,
          args.type ?? "cash",
          args.currency ?? "USD",
          args.opening_balance ?? 0,
          args.current_balance ?? args.opening_balance ?? 0,
        ],
      });
      return { id };
    }

    case "listPaymentChannels": {
      const rs = await db.execute(
        "SELECT * FROM payment_channels WHERE active = 1 ORDER BY sort_order ASC, name ASC",
      );
      return rs.rows;
    }

    case "recordExpense":
    case "record_expense": {
      return await accountingEngine.recordExpense(db, args);
    }

    case "recordIncome":
    case "record_income": {
      return await accountingEngine.recordIncome(db, args);
    }

    case "createAccountTransfer":
    case "create_account_transfer": {
      return await accountingEngine.createAccountTransfer(db, args);
    }

    case "voidFinancialTransaction":
    case "void_financial_transaction": {
      return await accountingEngine.voidFinancialTransaction(
        db,
        args.transaction_id,
        args.actor_id,
      );
    }

    case "listExpenseCategories": {
      const rs = await db.execute(
        "SELECT * FROM expense_categories WHERE is_active = 1 ORDER BY name ASC",
      );
      return rs.rows;
    }

    // ----------------------------------------------------
    // ZONES & CARGO
    // ----------------------------------------------------
    case "listDeliveryZones": {
      const rs = await db.execute(
        "SELECT * FROM delivery_zones WHERE active = 1 ORDER BY name ASC",
      );
      return rs.rows;
    }

    case "listCargoCompanies": {
      const rs = await db.execute(
        "SELECT * FROM cargo_companies WHERE active = 1 ORDER BY name ASC",
      );
      return rs.rows;
    }

    case "listCargoRates": {
      const rs = await db.execute(
        "SELECT * FROM cargo_rates WHERE active = 1 ORDER BY destination ASC",
      );
      return rs.rows;
    }

    // ----------------------------------------------------
    // APP USERS & SETTINGS
    // ----------------------------------------------------
    case "listUsers":
    case "app_users": {
      const rs = await db.execute(
        "SELECT * FROM app_users WHERE is_active = 1 ORDER BY full_name ASC",
      );
      return rs.rows;
    }

    case "getAppSettings": {
      const rs = await db.execute("SELECT * FROM app_settings");
      const map: Record<string, string> = {};
      for (const row of rs.rows) {
        map[String(row["key"])] = String(row["value"]);
      }
      return map;
    }

    case "saveAppSetting": {
      await db.execute({
        sql: `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
        args: [args.key, String(args.value)],
      });
      return { success: true };
    }

    default:
      throw new Error(`Unknown RPC function: "${fnName}"`);
  }
}
