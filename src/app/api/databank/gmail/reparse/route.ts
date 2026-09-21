import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { inferEntryType, inferCategory, extractDescription, cleanExtractedDescription } from "@/lib/gmail-parser";
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
      `SELECT id, entry_type, amount, description, category, metadata, gmail_message_id
       FROM databank_entries
       WHERE user_id = $1
       ORDER BY created_at DESC;`,
      [userId]
    );

    let updatedCount = 0;
    let invertedCount = 0;

    for (const row of rows) {
      const meta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata || {});
      const subject = meta.email_subject || meta.subject || "";
      const from = meta.email_from || meta.from || "";
      const bodySnippet = meta.email_body_snippet || "";
      const description = row.description || "";

      const textToAnalyze = `${subject} ${description} ${bodySnippet} ${meta.reason || ""}`.trim();
      if (!textToAnalyze) continue;

      const correctedType = inferEntryType(textToAnalyze, subject, from);
      const correctedCategory = inferCategory(textToAnalyze, correctedType, meta.bank || meta.provider);

      let needsUpdate = false;
      let newType = row.entry_type;
      let newCat = row.category;
      let newDesc = row.description;

      if (correctedType !== row.entry_type) {
        newType = correctedType;
        needsUpdate = true;
        invertedCount++;
      }

      if (row.category === "General Expense" || row.category === "Uncategorized" || row.category === "Income" || !row.category) {
        if (correctedCategory && correctedCategory !== row.category) {
          newCat = correctedCategory;
          needsUpdate = true;
        }
      }

      // Check if description is dirty (contains Current Balance, Available Balance, Order Number, or is generic)
      const isDirtyDesc =
        !description ||
        /current\s*balance|available\s*balance|ledger\s*balance|merchant\s*order|order\s*number|txn\s*no/i.test(description) ||
        /^(bank transaction|html bank alert|bank alert|transaction notification|debit alert|credit alert)$/i.test(description);

      if (isDirtyDesc) {
        const extracted = extractDescription(`${subject} ${bodySnippet} ${description}`, from, meta.bank || meta.provider);
        const cleanedExt = cleanExtractedDescription(extracted, meta.bank || meta.provider);
        if (cleanedExt && cleanedExt !== description) {
          newDesc = cleanedExt;
          needsUpdate = true;
        }
      }

      // Check bank resolution correctness from email_from
      let newMeta = { ...meta };
      let metaUpdated = false;
      if (from) {
        let correctBank = null;
        if (/gtbank|gtb|guaranty/i.test(from)) correctBank = "GTBank";
        else if (/zenith/i.test(from)) correctBank = "Zenith Bank";
        else if (/access/i.test(from)) correctBank = "Access Bank";
        else if (/uba/i.test(from)) correctBank = "UBA";
        else if (/firstbank|first bank/i.test(from)) correctBank = "FirstBank";
        else if (/stanbic/i.test(from)) correctBank = "Stanbic IBTC";
        else if (/fcmb/i.test(from)) correctBank = "FCMB";

        if (correctBank && meta.bank !== correctBank) {
          newMeta.bank = correctBank;
          newMeta.provider = correctBank;
          metaUpdated = true;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await pool.query(
          `UPDATE databank_entries
           SET entry_type = $1, category = $2, description = $3, metadata = $4
           WHERE id = $5 AND user_id = $6;`,
          [newType, newCat, newDesc, JSON.stringify(newMeta), row.id, userId]
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
