import fs from "fs";
import path from "path";
import initSqlJs, { Database, SqlValue } from "sql.js";
import { DATABASE_SCHEMA_SQL } from "./schema";
import { seedInitialData } from "./seed";

export interface SqlDatabase {
  exec(sql: string): void;
  run(sql: string, params?: SqlValue[]): { changes: number };
  query<T = Record<string, unknown>>(sql: string, params?: SqlValue[]): T[];
  get<T = Record<string, unknown>>(sql: string, params?: SqlValue[]): T | null;
  transaction<T>(fn: () => T): T;
  save(): void;
  rawDb: Database;
}

let instance: SqlDatabase | null = null;
let initPromise: Promise<SqlDatabase> | null = null;

const DB_DIR = path.resolve(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "banadir.sqlite");

export async function getDatabase(): Promise<SqlDatabase> {
  if (instance) {
    return instance;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    const SQL = await initSqlJs();
    let db: Database;

    if (fs.existsSync(DB_FILE)) {
      try {
        const fileBuffer = fs.readFileSync(DB_FILE);
        db = new SQL.Database(fileBuffer);
      } catch (err) {
        console.error("Error loading SQLite file, creating new database:", err);
        db = new SQL.Database();
      }
    } else {
      db = new SQL.Database();
    }

    // Enable foreign keys
    db.run("PRAGMA foreign_keys = ON;");

    // Execute schema
    db.exec(DATABASE_SCHEMA_SQL);

    let inTransaction = 0;

    const save = () => {
      if (inTransaction > 0) return;
      try {
        const data = db.export();
        fs.writeFileSync(DB_FILE, Buffer.from(data));
      } catch (err) {
        console.error("Failed to save SQLite database:", err);
      }
    };

    const sqlDb: SqlDatabase = {
      rawDb: db,
      save,
      exec(sql: string) {
        db.exec(sql);
        save();
      },
      run(sql: string, params?: SqlValue[]) {
        db.run(sql, params);
        save();
        const changesRes = db.exec("SELECT changes() as c;");
        const changes = (changesRes[0]?.values[0]?.[0] as number) || 0;
        return { changes };
      },
      query<T = Record<string, unknown>>(sql: string, params?: SqlValue[]): T[] {
        const stmt = db.prepare(sql);
        if (params && params.length > 0) {
          stmt.bind(params);
        }
        const results: T[] = [];
        while (stmt.step()) {
          const row = stmt.getAsObject() as unknown as T;
          results.push(row);
        }
        stmt.free();
        return results;
      },
      get<T = Record<string, unknown>>(sql: string, params?: SqlValue[]): T | null {
        const rows = this.query<T>(sql, params);
        return rows.length > 0 ? rows[0] : null;
      },
      transaction<T>(fn: () => T): T {
        inTransaction++;
        db.run("BEGIN TRANSACTION;");
        try {
          const result = fn();
          db.run("COMMIT;");
          return result;
        } catch (err) {
          try {
            db.run("ROLLBACK;");
          } catch (rbErr) {
            console.error("Rollback failed:", rbErr);
          }
          throw err;
        } finally {
          inTransaction--;
          save();
        }
      },
    };

    // Seed initial data
    seedInitialData(sqlDb);
    save();

    instance = sqlDb;
    return sqlDb;
  })();

  return initPromise;
}
