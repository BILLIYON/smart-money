import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { Pool } from "pg";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

export type SpendingExclusions = {
  categories: string[];
  platforms: string[];
  keywords: string[];
  types: string[];
};

export async function GET() {
  const pool = getPool();
  try {
    const { userId, error } = await requireAuth();
    if (error || !userId) {
      return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [userRes, catRes] = await Promise.all([
      pool.query(`SELECT spending_exclusions FROM users WHERE id = $1 LIMIT 1;`, [userId]),
      pool.query(
        `SELECT DISTINCT 
           COALESCE(metadata->>'bank', metadata->>'provider', metadata->>'platform', source) as platform,
           category, 
           entry_type 
         FROM databank_entries 
         WHERE user_id = $1
         LIMIT 200;`,
        [userId]
      ),
    ]);

    const rawExclusions = userRes.rows[0]?.spending_exclusions || {};
    const exclusions: SpendingExclusions = {
      categories: Array.isArray(rawExclusions.categories) ? rawExclusions.categories : [],
      platforms: Array.isArray(rawExclusions.platforms) ? rawExclusions.platforms : [],
      keywords: Array.isArray(rawExclusions.keywords) ? rawExclusions.keywords : [],
      types: Array.isArray(rawExclusions.types) ? rawExclusions.types : [],
    };

    const detectedCategories = Array.from(
      new Set(catRes.rows.map((r) => r.category).filter(Boolean))
    );
    const detectedPlatforms = Array.from(
      new Set(
        catRes.rows
          .map((r) => r.platform)
          .filter((p) => p && p !== "gmail" && p !== "manual" && p !== "upload")
      )
    );

    return NextResponse.json({
      exclusions,
      detectedCategories,
      detectedPlatforms,
    });
  } catch (err: any) {
    console.error("[GET /api/analytics/exclusions]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
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
    const exclusions: SpendingExclusions = {
      categories: Array.isArray(body.categories)
        ? body.categories.map((s: any) => String(s).trim()).filter(Boolean)
        : [],
      platforms: Array.isArray(body.platforms)
        ? body.platforms.map((s: any) => String(s).trim()).filter(Boolean)
        : [],
      keywords: Array.isArray(body.keywords)
        ? body.keywords.map((s: any) => String(s).trim()).filter(Boolean)
        : [],
      types: Array.isArray(body.types)
        ? body.types.map((s: any) => String(s).trim()).filter(Boolean)
        : [],
    };

    await pool.query(
      `UPDATE users SET spending_exclusions = $1 WHERE id = $2;`,
      [JSON.stringify(exclusions), userId]
    );

    return NextResponse.json({ success: true, exclusions });
  } catch (err: any) {
    console.error("[POST /api/analytics/exclusions]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    await pool.end();
  }
}
