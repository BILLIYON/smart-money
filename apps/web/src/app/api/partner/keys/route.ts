import { NextResponse } from "next/server";
import { getPartnerStaffSession } from "@/lib/partner-auth";
import { Pool } from "pg";
import crypto from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

export async function GET(req: Request) {
  try {
    const session = await getPartnerStaffSession(req);
    const orgId = session?.partnerOrgId || "a0000000-0000-0000-0000-000000000001";

    const { rows } = await pool.query(
      `SELECT id, key_prefix, name, last_used_at, created_at, revoked_at
       FROM public.partner_api_keys
       WHERE partner_org_id = $1 AND revoked_at IS NULL
       ORDER BY created_at DESC;`,
      [orgId]
    );

    return NextResponse.json({ keys: rows, activeKey: rows[0] || null });
  } catch (err: any) {
    console.error("[GET /api/partner/keys]", err);
    return NextResponse.json({ keys: [], activeKey: null }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getPartnerStaffSession(req);
    const orgId = session?.partnerOrgId || "a0000000-0000-0000-0000-000000000001";

    const body = await req.json().catch(() => ({}));
    const keyName = body.name || "Production Advisory Key";

    const rawSecret = crypto.randomBytes(24).toString("hex");
    const rawKey = `sm_live_${rawSecret}`;
    const prefix = `sm_live_${rawSecret.slice(0, 6)}...${rawSecret.slice(-4)}`;
    const hash = crypto.createHash("sha256").update(rawKey).digest("hex");

    // Revoke previous active keys for this org
    await pool.query(
      `UPDATE public.partner_api_keys SET revoked_at = NOW() WHERE partner_org_id = $1 AND revoked_at IS NULL;`,
      [orgId]
    );

    const { rows } = await pool.query(
      `INSERT INTO public.partner_api_keys (partner_org_id, key_prefix, key_hash, name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, key_prefix, name, created_at;`,
      [orgId, prefix, hash, keyName]
    );

    return NextResponse.json({
      success: true,
      apiKey: rawKey,
      keyRecord: rows[0],
      message: "API key generated successfully. Copy it now as it cannot be shown again.",
    });
  } catch (err: any) {
    console.error("[POST /api/partner/keys]", err);
    return NextResponse.json({ error: "Failed to generate API key" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getPartnerStaffSession(req);
    const orgId = session?.partnerOrgId || "a0000000-0000-0000-0000-000000000001";

    await pool.query(
      `UPDATE public.partner_api_keys SET revoked_at = NOW() WHERE partner_org_id = $1 AND revoked_at IS NULL;`,
      [orgId]
    );

    return NextResponse.json({ success: true, message: "API key revoked successfully" });
  } catch (err: any) {
    console.error("[DELETE /api/partner/keys]", err);
    return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 });
  }
}
