import { createClient, type Client } from "@libsql/client";
import path from "path";
import fs from "fs";
import { SCHEMA_SQL } from "./schema.sql";
import { seedDatabase } from "./seed";

let clientInstance: Client | null = null;
let initPromise: Promise<void> | null = null;

export function getDb(): Client {
  if (!clientInstance) {
    const dataDir = path.resolve(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.resolve(dataDir, "banadir.db");
    clientInstance = createClient({
      url: `file:${dbPath}`,
    });
  }
  return clientInstance;
}

export async function initDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const db = getDb();
      // Split schema into statements and execute
      const statements = SCHEMA_SQL.split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        try {
          await db.execute(statement);
        } catch (error) {
          console.error("Error executing schema statement:", error, "\nStatement:", statement);
        }
      }

      // Run seeding
      try {
        await seedDatabase(db);
      } catch (err) {
        console.error("Error during database seed:", err);
      }
    })();
  }
  return initPromise;
}
