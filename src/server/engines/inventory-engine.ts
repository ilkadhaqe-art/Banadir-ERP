import type { Client } from "@libsql/client";
import { v4 as uuidv4 } from "uuid";

export interface StockCheckResult {
  allowed: boolean;
  product_id: string;
  product_name: string;
  requested_qty: number;
  available_qty: number;
  shortage: number;
}

export async function checkCanSell(
  db: Client,
  productId: string,
  requestedQty: number,
): Promise<StockCheckResult> {
  const rs = await db.execute({
    sql: "SELECT id, name, stock_quantity FROM products WHERE id = ?",
    args: [productId],
  });
  if (rs.rows.length === 0) {
    return {
      allowed: false,
      product_id: productId,
      product_name: "Unknown Product",
      requested_qty: requestedQty,
      available_qty: 0,
      shortage: requestedQty,
    };
  }

  const p = rs.rows[0];
  const stock = Number(p["stock_quantity"] ?? 0);
  const allowed = stock >= requestedQty;

  return {
    allowed,
    product_id: productId,
    product_name: String(p["name"]),
    requested_qty: requestedQty,
    available_qty: stock,
    shortage: allowed ? 0 : requestedQty - stock,
  };
}

export async function adjustInventory(
  db: Client,
  opts: {
    productId: string;
    quantityChange: number; // positive = add stock, negative = deduct stock
    movementType:
      "sale" | "purchase" | "sale_return" | "purchase_return" | "adjustment" | "damage" | "audit";
    unitCost?: number;
    unitPrice?: number;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
    createdBy?: string;
  },
) {
  const rs = await db.execute({
    sql: "SELECT id, cost_price, selling_price, stock_quantity FROM products WHERE id = ?",
    args: [opts.productId],
  });
  if (rs.rows.length === 0) {
    throw new Error(`Product ${opts.productId} not found for inventory adjustment`);
  }

  const currentStock = Number(rs.rows[0]["stock_quantity"] ?? 0);
  const currentCost = Number(rs.rows[0]["cost_price"] ?? 0);
  const currentPrice = Number(rs.rows[0]["selling_price"] ?? 0);
  const newStock = currentStock + opts.quantityChange;

  // Update product stock
  await db.execute({
    sql: "UPDATE products SET stock_quantity = ?, updated_at = datetime('now') WHERE id = ?",
    args: [newStock, opts.productId],
  });

  // Record movement in inventory_movements table
  await db.execute({
    sql: `INSERT INTO inventory_movements (
      id, product_id, movement_type, quantity, unit_cost, unit_price,
      quantity_before, quantity_after, reference_type, reference_id, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      opts.productId,
      opts.movementType,
      Math.abs(opts.quantityChange),
      opts.unitCost ?? currentCost,
      opts.unitPrice ?? currentPrice,
      currentStock,
      newStock,
      opts.referenceType ?? null,
      opts.referenceId ?? null,
      opts.notes ?? null,
      opts.createdBy ?? "system",
    ],
  });

  return newStock;
}
