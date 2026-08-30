import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { Pool } from "pg";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

function toNum(val: any): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const pool = getPool();
  try {
    const { userId, error } = await requireAuth();
    if (error || !userId) {
      return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const { description, amount, entry_type, category, entry_date, isNaira } = body;

    // Check if entry belongs to user
    const checkRes = await pool.query(
      `SELECT id, amount, entry_type, description, category, entry_date, metadata FROM databank_entries WHERE id = $1 AND user_id = $2 LIMIT 1;`,
      [id, userId]
    );

    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const existing = checkRes.rows[0];

    let newAmount = existing.amount;
    if (amount !== undefined) {
      newAmount = Math.round(Number(amount) * (isNaira ? 100 : 1));
    }

    const newDescription = description !== undefined ? String(description).trim() : existing.description;
    const newEntryType = entry_type !== undefined ? String(entry_type).trim() : existing.entry_type;
    const newCategory = category !== undefined ? String(category).trim() : existing.category;
    const newDate = entry_date !== undefined ? String(entry_date).split("T")[0] : existing.entry_date;

    const { rows } = await pool.query(
      `UPDATE databank_entries
       SET description = $1,
           amount = $2,
           entry_type = $3,
           category = $4,
           entry_date = $5
       WHERE id = $6 AND user_id = $7
       RETURNING id, user_id, source, entry_type, amount, description, category, entry_date, metadata, created_at;`,
      [newDescription, newAmount, newEntryType, newCategory, newDate, id, userId]
    );

    return NextResponse.json({ success: true, entry: rows[0] });
  } catch (err: any) {
    console.error("[/api/databank/entries/[id]] PATCH Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update transaction" }, { status: 500 });
  } finally {
    await pool.end();
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const pool = getPool();
  try {
    const { userId, error } = await requireAuth();
    if (error || !userId) {
      return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    const { rowCount } = await pool.query(
      `DELETE FROM databank_entries WHERE id = $1 AND user_id = $2;`,
      [id, userId]
    );

    if (rowCount === 0) {
      return NextResponse.json({ error: "Transaction not found or already deleted" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[/api/databank/entries/[id]] DELETE Error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete transaction" }, { status: 500 });
  } finally {
    await pool.end();
  }
}
