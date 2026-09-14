/**
 * Products & inventory contracts (Grand Master Two, part 1).
 * Stock is always derived from the inventory movement ledger in the database —
 * never recomputed in a component.
 */

export type StockMovementType =
  | "opening"
  | "purchase"
  | "sale"
  | "return_in"
  | "return_out"
  | "adjustment"
  | "damage"
  | "loss"
  | "transfer";

export const OUTGOING_MOVEMENTS: StockMovementType[] = [
  "sale",
  "damage",
  "loss",
  "return_out",
  "transfer",
];

export type ProductCategory = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  sort_order: number;
};

export type ProductBrand = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  category_id: string | null;
  brand_id: string | null;
  unit: string;
  cost_price: number;
  sell_price: number;
  reorder_level: number;
  opening_stock: number;
  image_url: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
};

export type ProductStock = {
  product_id: string;
  name: string;
  sku: string;
  barcode: string | null;
  unit: string;
  category_id: string | null;
  brand_id: string | null;
  cost_price: number;
  sell_price: number;
  reorder_level: number;
  active: boolean;
  stock_on_hand: number;
  stock_value: number;
  is_low_stock: boolean;
};

export type PriceHistoryEntry = {
  id: string;
  product_id: string;
  cost_price: number;
  sell_price: number;
  effective_from: string;
  note: string | null;
  created_at: string;
};

export type InventoryMovement = {
  id: string;
  product_id: string;
  movement_date: string;
  movement_type: StockMovementType;
  quantity: number;
  unit_cost: number;
  reference: string | null;
  note: string | null;
  created_at: string;
};

export type ProductInput = {
  name: string;
  sku: string;
  barcode?: string | null;
  category_id?: string | null;
  brand_id?: string | null;
  unit?: string;
  cost_price: number;
  sell_price: number;
  reorder_level?: number;
  opening_stock?: number;
  image_url?: string | null;
  notes?: string | null;
  active?: boolean;
};

export type MovementInput = {
  product_id: string;
  movement_date: string;
  movement_type: StockMovementType;
  quantity: number;
  unit_cost?: number;
  reference?: string | null;
  note?: string | null;
};
