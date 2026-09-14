import { mockDb, MOCK_BUSINESS_OVERVIEW, MOCK_FINANCIAL_SNAPSHOT } from "@/lib/mock-data";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function handleApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle CORS preflight
  if (request.method === "OPTIONS" && path.startsWith("/api/")) {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (!path.startsWith("/api/")) {
    return null;
  }

  try {
    // 1. Health & Database connection check
    if (path === "/api/health" || path === "/api/v1/health") {
      const isSupabaseConfigured = Boolean(
        process.env["SUPABASE_URL"] &&
        !process.env["SUPABASE_URL"].includes("placeholder") &&
        process.env["SUPABASE_SERVICE_ROLE_KEY"],
      );

      return jsonResponse({
        success: true,
        status: "healthy",
        version: "2.0.0",
        backend: "Banadir Online FOS Engine",
        database: {
          connected: isSupabaseConfigured,
          provider: isSupabaseConfigured
            ? "Supabase PostgreSQL"
            : "In-Memory Fresh Engine (Demo Mode)",
          urlConfigured: Boolean(process.env["SUPABASE_URL"]),
          serviceRoleConfigured: Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"]),
        },
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Business Overview & Financial KPIs
    if (path === "/api/v1/overview") {
      const sales = mockDb["sales"] || [];
      const products = mockDb["products"] || [];
      const orders = mockDb["orders"] || [];
      const customers = mockDb["customers"] || [];
      const accounts = mockDb["account_balances"] || [];

      const totalSalesAmount = sales.reduce(
        (sum, s) => sum + (Number((s as { total?: number }).total) || 0),
        0,
      );
      const totalCashBalance = accounts.reduce(
        (sum, a) => sum + (Number((a as { balance?: number }).balance) || 0),
        0,
      );

      return jsonResponse({
        success: true,
        data: {
          metrics: {
            total_sales: totalSalesAmount,
            total_orders: orders.length,
            total_customers: customers.length,
            total_products: products.length,
            cash_in_accounts: totalCashBalance,
          },
          overview: {
            ...MOCK_BUSINESS_OVERVIEW,
            sales: totalSalesAmount,
            cash_total: totalCashBalance,
            open_orders: orders.length,
            active_deliveries: (mockDb["deliveries"] || []).length,
          },
          financial_snapshot: {
            ...MOCK_FINANCIAL_SNAPSHOT,
            cash_balance: totalCashBalance,
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Products & Stock API
    if (path === "/api/v1/products") {
      if (request.method === "GET") {
        const products = mockDb["products"] || [];
        return jsonResponse({
          success: true,
          count: products.length,
          data: products,
          timestamp: new Date().toISOString(),
        });
      }

      if (request.method === "POST") {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const newProduct = {
          id: "prod-" + Math.random().toString(36).substring(2, 9),
          sku: String(body.sku || "SKU-" + Math.floor(1000 + Math.random() * 9000)),
          name: String(body.name || "Alaab Cusub"),
          selling_price: Number(body.selling_price) || 10,
          cost_price: Number(body.cost_price) || 7,
          stock: Number(body.stock) || 10,
          low_stock_threshold: Number(body.low_stock_threshold) || 5,
          category_id: String(body.category_id || "cat-food"),
          active: true,
          created_at: new Date().toISOString(),
        };
        mockDb["products"] = [newProduct, ...(mockDb["products"] || [])];
        return jsonResponse(
          {
            success: true,
            message: "Alaabta si guul leh ayaa loo diiwaangeliyay",
            data: newProduct,
            timestamp: new Date().toISOString(),
          },
          201,
        );
      }
    }

    // 4. Sales API
    if (path === "/api/v1/sales") {
      if (request.method === "GET") {
        const sales = mockDb["sales"] || [];
        return jsonResponse({
          success: true,
          count: sales.length,
          data: sales,
          timestamp: new Date().toISOString(),
        });
      }

      if (request.method === "POST") {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const newSale = {
          id: "sale-" + Math.random().toString(36).substring(2, 9),
          sale_no: "S" + String(Date.now()).slice(-5),
          sale_date: String(body.sale_date || new Date().toISOString().slice(0, 10)),
          customer_id: body.customer_id || null,
          customer_name: body.customer_name || "Macmiil Guud (Walk-in)",
          total: Number(body.total) || 0,
          paid_amount: Number(body.paid_amount) || Number(body.total) || 0,
          balance: Math.max(0, (Number(body.total) || 0) - (Number(body.paid_amount) || 0)),
          payment_method: body.payment_method || "evc_plus",
          payment_status:
            (Number(body.paid_amount) || 0) >= (Number(body.total) || 0) ? "paid" : "partial",
          fulfillment: body.fulfillment || "pickup",
          status: "active",
          created_at: new Date().toISOString(),
        };
        mockDb["sales"] = [newSale, ...(mockDb["sales"] || [])];
        return jsonResponse(
          {
            success: true,
            message: "Iibka si guul leh ayaa loo xareeyay",
            data: newSale,
            timestamp: new Date().toISOString(),
          },
          201,
        );
      }
    }

    // 5. Payment Accounts API
    if (path === "/api/v1/accounts") {
      const accounts = mockDb["account_balances"] || [];
      return jsonResponse({
        success: true,
        count: accounts.length,
        data: accounts,
        timestamp: new Date().toISOString(),
      });
    }

    // 6. Customers API
    if (path === "/api/v1/customers") {
      const customers = mockDb["customers"] || [];
      return jsonResponse({
        success: true,
        count: customers.length,
        data: customers,
        timestamp: new Date().toISOString(),
      });
    }

    // 7. Deliveries API
    if (path === "/api/v1/deliveries") {
      const deliveries = mockDb["deliveries"] || [];
      return jsonResponse({
        success: true,
        count: deliveries.length,
        data: deliveries,
        timestamp: new Date().toISOString(),
      });
    }

    // 8. Reset database state to pristine zero defaults (Hard Factory Reset)
    if (path === "/api/v1/reset" && request.method === "POST") {
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

      return jsonResponse({
        success: true,
        message:
          "Zero Data Factory Reset: Dhammaan xogtii hore waa la tir-tiray (Hard Factory Reset Complete - All accounts $0.00, Zero sales, Zero products, Zero customers)",
        state: {
          products_count: 0,
          sales_count: 0,
          customers_count: 0,
          total_balance: 0.0,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Fallback 404 for unknown /api route
    return jsonResponse(
      {
        success: false,
        error: `API Route not found: ${request.method} ${path}`,
        timestamp: new Date().toISOString(),
      },
      404,
    );
  } catch (error) {
    console.error("[API Error]", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
}
