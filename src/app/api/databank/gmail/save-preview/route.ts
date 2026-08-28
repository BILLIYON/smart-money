import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

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
      for (const entry of entries) {
        await pool.query(
          `INSERT INTO databank_entries (
            user_id, source, entry_type, amount, description, category, entry_date, gmail_message_id, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (gmail_message_id) DO UPDATE SET
            entry_type = EXCLUDED.entry_type,
            amount = EXCLUDED.amount,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            entry_date = EXCLUDED.entry_date,
            metadata = EXCLUDED.metadata;`,
          [
            user.id,
            entry.source || "gmail",
            entry.entry_type || "expense",
            entry.amount || 0,
            entry.description || "",
            entry.category || "Uncategorized",
            entry.entry_date || new Date().toISOString(),
            entry.gmail_message_id || null,
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
