import { NextResponse } from "next/server";
import { partnerServiceClient } from "@/lib/partner-service-client";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

function getFallbackPool() {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money";
  const isRemote = connectionString.includes("supabase.com") || connectionString.includes("pooler") || connectionString.includes("aws-");
  return new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const typeFilter = searchParams.get("type");
  const query = searchParams.get("q")?.toLowerCase();

  // 1. Primary: Decoupled Partner Microservice
  try {
    const data = await partnerServiceClient.getDirectory({ type: typeFilter, query });
    return NextResponse.json(data);
  } catch (serviceErr) {
    console.warn("[GET /api/partners] Partner microservice offline, using DB fallback:", (serviceErr as any)?.message);
  }

  // 2. Resilient Direct DB Fallback
  const pool = getFallbackPool();
  try {
    let sql = `
      SELECT 
        id, slug, name, type, icon, icon_bg AS "iconBg", banner_style AS "banner",
        description AS "desc", tags, rating, client_count_text AS "clients",
        min_portfolio_text AS "minPortfolio", created_at
      FROM public.partner_orgs
      WHERE is_public = true
    `;
    const params: any[] = [];

    if (typeFilter && typeFilter !== "All") {
      params.push(typeFilter);
      sql += ` AND (type = $${params.length} OR $${params.length} = ANY(tags))`;
    }

    if (query) {
      params.push(`%${query}%`);
      sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`;
    }

    sql += ` ORDER BY created_at ASC;`;

    const { rows } = await pool.query(sql, params);
    return NextResponse.json({ firms: rows });
  } catch (err: any) {
    console.error("[GET /api/partners Error]", err);
    return NextResponse.json({ error: "Failed to fetch partners" }, { status: 500 });
  } finally {
    await pool.end();
  }
}
