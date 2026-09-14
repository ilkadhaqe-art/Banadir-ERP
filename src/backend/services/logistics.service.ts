import { getDatabase } from "../db/database";
import { logAudit } from "./audit.service";

export async function listDeliveries(filters: {
  status?: string;
  driverId?: string;
  zoneId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDatabase();
  const conditions: string[] = ["1=1"];
  const params: (string | number)[] = [];

  if (filters.status) {
    conditions.push("d.status = ?");
    params.push(filters.status);
  }
  if (filters.driverId) {
    conditions.push("d.driver_id = ?");
    params.push(filters.driverId);
  }
  if (filters.zoneId) {
    conditions.push("d.zone_id = ?");
    params.push(filters.zoneId);
  }
  if (filters.startDate) {
    conditions.push("d.dispatch_date >= ?");
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push("d.dispatch_date <= ?");
    params.push(filters.endDate);
  }

  const limit = filters.limit || 50;
  const offset = filters.offset || 0;

  const count = db.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM deliveries d WHERE ${conditions.join(" AND ")}`,
    params,
  );

  const deliveries = db.query<Record<string, unknown>>(
    `SELECT d.*, 
            s.sale_no, s.total as sale_total, s.remaining_balance as sale_balance,
            drv.name as driver_name, drv.phone as driver_phone,
            dz.name as zone_name,
            dc.name as delivery_company_name,
            cc.name as cargo_company_name
     FROM deliveries d
     LEFT JOIN sales s ON d.sale_id = s.id
     LEFT JOIN drivers drv ON d.driver_id = drv.id
     LEFT JOIN delivery_zones dz ON d.zone_id = dz.id
     LEFT JOIN delivery_companies dc ON d.delivery_company_id = dc.id
     LEFT JOIN cargo_companies cc ON d.cargo_company_id = cc.id
     WHERE ${conditions.join(" AND ")}
     ORDER BY d.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return { total: count?.count || 0, deliveries, limit, offset };
}

export async function assignDriver(deliveryId: string, driverId: string, userId?: string) {
  const db = await getDatabase();

  const driver = db.get<{ name: string; phone: string }>(
    "SELECT name, phone FROM drivers WHERE id = ?",
    [driverId],
  );
  if (!driver) {
    throw new Error(`Driver ${driverId} not found`);
  }

  db.run("UPDATE deliveries SET driver_id = ?, status = 'assigned' WHERE id = ?", [
    driverId,
    deliveryId,
  ]);

  db.run(
    `INSERT INTO delivery_events (id, delivery_id, event_type, driver_id, note)
     VALUES (?, ?, 'DRIVER_ASSIGNED', ?, ?)`,
    [
      "devent-" + Math.random().toString(36).substring(2, 9),
      deliveryId,
      driverId,
      `Wade loo xilsaaray: ${driver.name}`,
    ],
  );

  logAudit(
    {
      userId,
      action: "ASSIGN_DRIVER",
      module: "logistics",
      recordId: deliveryId,
      afterState: { driverId, driverName: driver.name },
    },
    db,
  );

  return { success: true, driverName: driver.name };
}

export async function updateDeliveryStatus(
  deliveryId: string,
  status: "pending" | "assigned" | "in_transit" | "delivered" | "failed" | "returned" | "cancelled",
  note?: string,
  collectedAmount?: number,
  userId?: string,
) {
  const db = await getDatabase();

  return db.transaction(() => {
    const delivery = db.get<{
      id: string;
      sale_id: string;
      cod_amount: number;
      driver_id: string;
    }>("SELECT id, sale_id, cod_amount, driver_id FROM deliveries WHERE id = ?", [deliveryId]);

    if (!delivery) {
      throw new Error(`Delivery ${deliveryId} not found`);
    }

    const deliveredDate = status === "delivered" ? new Date().toISOString() : null;
    const collected =
      collectedAmount !== undefined
        ? collectedAmount
        : status === "delivered"
          ? delivery.cod_amount
          : 0;

    db.run(
      "UPDATE deliveries SET status = ?, delivered_date = COALESCE(?, delivered_date), collected_amount = ? WHERE id = ?",
      [status, deliveredDate, collected, deliveryId],
    );

    // If delivered and cash collected, update sale paid amount
    if (status === "delivered" && collected > 0 && delivery.sale_id) {
      db.run(
        `UPDATE sales SET 
          paid_amount = paid_amount + ?,
          remaining_balance = MAX(0, remaining_balance - ?),
          payment_status = CASE WHEN (remaining_balance - ?) <= 0 THEN 'paid' ELSE 'partial' END,
          updated_at = datetime('now')
         WHERE id = ?`,
        [collected, collected, collected, delivery.sale_id],
      );
    }

    db.run(
      `INSERT INTO delivery_events (id, delivery_id, event_type, driver_id, amount_collected, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        "devent-" + Math.random().toString(36).substring(2, 9),
        deliveryId,
        `STATUS_${status.toUpperCase()}`,
        delivery.driver_id,
        collected,
        note || `Xaaladda waxaa loo beddelay: ${status}`,
      ],
    );

    logAudit(
      {
        userId,
        action: "UPDATE_DELIVERY_STATUS",
        module: "logistics",
        recordId: deliveryId,
        afterState: { status, collected },
        reason: note,
      },
      db,
    );

    return { success: true, status, collected };
  });
}

export async function recordDriverHandover(input: {
  driverId: string;
  amount: number;
  accountId: string;
  handoverDate?: string;
  notes?: string;
  userId?: string;
}) {
  const db = await getDatabase();

  return db.transaction(() => {
    if (input.amount <= 0) {
      throw new Error(
        "Lacagta la wareejinayo waa in ay ka weynaataa 0 (Handover amount must be > 0)",
      );
    }

    const driver = db.get<{ name: string }>("SELECT name FROM drivers WHERE id = ?", [
      input.driverId,
    ]);
    if (!driver) {
      throw new Error(`Driver ${input.driverId} not found`);
    }

    const handoverId = "dhnd-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    const handoverDate = input.handoverDate || new Date().toISOString().split("T")[0];

    db.run(
      `INSERT INTO driver_handovers (id, driver_id, amount, account_id, handover_date, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        handoverId,
        input.driverId,
        input.amount,
        input.accountId,
        handoverDate,
        input.notes || null,
        input.userId || null,
      ],
    );

    // Increase account balance
    db.run(
      `UPDATE payment_accounts SET balance = balance + ?, updated_at = datetime('now') WHERE id = ?`,
      [input.amount, input.accountId],
    );

    // Financial transaction
    db.run(
      `INSERT INTO financial_transactions (
        id, transaction_date, kind, category, amount, account_id, reference, source_module, source_id, note, created_by
      ) VALUES (?, ?, 'collection', 'Driver Cash Handover', ?, ?, ?, 'driver_handovers', ?, ?, ?)`,
      [
        "txn-" + Math.random().toString(36).substring(2, 9),
        handoverDate,
        input.amount,
        input.accountId,
        handoverId,
        handoverId,
        `Lacag qabasho wadihii: ${driver.name} ($${input.amount})`,
        input.userId || null,
      ],
    );

    logAudit(
      {
        userId: input.userId,
        action: "DRIVER_HANDOVER",
        module: "logistics",
        recordId: handoverId,
        afterState: { driver: driver.name, amount: input.amount, accountId: input.accountId },
      },
      db,
    );

    return { id: handoverId, driver: driver.name, amount: input.amount };
  });
}
