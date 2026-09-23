import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { Pool } from "pg";
import { upsertMerchantRule } from "@/lib/merchant-rules";
import { getUserDataBankIQ } from "@/lib/databank-iq";
import { getMilestoneInsight } from "@/lib/databank-iq-generator";

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

export async function POST(req: Request) {
  const pool = getPool();
  try {
    const { userId, error } = await requireAuth();
    if (error || !userId) {
      return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      questionId,
      tier,
      merchantName,
      matchingEntryIds,
      category,
      intent,
      isSplit,
      splitAllocations, // optional [{ category, percentage }]
      completedCount = 0,
    } = body;

    if (!Array.isArray(matchingEntryIds) || matchingEntryIds.length === 0) {
      return NextResponse.json({ error: "matchingEntryIds must be a non-empty array" }, { status: 400 });
    }

    let affectedCount = 0;

    // ── Tier 1: Merchant Memory Resolution ──────────────────────────────────
    if (tier === "tier1_merchant") {
      const cleanCategory = (category || "Shopping").trim();

      // 1. If merchant is confirmed, save to merchant_rules for future automated syncs
      if (merchantName && cleanCategory && !isSplit) {
        await upsertMerchantRule(userId, merchantName, cleanCategory, intent || null);
      }

      // 2. Batch update matching transactions
      const { rowCount } = await pool.query(
        `UPDATE public.databank_entries
         SET 
           category = $1,
           intent = COALESCE($2, intent)
         WHERE user_id = $3
           AND id = ANY($4::uuid[]);`,
        [cleanCategory, intent || null, userId, matchingEntryIds]
      );
      affectedCount = rowCount || 0;
    }

    // ── Tier 2: Ambiguous Transaction Resolution ────────────────────────────
    else if (tier === "tier2_ambiguous") {
      const cleanCategory = (category || "General Expense").trim();
      const { rowCount } = await pool.query(
        `UPDATE public.databank_entries
         SET 
           category = $1,
           intent = COALESCE($2, intent)
         WHERE user_id = $3
           AND id = ANY($4::uuid[]);`,
        [cleanCategory, intent || null, userId, matchingEntryIds]
      );
      affectedCount = rowCount || 0;
    }

    // ── Tier 3: Financial Intent Capture ────────────────────────────────────
    else if (tier === "tier3_intent") {
      const cleanIntent = (intent || "Savings").trim();
      const cleanCategory = (category || "Savings & Investments").trim();

      const { rowCount } = await pool.query(
        `UPDATE public.databank_entries
         SET 
           intent = $1,
           category = CASE 
             WHEN category IS NULL OR category IN ('', 'uncategorized', 'transfer', 'general expense') 
             THEN $2 
             ELSE category 
           END
         WHERE user_id = $3
           AND id = ANY($4::uuid[]);`,
        [cleanIntent, cleanCategory, userId, matchingEntryIds]
      );
      affectedCount = rowCount || 0;
    }

    // 3. Recalculate Live DataBank IQ Score
    const updatedIQ = await getUserDataBankIQ(userId);

    // 4. Check for 5-question milestone preview insight
    const milestoneInsight = getMilestoneInsight(
      completedCount + 1,
      updatedIQ.score,
      updatedIQ.level.name
    );

    return NextResponse.json({
      success: true,
      questionId,
      resolvedCount: affectedCount,
      iq: updatedIQ,
      milestoneInsight,
    });
  } catch (err: any) {
    console.error("[iq/answer] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process answer" },
      { status: 500 }
    );
  }
}
