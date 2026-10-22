import { NextResponse } from "next/server";
import { partnerServiceClient } from "@/lib/partner-service-client";
import { requireAuth } from "@/lib/auth";
import { ALL_CONSENT_SCOPES, type ClientConsentScope } from "@/lib/partner-consent";
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

const SCOPE_METADATA: Record<ClientConsentScope, { label: string; desc: string }> = {
  transactions: {
    label: "Transaction History",
    desc: "Allow partner to see categorized transaction alerts from your connected accounts",
  },
  networth: {
    label: "Net Worth & Account Balances",
    desc: "Share your aggregated net worth and current balances for portfolio context",
  },
  goals: {
    label: "Goals & Milestones",
    desc: "Let your partner view your active goals, savings targets and progress",
  },
  chat: {
    label: "Buddy Conversations",
    desc: "Allow partner advisors to review conversations with your AI buddies for context",
  },
  actions: {
    label: "Agentic Actions Approval",
    desc: "Send actions above your partner limit to their approval queue before execution",
  },
};

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  // 1. Primary: Decoupled Partner Microservice
  try {
    const data = await partnerServiceClient.getConsent(auth.userId);
    const enrichedScopes = (data.scopes || []).map((s: any) => ({
      key: s.key,
      label: SCOPE_METADATA[s.key as ClientConsentScope]?.label || s.key,
      desc: SCOPE_METADATA[s.key as ClientConsentScope]?.desc || "",
      on: Boolean(s.on),
    }));
    return NextResponse.json({ ...data, scopes: enrichedScopes });
  } catch (serviceErr) {
    console.warn("[GET /api/settings/partner-access] Microservice fallback:", (serviceErr as any)?.message);
  }

  // 2. Direct DB Fallback
  const pool = getFallbackPool();
  try {
    const { rows: clientRows } = await pool.query(
      `SELECT pc.partner_org_id, po.name, po.type, po.slug, pc.status
       FROM public.partner_clients pc
       JOIN public.partner_orgs po ON po.id = pc.partner_org_id
       WHERE pc.user_id = $1 AND pc.status IN ('active', 'needs_attention')
       ORDER BY pc.joined_at DESC LIMIT 1;`,
      [auth.userId]
    );

    if (!clientRows[0]) {
      return NextResponse.json({
        hasPartner: false,
        partner: null,
        scopes: ALL_CONSENT_SCOPES.map((key) => ({
          key,
          label: SCOPE_METADATA[key].label,
          desc: SCOPE_METADATA[key].desc,
          on: false,
        })),
      });
    }

    const partner = clientRows[0];
    const { rows: scopeRows } = await pool.query(
      `SELECT scope, enabled FROM public.partner_client_scopes WHERE partner_org_id = $1 AND user_id = $2;`,
      [partner.partner_org_id, auth.userId]
    );

    const scopeMap: Record<string, boolean> = {};
    for (const r of scopeRows) {
      scopeMap[r.scope] = Boolean(r.enabled);
    }

    return NextResponse.json({
      hasPartner: true,
      partner: {
        id: partner.partner_org_id,
        slug: partner.slug,
        name: partner.name,
        type: partner.type,
      },
      scopes: ALL_CONSENT_SCOPES.map((key) => ({
        key,
        label: SCOPE_METADATA[key].label,
        desc: SCOPE_METADATA[key].desc,
        on: scopeMap[key] ?? false,
      })),
    });
  } catch (err: any) {
    console.error("[GET /api/settings/partner-access Error]", err);
    return NextResponse.json({ error: "Failed to fetch partner access settings" }, { status: 500 });
  } finally {
    await pool.end();
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const { scope, enabled } = body;

  if (!scope || !ALL_CONSENT_SCOPES.includes(scope)) {
    return NextResponse.json({ error: "Invalid scope identifier" }, { status: 400 });
  }

  // 1. Primary: Decoupled Partner Microservice
  try {
    const data = await partnerServiceClient.toggleConsent(auth.userId, scope, Boolean(enabled));
    return NextResponse.json(data);
  } catch (serviceErr) {
    console.warn("[PATCH /api/settings/partner-access] Microservice fallback:", (serviceErr as any)?.message);
  }

  // 2. Direct DB Fallback
  const pool = getFallbackPool();
  try {
    const { rows: clientRows } = await pool.query(
      `SELECT partner_org_id FROM public.partner_clients WHERE user_id = $1 AND status != 'offboarded' LIMIT 1;`,
      [auth.userId]
    );

    if (!clientRows[0]) {
      return NextResponse.json({ error: "No active partner connected" }, { status: 404 });
    }

    await pool.query(
      `INSERT INTO public.partner_client_scopes (partner_org_id, user_id, scope, enabled, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (partner_org_id, user_id, scope)
       DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW();`,
      [clientRows[0].partner_org_id, auth.userId, scope, Boolean(enabled)]
    );

    return NextResponse.json({
      success: true,
      scope,
      enabled: Boolean(enabled),
      message: `Scope '${scope}' ${enabled ? "enabled" : "disabled"}`,
    });
  } catch (err: any) {
    console.error("[PATCH /api/settings/partner-access Error]", err);
    return NextResponse.json({ error: "Failed to update consent scope" }, { status: 500 });
  } finally {
    await pool.end();
  }
}
