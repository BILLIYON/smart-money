import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  ssl: (process.env.DATABASE_URL || "").includes("supabase.com") ? { rejectUnauthorized: false } : false,
});

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.is_admin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const [usersResult, orgsResult] = await Promise.all([
      pool.query(`
        SELECT 
          u.id, 
          u.email, 
          u.full_name, 
          u.plan, 
          u.is_admin, 
          u.onboarding_complete, 
          u.is_partner_staff, 
          u.partner_org_id, 
          u.partner_role, 
          po.name AS partner_org_name,
          u.created_at
        FROM public.users u
        LEFT JOIN public.partner_orgs po ON po.id = u.partner_org_id
        ORDER BY u.created_at DESC;
      `),
      pool.query(`
        SELECT id, name, slug 
        FROM public.partner_orgs 
        ORDER BY name ASC;
      `),
    ]);

    return NextResponse.json({
      users: usersResult.rows,
      partnerOrgs: orgsResult.rows,
    });
  } catch (err: any) {
    console.error("[API Admin Users List Error]", err);
    return NextResponse.json({ error: err.message || "Failed to fetch user list" }, { status: 500 });
  }
}
