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
      `SELECT id, url, secret, events, status, created_at
       FROM public.partner_webhooks
       WHERE partner_org_id = $1
       ORDER BY created_at DESC;`,
      [orgId]
    );

    return NextResponse.json({ webhooks: rows });
  } catch (err: any) {
    console.error("[GET /api/partner/webhooks]", err);
    return NextResponse.json({ webhooks: [] }, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getPartnerStaffSession(req);
    const orgId = session?.partnerOrgId || "a0000000-0000-0000-0000-000000000001";

    const body = await req.json();
    const { url, events } = body;

    if (!url || !url.startsWith("http")) {
      return NextResponse.json({ error: "Valid HTTP/HTTPS webhook URL required" }, { status: 400 });
    }

    const secret = `whsec_${crypto.randomBytes(18).toString("hex")}`;
    const eventList = Array.isArray(events) && events.length > 0 ? events : ["action.pending", "goal.accepted", "client.joined"];

    const { rows } = await pool.query(
      `INSERT INTO public.partner_webhooks (partner_org_id, url, secret, events, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id, url, secret, events, status, created_at;`,
      [orgId, url, secret, eventList]
    );

    return NextResponse.json({
      success: true,
      webhook: rows[0],
      message: "Webhook registered successfully",
    });
  } catch (err: any) {
    console.error("[POST /api/partner/webhooks]", err);
    return NextResponse.json({ error: "Failed to save webhook" }, { status: 500 });
  }
}
