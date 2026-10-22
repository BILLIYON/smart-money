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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { fullName, phone, incomeRange, goalsText } = body;

  if (!fullName || !phone || !incomeRange || !goalsText) {
    return NextResponse.json(
      { error: "Missing required application fields (fullName, phone, incomeRange, goalsText)" },
      { status: 400 }
    );
  }

  // 1. Primary: Decoupled Partner Microservice
  try {
    const data = await partnerServiceClient.submitApplication(
      id,
      { fullName, phone, incomeRange, goalsText },
      auth.userId
    );
    return NextResponse.json(data);
  } catch (serviceErr) {
    console.warn("[POST /api/partners/[id]/apply] Microservice fallback:", (serviceErr as any)?.message);
  }

  // 2. Direct DB Fallback
  const pool = getFallbackPool();
  try {
    const { rows: orgRows } = await pool.query(
      `SELECT id, name FROM public.partner_orgs WHERE slug = $1 OR id::text = $1 LIMIT 1;`,
      [id]
    );

    if (!orgRows[0]) {
      return NextResponse.json({ error: "Partner firm not found" }, { status: 404 });
    }

    const orgId = orgRows[0].id;
    const orgName = orgRows[0].name;

    const { rows: appRows } = await pool.query(
      `INSERT INTO public.partner_applications (
        partner_org_id, user_id, full_name, phone, income_range, goals_text, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING id, status, created_at;`,
      [orgId, auth.userId, fullName.trim(), phone.trim(), incomeRange, goalsText.trim()]
    );

    await pool.query(
      `INSERT INTO public.partner_clients (partner_org_id, user_id, status, joined_at)
       VALUES ($1, $2, 'needs_attention', NOW())
       ON CONFLICT (partner_org_id, user_id) 
       DO UPDATE SET status = 'needs_attention', joined_at = NOW();`,
      [orgId, auth.userId]
    );

    await pool.query(
      `INSERT INTO public.partner_client_scopes (partner_org_id, user_id, scope, enabled, updated_at)
       VALUES 
         ($1, $2, 'networth', true, NOW()),
         ($1, $2, 'transactions', true, NOW()),
         ($1, $2, 'goals', true, NOW()),
         ($1, $2, 'chat', false, NOW()),
         ($1, $2, 'actions', false, NOW())
       ON CONFLICT (partner_org_id, user_id, scope) 
       DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW();`,
      [orgId, auth.userId]
    );

    await pool.query(
      `INSERT INTO public.notifications (user_id, title, body, action_url, read, created_at)
       VALUES ($1, $2, $3, '/settings', false, NOW());`,
      [
        auth.userId,
        `Application Submitted: ${orgName}`,
        `Your onboarding application to ${orgName} has been submitted. You can manage your privacy consent scopes in Settings → Partner Access.`
      ]
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      applicationId: appRows[0].id,
      firmName: orgName,
      status: appRows[0].status,
      message: "Application successfully submitted",
    });
  } catch (err: any) {
    console.error("[POST /api/partners/[id]/apply Error]", err);
    return NextResponse.json({ error: "Failed to submit partner application" }, { status: 500 });
  } finally {
    await pool.end();
  }
}
