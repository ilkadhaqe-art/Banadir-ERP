import { getDatabase } from "../db/database";
import { logAudit } from "./audit.service";
import { recordStockMovement } from "./inventory.service";

export interface CreateProductInput {
  sku: string;
  name: string;
  categoryId?: string;
  brandId?: string;
  unit?: string;
  costPrice: number;
  sellPrice: number;
  stock?: number;
  reorderLevel?: number;
  barcode?: string;
  imageUrl?: string;
  userId?: string;
}

export async function createProduct(input: CreateProductInput) {
  const db = await getDatabase();

  return db.transaction(() => {
    // Check SKU unique
    const existing = db.get<{ id: string }>("SELECT id FROM products WHERE sku = ?", [input.sku]);
    if (existing) {
      throw new Error(`Alaab leh SKU ${input.sku} horay ayaa u jirtay (SKU already exists)`);
    }

    const productId = "prod-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    const initialStock = input.stock || 0;

    db.run(
      `INSERT INTO products (
        id, sku, name, category_id, brand_id, unit, cost_price, sell_price,
        stock, reorder_level, barcode, image_url, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        productId,
        input.sku,
        input.name,
        input.categoryId || null,
        input.brandId || null,
        input.unit || "pcs",
        input.costPrice,
        input.sellPrice,
        initialStock,
        input.reorderLevel !== undefined ? input.reorderLevel : 5,
        input.barcode || null,
        input.imageUrl || null,
      ],
    );

    if (initialStock > 0) {
      recordStockMovement(
        {
          productId,
          movementType: "opening",
          quantity: initialStock,
          unitCost: input.costPrice,
          reference: "INITIAL-STOCK",
          notes: "Initial inventory setup",
          createdBy: input.userId,
        },
        db,
      );
    }

    logAudit(
      {
        userId: input.userId,
        action: "CREATE_PRODUCT",
        module: "catalog",
        recordId: productId,
        afterState: {
          sku: input.sku,
          name: input.name,
          price: input.sellPrice,
          stock: initialStock,
        },
      },
      db,
    );

    return db.get<Record<string, unknown>>("SELECT * FROM products WHERE id = ?", [productId]);
  });
}

export async function updateProduct(
  productId: string,
  updates: Partial<CreateProductInput> & { active?: number },
  userId?: string,
) {
  const db = await getDatabase();

  return db.transaction(() => {
    const current = db.get<Record<string, unknown>>("SELECT * FROM products WHERE id = ?", [
      productId,
    ]);
    if (!current) {
      throw new Error(`Product ${productId} not found`);
    }

    // Check if price changed
    if (updates.sellPrice !== undefined && updates.sellPrice !== Number(current.sell_price)) {
      db.run(
        `INSERT INTO price_history (id, product_id, old_price, new_price, changed_by)
         VALUES (?, ?, ?, ?, ?)`,
        [
          "phist-" + Math.random().toString(36).substring(2, 9),
          productId,
          current.sell_price as number,
          updates.sellPrice,
          userId || null,
        ],
      );
    }

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.sku !== undefined) {
      fields.push("sku = ?");
      values.push(updates.sku);
    }
    if (updates.categoryId !== undefined) {
      fields.push("category_id = ?");
      values.push(updates.categoryId || null);
    }
    if (updates.brandId !== undefined) {
      fields.push("brand_id = ?");
      values.push(updates.brandId || null);
    }
    if (updates.unit !== undefined) {
      fields.push("unit = ?");
      values.push(updates.unit);
    }
    if (updates.costPrice !== undefined) {
      fields.push("cost_price = ?");
      values.push(updates.costPrice);
    }
    if (updates.sellPrice !== undefined) {
      fields.push("sell_price = ?");
      values.push(updates.sellPrice);
    }
    if (updates.reorderLevel !== undefined) {
      fields.push("reorder_level = ?");
      values.push(updates.reorderLevel);
    }
    if (updates.barcode !== undefined) {
      fields.push("barcode = ?");
      values.push(updates.barcode || null);
    }
    if (updates.imageUrl !== undefined) {
      fields.push("image_url = ?");
      values.push(updates.imageUrl || null);
    }
    if (updates.active !== undefined) {
      fields.push("active = ?");
      values.push(updates.active);
    }

    fields.push("updated_at = datetime('now')");
    values.push(productId);

    db.run(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`, values);

    logAudit(
      {
        userId,
        action: "UPDATE_PRODUCT",
        module: "catalog",
        recordId: productId,
        beforeState: current,
        afterState: updates,
      },
      db,
    );

    return db.get<Record<string, unknown>>("SELECT * FROM products WHERE id = ?", [productId]);
  });
}

export async function listProducts(filters: {
  search?: string;
  categoryId?: string;
  brandId?: string;
  lowStockOnly?: boolean;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}) {
  const db = await getDatabase();
  const conditions: string[] = ["1=1"];
  const params: (string | number)[] = [];

  if (filters.search) {
    conditions.push("(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)");
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  if (filters.categoryId) {
    conditions.push("p.category_id = ?");
    params.push(filters.categoryId);
  }

  if (filters.brandId) {
    conditions.push("p.brand_id = ?");
    params.push(filters.brandId);
  }

  if (filters.lowStockOnly) {
    conditions.push("p.stock <= p.reorder_level");
  }

  if (filters.activeOnly !== false) {
    conditions.push("p.active = 1");
  }

  const limit = filters.limit || 100;
  const offset = filters.offset || 0;

  const count = db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM products p WHERE ${conditions.join(" AND ")}`,
    params,
  );

  const products = db.query<Record<string, unknown>>(
    `SELECT p.*, c.name as category_name, b.name as brand_name 
     FROM products p 
     LEFT JOIN product_categories c ON p.category_id = c.id 
     LEFT JOIN product_brands b ON p.brand_id = b.id 
     WHERE ${conditions.join(" AND ")} 
     ORDER BY p.name ASC 
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { total: count?.count || 0, products, limit, offset };
}
