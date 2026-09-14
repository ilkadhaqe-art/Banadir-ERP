import { getDatabase } from "../db/database";

function toCsvString(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escapeCell = (val: string | number | null | undefined) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(escapeCell).join(",");
  const rowLines = rows.map((r) => r.map(escapeCell).join(","));
  return [headerLine, ...rowLines].join("\n");
}

export async function exportToCsv(entity: string): Promise<{ filename: string; csv: string }> {
  const db = await getDatabase();
  const dateStr = new Date().toISOString().split("T")[0];

  switch (entity.toLowerCase()) {
    case "sales": {
      const rows = db.query<Record<string, unknown>>(
        `SELECT s.sale_no, s.sale_date, s.customer_name, s.customer_phone,
                s.subtotal, s.discount, s.vat_amount, s.delivery_fee, s.total,
                s.paid_amount, s.remaining_balance, s.payment_status, s.payment_method,
                s.fulfillment_type, s.status, s.notes
         FROM sales s ORDER BY s.created_at DESC`,
      );
      const headers = [
        "Sale No",
        "Date",
        "Customer",
        "Phone",
        "Subtotal",
        "Discount",
        "VAT",
        "Delivery Fee",
        "Total",
        "Paid",
        "Balance",
        "Payment Status",
        "Payment Method",
        "Fulfillment",
        "Status",
        "Notes",
      ];
      const data = rows.map((r) => [
        r.sale_no as string,
        r.sale_date as string,
        r.customer_name as string,
        r.customer_phone as string,
        r.subtotal as number,
        r.discount as number,
        r.vat_amount as number,
        r.delivery_fee as number,
        r.total as number,
        r.paid_amount as number,
        r.remaining_balance as number,
        r.payment_status as string,
        r.payment_method as string,
        r.fulfillment_type as string,
        r.status as string,
        r.notes as string,
      ]);
      return { filename: `sales-export-${dateStr}.csv`, csv: toCsvString(headers, data) };
    }

    case "products": {
      const rows = db.query<Record<string, unknown>>(
        `SELECT p.sku, p.name, c.name as category, b.name as brand, p.unit,
                p.cost_price, p.sell_price, p.stock, p.reorder_level, p.barcode
         FROM products p
         LEFT JOIN product_categories c ON p.category_id = c.id
         LEFT JOIN product_brands b ON p.brand_id = b.id
         ORDER BY p.name ASC`,
      );
      const headers = [
        "SKU",
        "Name",
        "Category",
        "Brand",
        "Unit",
        "Cost Price",
        "Selling Price",
        "Current Stock",
        "Reorder Level",
        "Barcode",
      ];
      const data = rows.map((r) => [
        r.sku as string,
        r.name as string,
        r.category as string,
        r.brand as string,
        r.unit as string,
        r.cost_price as number,
        r.sell_price as number,
        r.stock as number,
        r.reorder_level as number,
        r.barcode as string,
      ]);
      return { filename: `products-catalog-${dateStr}.csv`, csv: toCsvString(headers, data) };
    }

    case "purchases": {
      const rows = db.query<Record<string, unknown>>(
        `SELECT p.invoice_no, p.purchase_date, s.name as supplier,
                p.total, p.paid_amount, p.remaining_balance, p.payment_method, p.status, p.notes
         FROM purchases p
         LEFT JOIN suppliers s ON p.supplier_id = s.id
         ORDER BY p.created_at DESC`,
      );
      const headers = [
        "Invoice No",
        "Date",
        "Supplier",
        "Total",
        "Paid",
        "Balance",
        "Payment Method",
        "Status",
        "Notes",
      ];
      const data = rows.map((r) => [
        r.invoice_no as string,
        r.purchase_date as string,
        r.supplier as string,
        r.total as number,
        r.paid_amount as number,
        r.remaining_balance as number,
        r.payment_method as string,
        r.status as string,
        r.notes as string,
      ]);
      return { filename: `purchases-export-${dateStr}.csv`, csv: toCsvString(headers, data) };
    }

    case "customers": {
      const rows = db.query<Record<string, unknown>>(
        `SELECT name, phone, email, address, credit_limit, current_balance, total_sales, total_paid
         FROM customers ORDER BY name ASC`,
      );
      const headers = [
        "Name",
        "Phone",
        "Email",
        "Address",
        "Credit Limit",
        "Current Debt",
        "Total Purchases",
        "Total Paid",
      ];
      const data = rows.map((r) => [
        r.name as string,
        r.phone as string,
        r.email as string,
        r.address as string,
        r.credit_limit as number,
        r.current_balance as number,
        r.total_sales as number,
        r.total_paid as number,
      ]);
      return { filename: `customers-debt-report-${dateStr}.csv`, csv: toCsvString(headers, data) };
    }

    case "inventory": {
      const rows = db.query<Record<string, unknown>>(
        `SELECT m.created_at, p.sku, p.name, m.movement_type, m.quantity,
                m.previous_stock, m.new_stock, m.unit_cost, m.reference, m.notes
         FROM inventory_movements m
         JOIN products p ON m.product_id = p.id
         ORDER BY m.created_at DESC LIMIT 1000`,
      );
      const headers = [
        "Date",
        "SKU",
        "Product",
        "Movement Type",
        "Quantity",
        "Previous Stock",
        "New Stock",
        "Unit Cost",
        "Reference",
        "Notes",
      ];
      const data = rows.map((r) => [
        r.created_at as string,
        r.sku as string,
        r.name as string,
        r.movement_type as string,
        r.quantity as number,
        r.previous_stock as number,
        r.new_stock as number,
        r.unit_cost as number,
        r.reference as string,
        r.notes as string,
      ]);
      return { filename: `inventory-movements-${dateStr}.csv`, csv: toCsvString(headers, data) };
    }

    default:
      throw new Error(`Export for entity "${entity}" is not supported`);
  }
}
