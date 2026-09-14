import { getDatabase, SqlDatabase } from "../db/database";

export interface AuditLogInput {
  userId?: string;
  action: string;
  module: string;
  recordId?: string;
  beforeState?: unknown;
  afterState?: unknown;
  reason?: string;
}

export async function logAudit(input: AuditLogInput, externalDb?: SqlDatabase) {
  try {
    const db = externalDb || (await getDatabase());
    const id = "aud-" + Math.random().toString(36).substring(2, 9) + "-" + Date.now();
    const beforeStr = input.beforeState ? JSON.stringify(input.beforeState) : null;
    const afterStr = input.afterState ? JSON.stringify(input.afterState) : null;

    db.run(
      `INSERT INTO audit_logs (id, user_id, action, module, record_id, before_state, after_state, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.userId || null,
        input.action,
        input.module,
        input.recordId || null,
        beforeStr,
        afterStr,
        input.reason || null,
      ],
    );
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

export async function listAuditLogs(module?: string, limit = 50, offset = 0) {
  const db = await getDatabase();
  if (module) {
    return db.query(
      `SELECT * FROM audit_logs WHERE module = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [module, limit, offset],
    );
  }
  return db.query(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?`, [
    limit,
    offset,
  ]);
}
