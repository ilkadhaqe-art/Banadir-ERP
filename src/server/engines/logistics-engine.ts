import type { Client } from "@libsql/client";
import { postFinancialTransaction } from "./financial-engine";

export async function nextDeliveryNumber(db: Client): Promise<string> {
  const rs = await db.execute("SELECT COUNT(*) as count FROM deliveries");
  const count = Number(rs.rows[0]?.["count"] ?? 0) + 1;
  const year = new Date().getFullYear();
  return `DEL-${year}-${count.toString().padStart(4, "0")}`;
}

export async function createDelivery(
  db: Client,
  input: {
    order_id?: string | null;
    sale_id?: string | null;
    fulfillment?: "delivery" | "cargo";
    driver_id?: string | null;
    delivery_zone_id?: string | null;
    cargo_company_id?: string | null;
    recipient_name: string;
    recipient_phone: string;
    recipient_address: string;
    fee: number;
    fee_paid?: number;
    cod_amount?: number;
    cargo_tracking_no?: string | null;
    notes?: string | null;
  },
) {
  const delId = `del-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const delNo = await nextDeliveryNumber(db);
  const feePaid = input.fee_paid ?? 0;
  const feeBalance = Math.max(0, input.fee - feePaid);

  await db.execute({
    sql: `INSERT INTO deliveries (
      id, delivery_no, order_id, sale_id, status, fulfillment, driver_id,
      delivery_zone_id, cargo_company_id, recipient_name, recipient_phone,
      recipient_address, fee, fee_paid, fee_balance, cod_amount, cod_collected,
      cargo_tracking_no, notes, assigned_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    args: [
      delId,
      delNo,
      input.order_id ?? null,
      input.sale_id ?? null,
      input.driver_id ? "assigned" : "pending",
      input.fulfillment ?? "delivery",
      input.driver_id ?? null,
      input.delivery_zone_id ?? null,
      input.cargo_company_id ?? null,
      input.recipient_name,
      input.recipient_phone,
      input.recipient_address,
      input.fee,
      feePaid,
      feeBalance,
      input.cod_amount ?? 0,
      input.cargo_tracking_no ?? null,
      input.notes ?? null,
      input.driver_id ? new Date().toISOString() : null,
    ],
  });

  return { id: delId, delivery_no: delNo };
}

