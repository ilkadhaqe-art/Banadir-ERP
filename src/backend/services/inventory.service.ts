import { getDatabase, SqlDatabase } from "../db/database";
import { logAudit } from "./audit.service";

export interface StockMovementInput {
  productId: string;
  movementType:
    | "opening"
    | "purchase"
    | "sale"
    | "sale_return"
    | "purchase_return"
    | "adjustment"
    | "transfer_in"
    | "transfer_out"
    | "damage"
    | "loss";
  quantity: number; // positive for addition, negative for deduction
  unitCost?: number;
  reference?: string;
  sourceModule?: string;
  sourceId?: string;
  notes?: string;
  createdBy?: string;
}

export async function recordStockMovement(
  input: StockMovementInput,
  externalDb?: SqlDatabase,
): Promise<{ productId: string; previousStock: number; newStock: number }> {
  const db = externalDb || (await getDatabase());

  const product = db.get<{
    id: string;
    sku: string;
    name: string;
    stock: number;
    cost_price: number;
    active: number;
  }>("SELECT id, sku, name, stock, cost_price, active FROM products WHERE id = ?", [
    input.productId,
  ]);

  if (!product) {
    throw new Error(`Alaabta lama helin (Product with ID ${input.productId} not found)`);
  }

  const allowNegativeSetting = db.get<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'allow_negative_stock'",
  );
  const allowNegative = allowNegativeSetting?.value === "true";

  const previousStock = Number(product.stock) || 0;
  const newStock = previousStock + input.quantity;

  if (newStock < 0 && !allowNegative) {
    throw new Error(
      `Stock kuma filna alaabta: "${product.name}" (SKU: ${product.sku}). Hadda waxaa yaalla: ${previousStock}, Waxaa la rabaa: ${Math.abs(input.quantity)}`,
    );
  }

  const movementId = "mov-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
  const unitCost = input.unitCost !== undefined ? input.unitCost : product.cost_price;

  db.run(
    `INSERT INTO inventory_movements (
      id, product_id, movement_type, quantity, previous_stock, new_stock, unit_cost,
      reference, source_module, source_id, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      movementId,
      input.productId,
      input.movementType,
      input.quantity,
      previousStock,
      newStock,
      unitCost,
      input.reference || null,
      input.sourceModule || null,
      input.sourceId || null,
      input.notes || null,
      input.createdBy || null,
    ],
  );

  db.run("UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?", [
    newStock,
    input.productId,
  ]);

  return { productId: input.productId, previousStock, newStock };
}

export async function adjustStock(
  productId: string,
  newPhysicalStock: number,
  reason: string,
  userId?: string,
): Promise<{ previousStock: number; newStock: number }> {
  const db = await getDatabase();
  return db.transaction(() => {
    const product = db.get<{ id: string; stock: number }>(
      "SELECT id, stock FROM products WHERE id = ?",
      [productId],
    );
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const previousStock = Number(product.stock) || 0;
    const diff = newPhysicalStock - previousStock;

    if (diff === 0) {
      return { previousStock, newStock: newPhysicalStock };
    }

    recordStockMovement(
      {
        productId,
        movementType: "adjustment",
        quantity: diff,
        notes: reason || "Manual inventory stock adjustment",
        createdBy: userId,
      },
      db,
    );

    logAudit(
      {
        userId,
        action: "STOCK_ADJUSTMENT",
        module: "inventory",
        recordId: productId,
        beforeState: { stock: previousStock },
        afterState: { stock: newPhysicalStock },
        reason,
      },
      db,
    );

    return { previousStock, newStock: newPhysicalStock };
  });
}

export async function getInventoryMovements(productId?: string, limit = 50, offset = 0) {
  const db = await getDatabase();
  if (productId) {
    return db.query(
      `SELECT m.*, p.name as product_name, p.sku as product_sku 
       FROM inventory_movements m 
       JOIN products p ON m.product_id = p.id 
       WHERE m.product_id = ? 
       ORDER BY m.created_at DESC 
       LIMIT ? OFFSET ?`,
      [productId, limit, offset],
    );
  }
  return db.query(
    `SELECT m.*, p.name as product_name, p.sku as product_sku 
     FROM inventory_movements m 
     JOIN products p ON m.product_id = p.id 
     ORDER BY m.created_at DESC 
     LIMIT ? OFFSET ?`,
    [limit, offset],
  );
}
