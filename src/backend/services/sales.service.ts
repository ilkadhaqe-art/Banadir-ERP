import { getDatabase, SqlDatabase } from "../db/database";
import { recordStockMovement } from "./inventory.service";
import { logAudit } from "./audit.service";

export interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  discount?: number;
}

export interface CreateSaleInput {
  saleDate?: string;
  saleTime?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: CreateSaleItemInput[];
  discount?: number;
  vatRate?: number;
  deliveryFee?: number;
  cargoFee?: number;
  paidAmount?: number;
  advanceAmount?: number;
  paymentMethod?: string;
  paymentChannelId?: string;
  bankName?: string;
  accountId?: string;
  fulfillmentType?: "pickup" | "delivery" | "cargo";
  deliveryStatus?: string;
  driverName?: string;
  driverPhone?: string;
  deliveryCompanyId?: string;
  driverId?: string;
  cargoCompanyId?: string;
  locationId?: string;
  notes?: string;
  cashierName?: string;
  createdBy?: string;
}

export async function createSale(input: CreateSaleInput) {
  const db = await getDatabase();

  return db.transaction(() => {
    if (!input.items || input.items.length === 0) {
      throw new Error("Wax alaab ah lama dooran (At least one item is required to create a sale)");
    }

    // 1. Generate sequential Sale Number
    const lastSale = db.get<{ max_num: number }>(
      `SELECT MAX(CAST(SUBSTR(sale_no, 2) AS INTEGER)) as max_num FROM sales WHERE sale_no LIKE 'S%'`,
    );
    const nextNum = ((lastSale?.max_num || 0) + 1).toString().padStart(5, "0");
    const saleNo = `S${nextNum}`;
    const saleId = "sale-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();

    const saleDate = input.saleDate || new Date().toISOString().split("T")[0];
    const saleTime = input.saleTime || new Date().toLocaleTimeString("en-GB");

    // 2. Resolve Customer Info
    let customerName = input.customerName || null;
    let customerPhone = input.customerPhone || null;
    let customerAddress = input.customerAddress || null;

    if (input.customerId) {
      const cust = db.get<{ name: string; phone: string; address: string }>(
        "SELECT name, phone, address FROM customers WHERE id = ?",
        [input.customerId],
      );
      if (cust) {
        customerName = customerName || cust.name;
        customerPhone = customerPhone || cust.phone;
        customerAddress = customerAddress || cust.address;
      }
    }

    // 3. Calculate Item Totals and Check/Deduct Stock
    let subtotal = 0;
    const itemsToInsert: {
      id: string;
      productId: string;
      quantity: number;
      unitPrice: number;
      unitCost: number;
      lineTotal: number;
    }[] = [];

    for (const it of input.items) {
      if (it.quantity <= 0) {
        throw new Error("Tirada alaabta waa in ay ka weynaataa 0 (Quantity must be > 0)");
      }

      const product = db.get<{
        id: string;
        name: string;
        sku: string;
        cost_price: number;
        stock: number;
      }>("SELECT id, name, sku, cost_price, stock FROM products WHERE id = ?", [it.productId]);

      if (!product) {
        throw new Error(`Product ${it.productId} not found`);
      }

      const unitCost = it.unitCost !== undefined ? it.unitCost : product.cost_price;
      const itemDisc = it.discount || 0;
      const lineTotal = Math.round((it.quantity * it.unitPrice - itemDisc) * 100) / 100;
      subtotal += lineTotal;

      // Deduct stock via inventory movement inside this transaction
      recordStockMovement(
        {
          productId: it.productId,
          movementType: "sale",
          quantity: -it.quantity,
          unitCost,
          reference: saleNo,
          sourceModule: "sales",
          sourceId: saleId,
          notes: `Iibka ${saleNo}`,
          createdBy: input.createdBy,
        },
        db,
      );

      itemsToInsert.push({
        id: "sitem-" + Math.random().toString(36).substring(2, 9),
        productId: it.productId,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        unitCost,
        lineTotal,
      });
    }

    // 4. Calculate Final Financials
    const discount = Math.round((input.discount || 0) * 100) / 100;
    const vatRate = input.vatRate || 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const vatAmount = Math.round(taxableAmount * vatRate * 100) / 100;
    const deliveryFee = Math.round((input.deliveryFee || 0) * 100) / 100;
    const cargoFee = Math.round((input.cargoFee || 0) * 100) / 100;

    const total = Math.round((taxableAmount + vatAmount + deliveryFee + cargoFee) * 100) / 100;
    const paidAmount = Math.min(
      total,
      Math.round((input.paidAmount !== undefined ? input.paidAmount : total) * 100) / 100,
    );
    const remainingBalance = Math.max(0, Math.round((total - paidAmount) * 100) / 100);

    let paymentStatus = "unpaid";
    if (paidAmount >= total && total > 0) {
      paymentStatus = "paid";
    } else if (paidAmount > 0) {
      paymentStatus = "partial";
    } else {
      paymentStatus = "debt";
    }

    // 5. Insert Sale Header
    db.run(
      `INSERT INTO sales (
        id, sale_no, sale_date, sale_time, customer_id, customer_name, customer_phone, customer_address,
        subtotal, discount, vat_rate, vat_amount, delivery_fee, cargo_fee, total, paid_amount,
        remaining_balance, payment_status, payment_method, payment_channel_id, bank_name,
        account_id, fulfillment_type, delivery_status, driver_name, driver_phone,
        delivery_company_id, driver_id, cargo_company_id, location_id, status, notes,
        cashier_name, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [
        saleId,
        saleNo,
        saleDate,
        saleTime,
        input.customerId || null,
        customerName,
        customerPhone,
        customerAddress,
        subtotal,
        discount,
        vatRate,
        vatAmount,
        deliveryFee,
        cargoFee,
        total,
        paidAmount,
        remainingBalance,
        paymentStatus,
        input.paymentMethod || "cash",
        input.paymentChannelId || null,
        input.bankName || null,
        input.accountId || null,
        input.fulfillmentType || "pickup",
        input.deliveryStatus || null,
        input.driverName || null,
        input.driverPhone || null,
        input.deliveryCompanyId || null,
        input.driverId || null,
        input.cargoCompanyId || null,
        input.locationId || null,
        input.notes || null,
        input.cashierName || "Admin",
        input.createdBy || null,
      ],
    );

    // 6. Insert Sale Items
    for (const it of itemsToInsert) {
      db.run(
        `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, unit_cost, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [it.id, saleId, it.productId, it.quantity, it.unitPrice, it.unitCost, it.lineTotal],
      );
    }

    // 7. Update Customer Receivables
    if (input.customerId) {
      db.run(
        `UPDATE customers SET 
          current_balance = current_balance + ?,
          total_sales = total_sales + ?,
          total_paid = total_paid + ?,
          updated_at = datetime('now')
         WHERE id = ?`,
        [remainingBalance, total, paidAmount, input.customerId],
      );
    }

    // 8. Financial Ledger & Account Balance
    if (paidAmount > 0 && input.accountId) {
      const txnId = "txn-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
      db.run(
        `INSERT INTO financial_transactions (
          id, transaction_date, kind, category, amount, account_id, reference, source_module, source_id, note, created_by
        ) VALUES (?, ?, 'sale_payment', 'Sales Revenue', ?, ?, ?, 'sales', ?, ?, ?)`,
        [
          txnId,
          saleDate,
          paidAmount,
          input.accountId,
          saleNo,
          saleId,
          `Lacag qabasho iibka ${saleNo} (${customerName || "Walk-in"})`,
          input.createdBy || null,
        ],
      );

      db.run(
        `UPDATE payment_accounts SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`,
        [paidAmount, input.accountId],
      );
    }

    // 9. Logistics & Delivery Creation
    if (input.fulfillmentType && input.fulfillmentType !== "pickup") {
      const delivId = "deliv-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
      const delivStatus = input.driverId ? "assigned" : "pending";

      db.run(
        `INSERT INTO deliveries (
          id, sale_id, driver_id, zone_id, delivery_company_id, cargo_company_id, status,
          fee, cod_amount, collected_amount, recipient_name, recipient_phone, address, dispatch_date, note, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
        [
          delivId,
          saleId,
          input.driverId || null,
          input.locationId || null,
          input.deliveryCompanyId || null,
          input.cargoCompanyId || null,
          delivStatus,
          deliveryFee + cargoFee,
          remainingBalance, // COD is what remains to be collected
          customerName,
          customerPhone,
          customerAddress,
          saleDate,
          input.notes || null,
          input.createdBy || null,
        ],
      );

      // Event log
      db.run(
        `INSERT INTO delivery_events (id, delivery_id, event_type, driver_id, note)
         VALUES (?, ?, ?, ?, ?)`,
        [
          "devent-" + Math.random().toString(36).substring(2, 9),
          delivId,
          "ORDER_CREATED",
          input.driverId || null,
          `Fulfillment created: ${input.fulfillmentType}`,
        ],
      );
    }

    // 10. Audit Log
    logAudit(
      {
        userId: input.createdBy,
        action: "CREATE_SALE",
        module: "sales",
        recordId: saleId,
        afterState: {
          saleNo,
          total,
          paidAmount,
          remainingBalance,
          itemsCount: itemsToInsert.length,
        },
        reason: `New sale created with ${itemsToInsert.length} items`,
      },
      db,
    );

    return getSaleById(saleId, db);
  });
}

export async function voidSale(saleId: string, reason: string, userId?: string) {
  const db = await getDatabase();

  return db.transaction(() => {
    const sale = db.get<{
      id: string;
      sale_no: string;
      customer_id: string | null;
      total: number;
      paid_amount: number;
      remaining_balance: number;
      account_id: string | null;
      status: string;
    }>("SELECT * FROM sales WHERE id = ?", [saleId]);

    if (!sale) {
      throw new Error(`Sale ${saleId} not found`);
    }
    if (sale.status === "voided" || sale.status === "reversed") {
      throw new Error(`Iibkani horay ayaa loo baabi'iyay (Sale is already ${sale.status})`);
    }

    // 1. Restore Stock for all items
    const items = db.query<{ product_id: string; quantity: number; unit_cost: number }>(
      "SELECT product_id, quantity, unit_cost FROM sale_items WHERE sale_id = ?",
      [saleId],
    );

    for (const it of items) {
      recordStockMovement(
        {
          productId: it.product_id,
          movementType: "sale_return",
          quantity: it.quantity, // positive to return to warehouse
          unitCost: it.unit_cost,
          reference: sale.sale_no,
          sourceModule: "sales_void",
          sourceId: saleId,
          notes: `Baabi'inta iibka ${sale.sale_no}: ${reason}`,
          createdBy: userId,
        },
        db,
      );
    }

    // 2. Adjust Customer Receivables
    if (sale.customer_id) {
      db.run(
        `UPDATE customers SET 
          current_balance = MAX(0, current_balance - ?),
          total_sales = MAX(0, total_sales - ?),
          total_paid = MAX(0, total_paid - ?),
          updated_at = datetime('now')
         WHERE id = ?`,
        [sale.remaining_balance, sale.total, sale.paid_amount, sale.customer_id],
      );
    }

    // 3. Deduct/Refund Cash if payment was made
    if (sale.paid_amount > 0 && sale.account_id) {
      const txnId = "txn-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
      db.run(
        `INSERT INTO financial_transactions (
          id, transaction_date, kind, category, amount, account_id, reference, source_module, source_id, note, created_by
        ) VALUES (?, date('now'), 'expense', 'Sale Reversal / Refund', ?, ?, ?, 'sales_void', ?, ?, ?)`,
        [
          txnId,
          sale.paid_amount,
          sale.account_id,
          sale.sale_no,
          saleId,
          `Soo celin lacag iib la baabi'iyay: ${sale.sale_no} (${reason})`,
          userId || null,
        ],
      );

      db.run(
        `UPDATE payment_accounts SET balance = balance - ?, updated_at = datetime('now') WHERE id = ?`,
        [sale.paid_amount, sale.account_id],
      );
    }

    // 4. Cancel delivery if any
    db.run("UPDATE deliveries SET status = 'cancelled' WHERE sale_id = ?", [saleId]);

    // 5. Update Sale status
    db.run("UPDATE sales SET status = 'voided', updated_at = datetime('now') WHERE id = ?", [
      saleId,
    ]);

    // 6. Audit Log
    logAudit(
      {
        userId,
        action: "VOID_SALE",
        module: "sales",
        recordId: saleId,
        beforeState: { status: sale.status, total: sale.total },
        afterState: { status: "voided" },
        reason,
      },
      db,
    );

    return { success: true, message: `Sale ${sale.sale_no} successfully voided` };
  });
}

