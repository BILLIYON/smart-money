import { Pool } from "pg";
import { getCurrentUser, type AuthUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export type PartnerRole = "admin" | "advisor" | "analyst" | "view_only";

export type PartnerStaffSession = {
  userId: string;
  email: string;
  fullName: string | null;
  partnerOrgId: string;
  partnerOrgSlug: string;
  partnerOrgName: string;
  partnerOrgType: string;
  approvalThresholdKobo: number;
  role: PartnerRole;
  isSuperAdmin: boolean;
};

function getPool() {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money";
  const isRemote = connectionString.includes("supabase.com") || connectionString.includes("pooler") || connectionString.includes("aws-");
  return new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
  });
}

/**
 * Resolves the partner staff session for the authenticated user.
 * Supports:
 * 1. Dedicated partner staff assigned to an organization.
 * 2. Platform super-admins (who can access or manage partner orgs).
 */
export async function getPartnerStaffSession(req?: Request): Promise<PartnerStaffSession | null> {
  const user = await getCurrentUser(req);
  if (!user) return null;

  const pool = getPool();
  try {
    // 1. Fetch user partner flags and org details
    const { rows } = await pool.query(
      `SELECT 
         u.id AS user_id,
         u.email,
         u.full_name,
         u.is_admin,
         u.is_partner_staff,
         u.partner_org_id,
         u.partner_role,
         ps.role AS staff_table_role,
         o.id AS org_id,
         o.slug AS org_slug,
         o.name AS org_name,
         o.type AS org_type,
         o.approval_threshold_kobo
       FROM public.users u
       LEFT JOIN public.partner_staff ps ON (ps.user_id = u.id OR LOWER(ps.email) = LOWER(u.email))
       LEFT JOIN public.partner_orgs o ON (o.id = COALESCE(u.partner_org_id, ps.partner_org_id))
       WHERE u.id = $1
       LIMIT 1;`,
      [user.id]
    );

    const row = rows[0];
    if (!row) return null;

    // STRICT REQUIREMENT: Only users explicitly granted is_partner_staff by an admin can access partner features
    if (row.is_partner_staff && row.org_id) {
      const resolvedRole: PartnerRole = (row.partner_role || row.staff_table_role || "advisor") as PartnerRole;
      return {
        userId: row.user_id,
        email: row.email,
        fullName: row.full_name,
        partnerOrgId: row.org_id,
        partnerOrgSlug: row.org_slug,
        partnerOrgName: row.org_name,
        partnerOrgType: row.org_type || "Wealth Management",
        approvalThresholdKobo: parseInt(row.approval_threshold_kobo || "50000000", 10),
        role: resolvedRole,
        isSuperAdmin: Boolean(row.is_admin),
      };
    }

    // Platform super-admin preview: only if admin also sets is_partner_staff or has a partner org
    if (row.is_admin && row.partner_org_id) {
      const resolvedRole: PartnerRole = (row.partner_role || "admin") as PartnerRole;
      return {
        userId: row.user_id,
        email: row.email,
        fullName: row.full_name,
        partnerOrgId: row.org_id,
        partnerOrgSlug: row.org_slug,
        partnerOrgName: row.org_name,
        partnerOrgType: row.org_type || "Wealth Management",
        approvalThresholdKobo: parseInt(row.approval_threshold_kobo || "50000000", 10),
        role: resolvedRole,
        isSuperAdmin: true,
      };
    }

    // Deny all other users
    return null;
  } catch (error) {
    console.error("[getPartnerStaffSession] Error resolving partner session:", error);
    return null;
  } finally {
    await pool.end();
  }
}


/**
 * Route protection guard for API endpoints (/api/partner/*)
 */
export async function requirePartnerStaff(req?: Request): Promise<
  | { session: PartnerStaffSession; error: null }
  | { session: null; error: NextResponse }
> {
  const session = await getPartnerStaffSession(req);

  if (!session) {
    const user = await getCurrentUser(req);
    if (!user) {
      return {
        session: null,
        error: NextResponse.json({ error: "Unauthorized: Sign-in required" }, { status: 401 }),
      };
    }
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden: Partner staff privileges required" }, { status: 403 }),
    };
  }

  return { session, error: null };
}

/**
 * Permission checks based on Partner Role
 */
export function hasPartnerPermission(
  session: PartnerStaffSession,
  action: "manage_staff" | "approve_actions" | "write_goals" | "view_analytics" | "view_transactions"
): boolean {
  if (session.isSuperAdmin || session.role === "admin") {
    return true;
  }

  switch (action) {
    case "manage_staff":
      return false;
    case "approve_actions":
    case "write_goals":
    case "view_transactions":
      return session.role === "advisor";
    case "view_analytics":
      return session.role === "advisor" || session.role === "analyst";
    default:
      return false;
  }
}

