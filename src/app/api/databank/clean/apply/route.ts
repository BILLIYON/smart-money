import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { Pool } from "pg";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

type AppliedFix = {
  id: string;
  action: "update" | "delete";
  patch?: {
    entry_type?: string;
    amount?: number;
    category?: string;
    description?: string;
  };
};

export async function POST(req: Request) {
  const pool = getPool();
  try {
    const { userId, error, supabase } = await requireAuth();
    if (error || !userId) {
      return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fixes } = (await req.json()) as { fixes: AppliedFix[] };

    if (!Array.isArray(fixes) || fixes.length === 0) {
      return NextResponse.json({ error: "fixes must be a non-empty array" }, { status: 400 });
    }

    let updatedCount = 0;
    let deletedCount = 0;

    for (const fix of fixes) {
      if (!fix.id) continue;

      if (fix.action === "delete") {
        const { rowCount } = await pool.query(
          `DELETE FROM databank_entries WHERE user_id = $1 AND id = $2;`,
          [userId, fix.id]
        );
        deletedCount += rowCount || 0;
      } else if (fix.action === "update" && fix.patch) {
        const updates: string[] = [];
        const values: any[] = [userId, fix.id];
        let idx = 3;

        if (fix.patch.entry_type) {
          updates.push(`entry_type = $${idx++}`);
          values.push(fix.patch.entry_type);
        }
        if (typeof fix.patch.amount === "number") {
          updates.push(`amount = $${idx++}`);
          values.push(fix.patch.amount);
        }
        if (fix.patch.category) {
          updates.push(`category = $${idx++}`);
          values.push(fix.patch.category);
        }
        if (fix.patch.description) {
          updates.push(`description = $${idx++}`);
          values.push(fix.patch.description);
        }

        if (updates.length > 0) {
          const { rowCount } = await pool.query(
            `UPDATE databank_entries SET ${updates.join(", ")} WHERE user_id = $1 AND id = $2;`,
            values
          );
          updatedCount += rowCount || 0;
        }
      }
    }

    // Record agent audit action
    const totalProcessed = updatedCount + deletedCount;
    if (totalProcessed > 0 && supabase) {
      await supabase.from("agent_actions").insert({
        user_id: userId,
        title: "DataBank AI Clean",
        action: "databank_clean",
        description: `AI DataBank Clean applied: updated ${updatedCount} transactions, deleted ${deletedCount} duplicates/anomalies.`,
        status: "executed",
        executed_at: new Date().toISOString(),
        metadata: { updatedCount, deletedCount, fixesCount: fixes.length },
      }).catch((e: any) => console.warn("[clean/apply] Audit logging warning:", e));
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      deletedCount,
      totalProcessed,
    });
  } catch (err: any) {
    console.error("[POST /api/databank/clean/apply] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to apply DataBank fixes" }, { status: 500 });
  } finally {
    await pool.end();
  }
}