export async function recordCustomerPayment(
  customerId: string,
  amount: number,
  paymentMethod: string,
  accountId: string,
  saleId?: string,
  note?: string,
  userId?: string,
) {
  const db = await getDatabase();

  return db.transaction(() => {
    if (amount <= 0) {
      throw new Error("Lacagta bixinta waa in ay ka weynaataa 0 (Payment amount must be > 0)");
    }

    const customer = db.get<{ id: string; name: string; current_balance: number }>(
      "SELECT id, name, current_balance FROM customers WHERE id = ?",
      [customerId],
    );
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    const pmtId = "cpmt-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    const pmtDate = new Date().toISOString().split("T")[0];

    // Insert customer payment record
    db.run(
      `INSERT INTO customer_payments (id, customer_id, sale_id, amount, payment_date, payment_method, account_id, note, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pmtId,
        customerId,
        saleId || null,
        amount,
        pmtDate,
        paymentMethod,
        accountId,
        note || null,
        userId || null,
      ],
    );

    // Reduce customer debt
    db.run(
      `UPDATE customers SET 
        current_balance = MAX(0, current_balance - ?),
        total_paid = total_paid + ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [amount, amount, customerId],
    );

    // If specific sale provided, reduce sale remaining balance
    if (saleId) {
      const sale = db.get<{ paid_amount: number; remaining_balance: number; total: number }>(
        "SELECT paid_amount, remaining_balance, total FROM sales WHERE id = ?",
        [saleId],
      );
      if (sale) {
        const newPaid = Math.min(sale.total, sale.paid_amount + amount);
        const newRem = Math.max(0, sale.total - newPaid);
        const newStatus = newRem === 0 ? "paid" : "partial";
        db.run(
          `UPDATE sales SET paid_amount = ?, remaining_balance = ?, payment_status = ?, updated_at = datetime('now') WHERE id = ?`,
          [newPaid, newRem, newStatus, saleId],
        );
      }
    }

    // Add money to payment account
    db.run(
      `UPDATE payment_accounts SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`,
      [amount, accountId],
    );

    // Financial transaction
    const txnId = "txn-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    db.run(
      `INSERT INTO financial_transactions (
        id, transaction_date, kind, category, amount, account_id, source_module, source_id, note, created_by
      ) VALUES (?, ?, 'collection', 'Customer Debt Collection', ?, ?, 'customer_payments', ?, ?, ?)`,
      [
        txnId,
        pmtDate,
        amount,
        accountId,
        pmtId,
        `Qabasho deyn macaamil: ${customer.name} ($${amount})`,
        userId || null,
      ],
    );

    // Audit log
    logAudit(
      {
        userId,
        action: "RECORD_CUSTOMER_PAYMENT",
        module: "customers",
        recordId: customerId,
        afterState: { amount, paymentMethod, accountId, saleId },
        reason: `Payment of $${amount} received from ${customer.name}`,
      },
      db,
    );

    return {
      paymentId: pmtId,
      customerId,
      amount,
      newBalance: Math.max(0, customer.current_balance - amount),
    };
  });
}

