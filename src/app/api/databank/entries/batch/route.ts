import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { Pool } from "pg";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

export async function POST(req: Request) {
  const pool = getPool();
  try {
    const { userId, error } = await requireAuth();
    if (error || !userId) {
      return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, ids, category } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
    }

    if (action === "delete") {
      const { rowCount } = await pool.query(
        `DELETE FROM databank_entries WHERE user_id = $1 AND id = ANY($2::uuid[]);`,
        [userId, ids]
      );
      return NextResponse.json({ success: true, count: rowCount });
    }

    if (action === "set_category") {
      if (!category || typeof category !== "string") {
        return NextResponse.json({ error: "category is required" }, { status: 400 });
      }
      const { rowCount } = await pool.query(
        `UPDATE databank_entries SET category = $1 WHERE user_id = $2 AND id = ANY($3::uuid[]);`,
        [category.trim(), userId, ids]
      );
      return NextResponse.json({ success: true, count: rowCount });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("[/api/databank/entries/batch] POST Error:", err);
    return NextResponse.json({ error: err.message || "Failed to execute batch action" }, { status: 500 });
  } finally {
    await pool.end();
  }
}