export async function updateDeliveryStatus(
  db: Client,
  input: {
    delivery_id: string;
    status:
      "pending" | "assigned" | "picked_up" | "in_transit" | "delivered" | "failed" | "returned";
    driver_id?: string | null;
    notes?: string | null;
    cod_collected?: number;
    actor_id?: string | null;
  },
) {
  const dRs = await db.execute({
    sql: "SELECT * FROM deliveries WHERE id = ?",
    args: [input.delivery_id],
  });
  if (dRs.rows.length === 0) {
    throw new Error(`Delivery ${input.delivery_id} not found`);
  }

  const delivery = dRs.rows[0];
  const now = new Date().toISOString();
  let deliveredAt = delivery["delivered_at"] ? String(delivery["delivered_at"]) : null;
  let assignedAt = delivery["assigned_at"] ? String(delivery["assigned_at"]) : null;

  if (input.status === "delivered" && !deliveredAt) {
    deliveredAt = now;
  }
  if (input.driver_id && !assignedAt) {
    assignedAt = now;
  }

  const codCollected =
    input.cod_collected !== undefined
      ? input.cod_collected
      : Number(delivery["cod_collected"] ?? 0);

  await db.execute({
    sql: `UPDATE deliveries SET
      status = ?,
      driver_id = COALESCE(?, driver_id),
      notes = COALESCE(?, notes),
      delivered_at = ?,
      assigned_at = ?,
      cod_collected = ?,
      updated_at = datetime('now')
    WHERE id = ?`,
    args: [
      input.status,
      input.driver_id ?? null,
      input.notes ?? null,
      deliveredAt,
      assignedAt,
      codCollected,
      input.delivery_id,
    ],
  });

  // Log fulfillment event
  await db.execute({
    sql: `INSERT INTO fulfillment_events (
      id, delivery_id, order_id, event_type, status, notes, created_by
    ) VALUES (?, ?, ?, 'status_change', ?, ?, ?)`,
    args: [
      `fe-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      input.delivery_id,
      delivery["order_id"] ? String(delivery["order_id"]) : null,
      input.status,
      input.notes ?? `Status updated to ${input.status}`,
      input.actor_id ?? "system",
    ],
  });

  return { success: true, delivery_id: input.delivery_id, status: input.status };
}

export async function recordDriverHandover(
  db: Client,
  input: {
    driver_id: string;
    delivery_id?: string | null;
    amount: number;
    payment_account_id: string;
    notes?: string | null;
    created_by?: string | null;
  },
) {
  if (input.amount <= 0) {
    throw new Error("Handover amount must be positive");
  }

  const countRs = await db.execute("SELECT COUNT(*) as count FROM driver_handovers");
  const count = Number(countRs.rows[0]?.["count"] ?? 0) + 1;
  const handoverNo = `HO-${new Date().getFullYear()}-${count.toString().padStart(4, "0")}`;
  const handoverId = `dho-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const today = new Date().toISOString().split("T")[0];

  // Insert driver handover
  await db.execute({
    sql: `INSERT INTO driver_handovers (
      id, handover_no, driver_id, delivery_id, amount, payment_account_id,
      handover_date, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      handoverId,
      handoverNo,
      input.driver_id,
      input.delivery_id ?? null,
      input.amount,
      input.payment_account_id,
      today,
      input.notes ?? null,
      input.created_by ?? "system",
    ],
  });

  // Post to financial transaction (cash deposit into cashier account)
  await postFinancialTransaction(db, {
    txnType: "driver_settlement",
    amount: input.amount,
    accountId: input.payment_account_id,
    category: "Driver Cash Handover",
    referenceType: "driver_handover",
    referenceId: handoverId,
    partyType: "driver",
    partyId: input.driver_id,
    description: `Driver COD handover #${handoverNo}`,
    createdBy: input.created_by ?? "system",
  });

  return { id: handoverId, handover_no: handoverNo, amount: input.amount };
}

export async function lookupDeliveryRate(db: Client, zoneId: string, companyId?: string) {
  if (companyId) {
    const rs = await db.execute({
      sql: "SELECT rate FROM delivery_rates WHERE zone_id = ? AND company_id = ?",
      args: [zoneId, companyId],
    });
    if (rs.rows.length > 0) {
      return Number(rs.rows[0]["rate"] ?? 0);
    }
  }

  const zRs = await db.execute({
    sql: "SELECT base_rate FROM delivery_zones WHERE id = ?",
    args: [zoneId],
  });
  if (zRs.rows.length > 0) {
    return Number(zRs.rows[0]["base_rate"] ?? 0);
  }
  return 0;
}

export async function lookupCargoRate(db: Client, companyId: string, destination: string) {
  const rs = await db.execute({
    sql: "SELECT rate_per_kg, rate_per_cbm, min_fee FROM cargo_rates WHERE company_id = ? AND LOWER(destination) LIKE LOWER(?)",
    args: [companyId, `%${destination}%`],
  });
  if (rs.rows.length > 0) {
    return {
      rate_per_kg: Number(rs.rows[0]["rate_per_kg"] ?? 0),
      rate_per_cbm: Number(rs.rows[0]["rate_per_cbm"] ?? 0),
      min_fee: Number(rs.rows[0]["min_fee"] ?? 0),
    };
  }

  const cRs = await db.execute({
    sql: "SELECT base_rate_per_kg, base_rate_per_cbm, min_charge FROM cargo_companies WHERE id = ?",
    args: [companyId],
  });
  if (cRs.rows.length > 0) {
    return {
      rate_per_kg: Number(cRs.rows[0]["base_rate_per_kg"] ?? 0),
      rate_per_cbm: Number(cRs.rows[0]["base_rate_per_cbm"] ?? 0),
      min_fee: Number(cRs.rows[0]["min_charge"] ?? 0),
    };
  }

  return { rate_per_kg: 0, rate_per_cbm: 0, min_fee: 0 };
}
