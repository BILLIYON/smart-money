import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

function sanitizeDateToYYYYMMDD(rawDate: any): string {
  if (!rawDate) return new Date().toISOString().split("T")[0];
  const str = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // Strip trailing (UTC) or parenthetical text if present
  const cleanStr = str.replace(/\s*\([^)]*\)/g, "").trim();
  const d = new Date(cleanStr);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entries } = await req.json();

    if (!Array.isArray(entries)) {
      return NextResponse.json({ error: "entries must be an array" }, { status: 400 });
    }

    if (entries.length > 0) {
      await pool.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS databank_entries_gmail_message_id_key ON public.databank_entries (gmail_message_id);`
      ).catch(() => {});

      for (const entry of entries) {
        const gmailMsgId =
          entry.gmail_message_id &&
          typeof entry.gmail_message_id === "string" &&
          entry.gmail_message_id.trim()
            ? entry.gmail_message_id.trim()
            : null;

        const cleanDate = sanitizeDateToYYYYMMDD(entry.entry_date);
        const validSource = ["upload", "gmail", "manual", "openbanking"].includes(entry.source) ? entry.source : "gmail";

        await pool.query(
          `INSERT INTO databank_entries (
            user_id, source, entry_type, amount, description, category, entry_date, gmail_message_id, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (gmail_message_id) WHERE gmail_message_id IS NOT NULL DO UPDATE SET
            entry_type = EXCLUDED.entry_type,
            amount = EXCLUDED.amount,
            description = COALESCE(NULLIF(databank_entries.description, ''), EXCLUDED.description),
            category = CASE
              WHEN databank_entries.category IS NOT NULL AND databank_entries.category NOT IN ('', 'Uncategorized', 'General Expense')
              THEN databank_entries.category
              ELSE EXCLUDED.category
            END,
            entry_date = EXCLUDED.entry_date,
            metadata = EXCLUDED.metadata;`,
          [
            user.id,
            validSource,
            entry.entry_type || "expense",
            entry.amount || 0,
            entry.description || "",
            entry.category || "Uncategorized",
            cleanDate,
            gmailMsgId,
            JSON.stringify(entry.metadata || {}),
          ]
        );
      }
    }

    const { rows } = await pool.query(
      `SELECT metadata FROM user_integrations WHERE user_id = $1 AND provider = 'gmail' LIMIT 1;`,
      [user.id]
    );

    const metadata = (rows[0]?.metadata as any) || {};

    const updatedMeta = {
      ...metadata,
      is_syncing: false,
      sync_progress: 100,
      sync_message: `Synced ${entries.length} new transactions`,
    };

    await pool.query(
      `UPDATE user_integrations SET last_synced_at = NOW(), metadata = $1 WHERE user_id = $2 AND provider = 'gmail';`,
      [JSON.stringify(updatedMeta), user.id]
    );

    return NextResponse.json({ success: true, count: entries.length });
  } catch (err: any) {
    console.error("[save-preview] Error saving preview:", err);
    return NextResponse.json({ error: err.message || "Failed to save data" }, { status: 500 });
  }
}
