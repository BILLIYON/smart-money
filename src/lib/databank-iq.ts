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

export type IQLevelName = "Blurry" | "Developing" | "Clear" | "Sharp" | "Elite";

export interface IQLevelInfo {
  name: IQLevelName;
  min: number;
  max: number;
  badge: string;
  tagline: string;
  description: string;
  color: string;
  bgRgba: string;
}

export const IQ_LEVELS: Record<IQLevelName, IQLevelInfo> = {
  Blurry: {
    name: "Blurry",
    min: 0,
    max: 40,
    badge: "🌫️ Blurry",
    tagline: "Generic financial visibility",
    description: "Buddy can only give generic advice because major spending blind spots exist.",
    color: "#94A3B8",
    bgRgba: "rgba(148, 163, 184, 0.12)",
  },
  Developing: {
    name: "Developing",
    min: 41,
    max: 65,
    badge: "🌱 Developing",
    tagline: "Income visible, spending hazy",
    description: "Buddy understands your income streams but has limited context on where money goes.",
    color: "#F59E0B",
    bgRgba: "rgba(245, 158, 11, 0.12)",
  },
  Clear: {
    name: "Clear",
    min: 66,
    max: 80,
    badge: "✨ Clear",
    tagline: "Accurate merchant breakdown",
    description: "Buddy can now give specific, accurate advice based on classified merchants.",
    color: "#3B82F6",
    bgRgba: "rgba(59, 130, 246, 0.12)",
  },
  Sharp: {
    name: "Sharp",
    min: 81,
    max: 92,
    badge: "⚡ Sharp",
    tagline: "Deep financial clarity",
    description: "Buddy has a strong understanding of your lifestyle patterns, subscriptions, and recurring bills.",
    color: "#8B5CF6",
    bgRgba: "rgba(139, 92, 246, 0.12)",
  },
  Elite: {
    name: "Elite",
    min: 93,
    max: 100,
    badge: "👑 Elite",
    tagline: "Hyper-personalised financial intelligence",
    description: "Maximum advice precision. Every savings goal, investment intent, and merchant is locked in.",
    color: "#00C48C",
    bgRgba: "rgba(0, 196, 140, 0.14)",
  },
};

export function getIQLevel(score: number): IQLevelInfo {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s <= 40) return IQ_LEVELS.Blurry;
  if (s <= 65) return IQ_LEVELS.Developing;
  if (s <= 80) return IQ_LEVELS.Clear;
  if (s <= 92) return IQ_LEVELS.Sharp;
  return IQ_LEVELS.Elite;
}

export interface IQCalculationResult {
  score: number;
  level: IQLevelInfo;
  totalTransactions: number;
  categorisedTransactions: number;
  uncategorisedTransactions: number;
  intentCapturedTransactions: number;
  totalValueMajor: number;
  categorisedValueMajor: number;
  intentValueMajor: number;
  categorisedPercent: number;
  intentPercent: number;
}

const UNCATEGORIZED_VALUES = new Set([
  "",
  "uncategorized",
  "uncategorised",
  "general expense",
  "other",
  "miscellaneous",
  "unknown",
  "transfer", // raw unlabelled transfers require intent/category
]);

/**
 * Calculates DataBank IQ score using exact PRD formula:
 * Score = (categorised_value / total_value) * 60 + (intent_captured_value / total_value) * 40
 */
export function computeIQScore(
  rows: Array<{
    amount: number | string;
    category?: string | null;
    intent?: string | null;
    entry_type?: string | null;
  }>
): IQCalculationResult {
  if (!rows || rows.length === 0) {
    return {
      score: 50,
      level: IQ_LEVELS.Developing,
      totalTransactions: 0,
      categorisedTransactions: 0,
      uncategorisedTransactions: 0,
      intentCapturedTransactions: 0,
      totalValueMajor: 0,
      categorisedValueMajor: 0,
      intentValueMajor: 0,
      categorisedPercent: 0,
      intentPercent: 0,
    };
  }

  let totalValueMinor = 0;
  let categorisedValueMinor = 0;
  let intentValueMinor = 0;
  let categorisedCount = 0;
  let intentCount = 0;

  for (const row of rows) {
    const amt = Math.abs(Number(row.amount) || 0);
    totalValueMinor += amt;

    const cat = (row.category || "").trim().toLowerCase();
    const isCategorised = cat.length > 0 && !UNCATEGORIZED_VALUES.has(cat);

    if (isCategorised) {
      categorisedValueMinor += amt;
      categorisedCount++;
    }

    const intent = (row.intent || "").trim();
    if (intent.length > 0) {
      intentValueMinor += amt;
      intentCount++;
    }
  }

  const categorisedRatio = totalValueMinor > 0 ? categorisedValueMinor / totalValueMinor : 0.5;
  const intentRatio = totalValueMinor > 0 ? intentValueMinor / totalValueMinor : 0.1;

  // Formula: 60% category completeness + 40% intent capture
  let rawScore = categorisedRatio * 60 + intentRatio * 40;
  rawScore = Math.max(10, Math.min(100, Math.round(rawScore)));

  const level = getIQLevel(rawScore);

  return {
    score: rawScore,
    level,
    totalTransactions: rows.length,
    categorisedTransactions: categorisedCount,
    uncategorisedTransactions: rows.length - categorisedCount,
    intentCapturedTransactions: intentCount,
    totalValueMajor: totalValueMinor / 100,
    categorisedValueMajor: categorisedValueMinor / 100,
    intentValueMajor: intentValueMinor / 100,
    categorisedPercent: Math.round(categorisedRatio * 100),
    intentPercent: Math.round(intentRatio * 100),
  };
}

/**
 * Fetch a user's transactions from the DB and calculate their live DataBank IQ
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
