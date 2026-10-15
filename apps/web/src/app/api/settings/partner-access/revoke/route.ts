import { NextResponse } from "next/server";
import { partnerServiceClient } from "@/lib/partner-service-client";
import { requireAuth } from "@/lib/auth";
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

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  // 1. Primary: Decoupled Partner Microservice
  try {
    const data = await partnerServiceClient.revokeAllConsent(auth.userId);
    return NextResponse.json(data);
  } catch (serviceErr) {
    console.warn("[POST /api/settings/partner-access/revoke] Microservice fallback:", (serviceErr as any)?.message);
  }

  // 2. Direct DB Fallback
  const pool = getFallbackPool();
  try {
    const { rows: clientRows } = await pool.query(
      `SELECT pc.partner_org_id, po.name 
       FROM public.partner_clients pc
       JOIN public.partner_orgs po ON po.id = pc.partner_org_id
       WHERE pc.user_id = $1 AND pc.status != 'offboarded' LIMIT 1;`,
      [auth.userId]
    );

    if (!clientRows[0]) {
      return NextResponse.json({ error: "No active partner connected" }, { status: 404 });
    }

    const partnerOrgId = clientRows[0].partner_org_id;
    const partnerName = clientRows[0].name;

    await pool.query(
      `UPDATE public.partner_client_scopes 
       SET enabled = false, updated_at = NOW() 
       WHERE partner_org_id = $1 AND user_id = $2;`,
      [partnerOrgId, auth.userId]
    );

    await pool.query(
      `UPDATE public.partner_clients 
       SET status = 'paused', updated_at = NOW() 
       WHERE partner_org_id = $1 AND user_id = $2;`,
      [partnerOrgId, auth.userId]
    );

    await pool.query(
      `UPDATE public.agent_actions 
       SET status = 'cancelled', updated_at = NOW() 
       WHERE user_id = $1 AND status = 'pending_partner_approval';`,
      [auth.userId]
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      partnerName,
      message: `All access for ${partnerName} has been revoked.`,
    });
  } catch (err: any) {
    console.error("[POST /api/settings/partner-access/revoke Error]", err);
    return NextResponse.json({ error: "Failed to revoke partner access" }, { status: 500 });
  } finally {
    await pool.end();
  }
}
