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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Primary: Decoupled Partner Microservice
  try {
    const data = await partnerServiceClient.getFirmDetails(id);
    return NextResponse.json(data);
  } catch (serviceErr) {
    console.warn("[GET /api/partners/[id]] Microservice fallback:", (serviceErr as any)?.message);
  }

  // 2. Direct DB Fallback
  const pool = getFallbackPool();
  try {
    const { rows } = await pool.query(
      `SELECT 
        id, slug, name, type, icon, icon_bg AS "iconBg", banner_style AS "banner",
        description AS "desc", tags, rating, client_count_text AS "clients",
        min_portfolio_text AS "minPortfolio", full_description AS "fullDescription",
        includes, reviews
       FROM public.partner_orgs
       WHERE slug = $1 OR id::text = $1
       LIMIT 1;`,
      [id]
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Partner organization not found" }, { status: 404 });
    }

    return NextResponse.json({ firm: rows[0] });
  } catch (err: any) {
    console.error("[GET /api/partners/[id] Error]", err);
    return NextResponse.json({ error: "Failed to fetch partner details" }, { status: 500 });
  } finally {
    await pool.end();
  }
}
