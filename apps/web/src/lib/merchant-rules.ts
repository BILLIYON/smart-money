import { Pool } from "pg";

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

export interface MerchantRule {
  id: string;
  user_id: string;
  merchant_name: string;
  category: string;
  intent?: string | null;
  created_at: string;
  last_confirmed: string;
}

/**
 * Normalizes merchant names for consistent matching (e.g., "BOLT NIGERIA" -> "bolt")
 */
export function normalizeMerchant(raw: string): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/^(pos\s+purchase|web\s+purchase|direct\s+debit|transfer\s+to|trf\s+to|nip\s+to)\s+/i, "")
    .replace(/\s+(nigeria|ng|ltd|limited|inc|plc|pos|web|app)\b/gi, "")
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fetch all saved merchant rules for a user
 */
export async function getMerchantRules(userId: string): Promise<MerchantRule[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, user_id, merchant_name, category, intent, created_at, last_confirmed
     FROM public.merchant_rules
     WHERE user_id = $1
     ORDER BY last_confirmed DESC;`,
    [userId]
  );
  return rows;
}

/**
 * Upsert a merchant memory rule when confirmed by user in DataBank IQ quiz
 */
export async function upsertMerchantRule(
  userId: string,
  merchantName: string,
  category: string,
  intent?: string | null
): Promise<MerchantRule> {
  const pool = getPool();
  const cleanName = merchantName.trim();

  const { rows } = await pool.query(
    `INSERT INTO public.merchant_rules (
       user_id, merchant_name, category, intent, last_confirmed
     ) VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, merchant_name) DO UPDATE SET
       category = EXCLUDED.category,
       intent = COALESCE(EXCLUDED.intent, merchant_rules.intent),
       last_confirmed = NOW()
     RETURNING id, user_id, merchant_name, category, intent, created_at, last_confirmed;`,
    [userId, cleanName, category.toLowerCase().trim(), intent ? intent.trim() : null]
  );

  return rows[0];
}

/**
 * Delete a specific merchant rule
 */
export async function deleteMerchantRule(userId: string, ruleId: string): Promise<boolean> {
  const pool = getPool();
  const { rowCount } = await pool.query(
    `DELETE FROM public.merchant_rules WHERE id = $1 AND user_id = $2;`,
    [ruleId, userId]
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Apply all saved merchant rules against a user's transactions
 * Updates category & intent for any matching records that are uncategorized or have null intent
 */
export async function applyMerchantRules(
  userId: string
): Promise<{ matchedRules: number; updatedEntries: number }> {
  const rules = await getMerchantRules(userId);
  if (!rules.length) {
    return { matchedRules: 0, updatedEntries: 0 };
  }

  const pool = getPool();
  let totalUpdated = 0;
  let rulesApplied = 0;

  for (const rule of rules) {
    if (!rule.merchant_name) continue;

    // Build pattern for ILIKE matching
    const searchPattern = `%${rule.merchant_name.trim()}%`;

    const { rowCount } = await pool.query(
      `UPDATE public.databank_entries
       SET 
         category = CASE 
           WHEN category IS NULL OR category IN ('', 'uncategorized', 'general expense', 'other', 'transfer') 
           THEN $1 
           ELSE category 
         END,
         intent = CASE 
           WHEN intent IS NULL AND $2::text IS NOT NULL 
           THEN $2 
           ELSE intent 
         END
       WHERE user_id = $3
         AND description ILIKE $4
         AND (
           category IS NULL 
           OR category IN ('', 'uncategorized', 'general expense', 'other', 'transfer')
           OR (intent IS NULL AND $2::text IS NOT NULL)
         );`,
      [rule.category, rule.intent || null, userId, searchPattern]
    );

    if (rowCount && rowCount > 0) {
      totalUpdated += rowCount;
      rulesApplied++;
    }
  }

  return { matchedRules: rulesApplied, updatedEntries: totalUpdated };
}
