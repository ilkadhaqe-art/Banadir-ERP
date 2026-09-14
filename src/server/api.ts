/* eslint-disable @typescript-eslint/no-explicit-any */
import { handleRpc } from "./rpc";
import { getDb, initDb } from "./db";

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...extraHeaders,
    },
  });
}

export async function handleApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle CORS Preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Only handle /api/*
  if (!path.startsWith("/api/")) {
    return null;
  }

  try {
    await initDb();

    // 1. Health & Status
    if (path === "/api/health" || path === "/api/v1/health") {
      const db = getDb();
      const countsRs = await db.batch([
        { sql: "SELECT COUNT(*) as c FROM products WHERE is_active = 1", args: [] },
        { sql: "SELECT COUNT(*) as c FROM sales WHERE status = 'completed'", args: [] },
        { sql: "SELECT COUNT(*) as c FROM customers WHERE active = 1", args: [] },
        { sql: "SELECT COUNT(*) as c FROM orders", args: [] },
        { sql: "SELECT COUNT(*) as c FROM deliveries", args: [] },
      ]);

      return jsonResponse({
        success: true,
        status: "healthy",
        version: "3.0.0",
        backend: "Banadir Online FOS Enterprise Engine",
        database: {
          connected: true,
          provider: "LibSQL / SQLite Persistent Database",
          file: "data/banadir.db",
          counts: {
            products: Number(countsRs[0].rows[0]?.["c"] ?? 0),
            sales: Number(countsRs[1].rows[0]?.["c"] ?? 0),
            customers: Number(countsRs[2].rows[0]?.["c"] ?? 0),
            orders: Number(countsRs[3].rows[0]?.["c"] ?? 0),
            deliveries: Number(countsRs[4].rows[0]?.["c"] ?? 0),
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    // 2. RPC Endpoints: /api/rpc/:functionName
    if (path.startsWith("/api/rpc/")) {
      const fnName = path.replace("/api/rpc/", "");
      let args: any = {};

      if (request.method === "POST" || request.method === "PUT") {
        const text = await request.text();
        if (text && text.trim().length > 0) {
          try {
            args = JSON.parse(text);
          } catch {
            args = {};
          }
        }
      } else {
        // GET params
        args = Object.fromEntries(url.searchParams.entries());
      }

      // If payload is wrapped in { data: ... }, unwrap it
      const actualArgs = args && typeof args === "object" && "data" in args ? args.data : args;

      const result = await handleRpc(fnName, actualArgs);
      return jsonResponse({ success: true, data: result });
    }

    // 3. Generic RPC: POST /api/rpc { fn: "...", args: {...} }
    if (path === "/api/rpc") {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      const fnName = body.fn || body.name || url.searchParams.get("fn");
      if (!fnName) {
        return jsonResponse({ success: false, error: "Missing RPC function name" }, 400);
      }
      const actualArgs = body.args ?? body.data ?? body;
      const result = await handleRpc(fnName, actualArgs);
      return jsonResponse({ success: true, data: result });
    }

    // 4. REST fallback for /api/v1/overview
    if (path === "/api/v1/overview") {
      const overview = await handleRpc("business_overview", {});
      return jsonResponse({ success: true, data: overview });
    }

    // Fallthrough: 404 for unmatched /api routes
    return jsonResponse({ success: false, error: `API route not found: ${path}` }, 404);
  } catch (error: any) {
    console.error(`API error on ${path}:`, error);
    return jsonResponse(
      {
        success: false,
        error: error?.message || "Internal Server Error",
      },
      500,
    );
  }
}
