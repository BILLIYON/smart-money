import { NextRequest, NextResponse } from "next/server";
import { getPartnerStaffSession } from "@/lib/partner-auth";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

function getPool() {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money";
  const isRemote = connectionString.includes("supabase.com") || connectionString.includes("pooler") || connectionString.includes("aws-");
  return new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
  });
}

export async function GET(req: NextRequest) {
  const staff = await getPartnerStaffSession(req);
  if (!staff) {
    return NextResponse.json({ error: "Forbidden: Partner staff access required" }, { status: 403 });
  }

  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT 
        id, partner_org_id, user_id, full_name, phone, income_range, 
        goals_text, status, created_at
       FROM public.partner_applications
       WHERE partner_org_id = $1
       ORDER BY created_at DESC;`,
      [staff.partnerOrgId]
    );

    const applications = rows.map((r: any) => ({
      id: r.id,
      name: r.full_name,
      phone: r.phone,
      incomeRange: r.income_range,
      goalsText: r.goals_text,
      status: r.status === "approved" ? "Approved" : r.status === "declined" ? "Declined" : "Pending Review",
      docsComplete: r.status !== "docs_missing",
      createdAt: r.created_at,
      meta: `Income: ${r.income_range} · Phone: ${r.phone}`,
    }));

    return NextResponse.json({ applications });
  } catch (err: any) {
    console.error("[GET /api/partner/applications]", err);
    return NextResponse.json({ error: err.message || "Failed to fetch applications" }, { status: 500 });
  } finally {
    await pool.end();
  }
}

export async function PATCH(req: NextRequest) {
  const staff = await getPartnerStaffSession(req);
  if (!staff) {
    return NextResponse.json({ error: "Forbidden: Partner staff access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !["pending", "docs_missing", "approved", "declined"].includes(status)) {
      return NextResponse.json({ error: "Valid id and status ('pending', 'docs_missing', 'approved', 'declined') required" }, { status: 400 });
    }

    const pool = getPool();
    try {
      const { rows } = await pool.query(
        `UPDATE public.partner_applications
         SET status = $1, updated_at = NOW()
         WHERE id = $2 AND partner_org_id = $3
         RETURNING *;`,
        [status, id, staff.partnerOrgId]
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: "Application not found or unauthorized" }, { status: 404 });
      }

      // If approved, automatically insert into partner_clients if not already there
      if (status === "approved" && rows[0].user_id) {
        await pool.query(
          `INSERT INTO public.partner_clients (partner_org_id, user_id, status)
           VALUES ($1, $2, 'active')
           ON CONFLICT (partner_org_id, user_id) DO UPDATE SET status = 'active';`,
          [staff.partnerOrgId, rows[0].user_id]
        );
      }

      return NextResponse.json({ success: true, application: rows[0] });
    } finally {
      await pool.end();
    }
  } catch (err: any) {
    console.error("[PATCH /api/partner/applications]", err);
    return NextResponse.json({ error: err.message || "Failed to update application" }, { status: 500 });
  }
}
