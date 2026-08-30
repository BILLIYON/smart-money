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

function safeStrDate(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val.split("T")[0];
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? "" : val.toISOString().split("T")[0];
  }
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? String(val).split("T")[0] : d.toISOString().split("T")[0];
  } catch {
    return String(val).split("T")[0];
  }
}

export async function GET(req: Request) {
  const pool = getPool();
  try {
    const { userId, error } = await requireAuth();
    if (error || !userId) {
      return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const type = url.searchParams.get("type")?.trim() || "all";
    const category = url.searchParams.get("category")?.trim() || "all";
    const source = url.searchParams.get("source")?.trim() || "all";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(5, parseInt(url.searchParams.get("limit") || "25", 10)));
    const offset = (page - 1) * limit;
    const sortBy = url.searchParams.get("sortBy") || "entry_date";
    const sortOrder = url.searchParams.get("sortOrder")?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // Build WHERE clauses
    const whereClauses: string[] = ["user_id = $1"];
    const queryParams: any[] = [userId];

    if (search) {
      queryParams.push(`%${search}%`);
      const paramIdx = queryParams.length;
      whereClauses.push(
        `(description ILIKE $${paramIdx} OR category ILIKE $${paramIdx} OR source ILIKE $${paramIdx} OR (metadata->>'bank') ILIKE $${paramIdx} OR (metadata->>'email_subject') ILIKE $${paramIdx})`
      );
    }

    if (type !== "all") {
      queryParams.push(type);
      whereClauses.push(`entry_type = $${queryParams.length}`);
    }

    if (category !== "all") {
      queryParams.push(category);
      whereClauses.push(`category = $${queryParams.length}`);
    }

    if (source !== "all") {
      queryParams.push(source);
      whereClauses.push(`source = $${queryParams.length}`);
    }

    const whereSql = whereClauses.join(" AND ");

    // Valid sort columns
    const validSortCols: Record<string, string> = {
      entry_date: "entry_date",
      amount: "ABS(amount)",
      description: "description",
      category: "category",
      source: "source",
      created_at: "created_at",
    };
    const sortCol = validSortCols[sortBy] || "entry_date";

    // Count total filtered entries and get totals in parallel
    const [countRes, entriesRes, categoriesRes, sourcesRes, statsRes] = await Promise.all([
      pool.query(`SELECT count(*) FROM databank_entries WHERE ${whereSql};`, queryParams),
      pool.query(
        `SELECT id, entry_type, amount, description, category, entry_date, source, metadata, created_at
         FROM databank_entries
         WHERE ${whereSql}
         ORDER BY ${sortCol} ${sortOrder}, created_at DESC
         LIMIT ${limit} OFFSET ${offset};`,
        queryParams
      ),
      pool.query(
        `SELECT DISTINCT category, count(*) as count
         FROM databank_entries
         WHERE user_id = $1 AND category IS NOT NULL AND category != ''
         GROUP BY category
         ORDER BY count DESC;`,
        [userId]
      ),
      pool.query(
        `SELECT DISTINCT source, count(*) as count
         FROM databank_entries
         WHERE user_id = $1 AND source IS NOT NULL AND source != ''
         GROUP BY source
         ORDER BY count DESC;`,
        [userId]
      ),
      pool.query(
        `SELECT 
           COALESCE(SUM(CASE WHEN entry_type = 'income' THEN ABS(amount) ELSE 0 END), 0) as total_inflows,
           COALESCE(SUM(CASE WHEN entry_type IN ('expense', 'subscription') THEN ABS(amount) ELSE 0 END), 0) as total_outflows,
           COUNT(*) as total_count
         FROM databank_entries
         WHERE user_id = $1;`,
        [userId]
      ),
    ]);

    const total = parseInt(countRes.rows[0]?.count || "0", 10);
    const totalPages = Math.ceil(total / limit);

    const entries = (entriesRes.rows ?? []).map((e) => ({
      id: e.id,
      entry_type: e.entry_type,
      amount: toNum(e.amount), // kobo
      amountNaira: Math.abs(toNum(e.amount)) / 100,
      description: e.description || "Transaction",
      category: e.category || "Uncategorized",
      entry_date: safeStrDate(e.entry_date),
      source: e.source || "manual",
      metadata: e.metadata || {},
      created_at: e.created_at,
    }));

    const totalInflowsKobo = toNum(statsRes.rows[0]?.total_inflows);
    const totalOutflowsKobo = toNum(statsRes.rows[0]?.total_outflows);

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      stats: {
        totalCount: toNum(statsRes.rows[0]?.total_count),
        totalInflowsNaira: totalInflowsKobo / 100,
        totalOutflowsNaira: totalOutflowsKobo / 100,
        netCashflowNaira: (totalInflowsKobo - totalOutflowsKobo) / 100,
      },
      categories: categoriesRes.rows.map((c) => ({
        name: c.category,
        count: parseInt(c.count, 10),
      })),
      sources: sourcesRes.rows.map((s) => ({
        name: s.source,
        count: parseInt(s.count, 10),
      })),
    });
  } catch (err: any) {
    console.error("[/api/databank/entries] GET Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch entries" }, { status: 500 });
  } finally {
    await pool.end();
  }
}

export async function POST(req: Request) {
  const pool = getPool();
  try {
    const { userId, error } = await requireAuth();
    if (error || !userId) {
      return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { description, amount, entry_type, category, entry_date, source, metadata } = body;

    if (!description || amount === undefined || !entry_type || !entry_date) {
      return NextResponse.json(
        { error: "Description, amount, entry_type, and entry_date are required" },
        { status: 400 }
      );
    }

    // amount passed in Naira or Kobo; ensure kobo integer
    const amountKobo = Math.round(Number(amount) * (body.isNaira ? 100 : 1));

    const { rows } = await pool.query(
      `INSERT INTO databank_entries (
        user_id, source, entry_type, amount, description, category, entry_date, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, user_id, source, entry_type, amount, description, category, entry_date, metadata, created_at;`,
      [
        userId,
        source || "manual",
        entry_type,
        amountKobo,
        description.trim(),
        category ? category.trim() : "Uncategorized",
        entry_date,
        JSON.stringify(metadata || {}),
      ]
    );

    return NextResponse.json({ success: true, entry: rows[0] });
  } catch (err: any) {
    console.error("[/api/databank/entries] POST Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create entry" }, { status: 500 });
  } finally {
    await pool.end();
  }
}
