import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { inferEntryType, inferCategory } from "@/lib/gmail-parser";
import { Pool } from "pg";

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money";
const isRemoteDb = dbUrl.includes("supabase.com") || dbUrl.includes("pooler") || dbUrl.includes("aws-");

function getPool() {
  return new Pool({
    connectionString: dbUrl,
    ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
  });
}

export const maxDuration = 120;

export async function POST(req: Request) {
  const pool = getPool();
  try {
    const { userId, error } = await requireAuth(req);
    if (error || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rows } = await pool.query(
      `SELECT id, entry_type, amount, description, category, metadata
       FROM databank_entries
       WHERE user_id = $1
       ORDER BY created_at DESC;`,
      [userId]
    );

    let updatedCount = 0;
    let invertedCount = 0;

    for (const row of rows) {
      const meta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata || {});
      const subject = meta.email_subject || meta.subject || row.description || "";
      const from = meta.email_from || meta.from || "";
      const description = row.description || "";

      const textToAnalyze = `${subject} ${description}`.trim();
      if (!textToAnalyze) continue;

      const correctedType = inferEntryType(textToAnalyze, subject, from);
      const correctedCategory = inferCategory(textToAnalyze, correctedType, meta.bank || meta.provider);

      let needsUpdate = false;
      let newType = row.entry_type;
      let newCat = row.category;

      if (correctedType !== row.entry_type) {
        newType = correctedType;
        needsUpdate = true;
        invertedCount++;
      }

      if (row.category === "General Expense" || row.category === "Uncategorized" || !row.category) {
        if (correctedCategory && correctedCategory !== row.category) {
          newCat = correctedCategory;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await pool.query(
          `UPDATE databank_entries
           SET entry_type = $1, category = $2
           WHERE id = $3 AND user_id = $4;`,
          [newType, newCat, row.id, userId]
        );
        updatedCount++;
      }
    }

    return NextResponse.json({
      ok: true,
      audited: rows.length,
      updated: updatedCount,
      invertedDirectionsFixed: invertedCount,
      message: `Audit complete. Reparsed ${rows.length} records, fixed ${invertedCount} inverted transaction directions (income/expense), and updated ${updatedCount} entries.`,
    });
  } catch (err: any) {
    console.error("[/api/databank/gmail/reparse] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to reparse databank entries" }, { status: 500 });
  } finally {
    await pool.end();
  }
}
