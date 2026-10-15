import { Pool } from "pg";
import { computeIQScore, IQCalculationResult } from "./databank-iq";

let sharedPool: Pool | null = null;
function getPool() {
  if (!sharedPool) {
    const dbUrl = process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money";
    const isRemote = dbUrl.includes("supabase.com") || dbUrl.includes("pooler") || dbUrl.includes("aws-");
    sharedPool = new Pool({
      connectionString: dbUrl,
      ssl: isRemote ? { rejectUnauthorized: false } : false,
      max: 10,
    });
  }
  return sharedPool;
}

/**
 * Fetch a user's transactions from the DB and calculate their live DataBank IQ (Server Only)
 */
export async function getUserDataBankIQ(userId: string): Promise<IQCalculationResult> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT amount, category, intent, entry_type
     FROM public.databank_entries
     WHERE user_id = $1
     ORDER BY entry_date DESC
     LIMIT 500;`,
    [userId]
  );

  const result = computeIQScore(rows);

  // Sync latest score to users table asynchronously
  pool.query(
    `UPDATE public.users 
     SET databank_iq_score = $1, databank_iq_level = $2 
     WHERE id = $3;`,
    [result.score, result.level.name, userId]
  ).catch((err) => console.warn("[getUserDataBankIQ] Failed to persist user score:", err));

  return result;
}