export async function getSaleById(saleId: string, externalDb?: SqlDatabase) {
  const db = externalDb || (await getDatabase());

  const sale = db.get<Record<string, unknown>>("SELECT * FROM sales WHERE id = ?", [saleId]);
  if (!sale) return null;

  const items = db.query<Record<string, unknown>>(
    `SELECT si.*, p.name as product_name, p.sku as product_sku, p.unit 
     FROM sale_items si
     JOIN products p ON si.product_id = p.id
     WHERE si.sale_id = ?`,
    [saleId],
  );

  const delivery = db.get<Record<string, unknown>>(
    `SELECT d.*, drv.name as driver_name, drv.phone as driver_phone
     FROM deliveries d
     LEFT JOIN drivers drv ON d.driver_id = drv.id
     WHERE d.sale_id = ?`,
    [saleId],
  );

  return { ...sale, items, delivery };
}

export async function listSales(filters: {
  search?: string;
  status?: string;
  paymentStatus?: string;
  fulfillmentType?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDatabase();
  const conditions: string[] = ["1=1"];
  const params: (string | number)[] = [];

  if (filters.search) {
    conditions.push(
      "(s.sale_no LIKE ? OR s.customer_name LIKE ? OR s.customer_phone LIKE ? OR s.notes LIKE ?)",
    );
    const term = `%${filters.search}%`;
    params.push(term, term, term, term);
  }

  if (filters.status) {
    conditions.push("s.status = ?");
    params.push(filters.status);
  }

  if (filters.paymentStatus) {
    conditions.push("s.payment_status = ?");
    params.push(filters.paymentStatus);
  }

  if (filters.fulfillmentType) {
    conditions.push("s.fulfillment_type = ?");
    params.push(filters.fulfillmentType);
  }

  if (filters.customerId) {
    conditions.push("s.customer_id = ?");
    params.push(filters.customerId);
  }

  if (filters.startDate) {
    conditions.push("s.sale_date >= ?");
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    conditions.push("s.sale_date <= ?");
    params.push(filters.endDate);
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const countRow = db.get<{ total_count: number }>(
    `SELECT COUNT(*) as total_count FROM sales s WHERE ${conditions.join(" AND ")}`,
    params,
  );

  const sales = db.query<Record<string, unknown>>(
    `SELECT s.*, c.name as customer_real_name, c.phone as customer_real_phone
     FROM sales s
     LEFT JOIN customers c ON s.customer_id = c.id
     WHERE ${conditions.join(" AND ")}
     ORDER BY s.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return {
    total: countRow?.total_count || 0,
    sales,
    limit,
    offset,
  };
}
