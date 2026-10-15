import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!poolInstance) {
    const isRemote =
      config.databaseUrl.includes("supabase.com") ||
      config.databaseUrl.includes("pooler") ||
      config.databaseUrl.includes("aws-");

    poolInstance = new Pool({
      connectionString: config.databaseUrl,
      ssl: isRemote ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
    });

    poolInstance.on("error", (err) => {
      console.error("[PartnerService DB Pool Error]", err);
    });
  }
  return poolInstance;
}

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const pool = getPool();
  return pool.query<T>(text, params);
}
