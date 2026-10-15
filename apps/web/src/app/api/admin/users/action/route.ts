import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  ssl: (process.env.DATABASE_URL || "").includes("supabase.com") ? { rejectUnauthorized: false } : false,
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.is_admin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { action, targetUserId, plan, isAdmin, newPassword, isPartnerStaff, partnerOrgId, partnerRole } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "Target User ID is required" }, { status: 400 });
    }

    if (action === "update_plan") {
      if (!plan || !["free", "pro"].includes(plan)) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      }
      await pool.query("UPDATE public.users SET plan = $1 WHERE id = $2;", [plan, targetUserId]);
      return NextResponse.json({ success: true, message: `User plan updated to ${plan}` });
    }

    if (action === "toggle_admin") {
      await pool.query("UPDATE public.users SET is_admin = $1 WHERE id = $2;", [Boolean(isAdmin), targetUserId]);
      return NextResponse.json({ success: true, message: `User admin status updated to ${isAdmin}` });
    }

    if (action === "update_partner_role") {
      const isStaff = Boolean(isPartnerStaff);
      const orgId = isStaff ? (partnerOrgId || null) : null;
      const role = isStaff ? (partnerRole || "advisor") : null;

      if (isStaff && !orgId) {
        return NextResponse.json({ error: "Please select a partner organization" }, { status: 400 });
      }

      await pool.query(
        `UPDATE public.users 
         SET is_partner_staff = $1, partner_org_id = $2, partner_role = $3 
         WHERE id = $4;`,
        [isStaff, orgId, role, targetUserId]
      );

      if (isStaff && orgId) {
        const { rows: uRows } = await pool.query(
          `SELECT email, full_name FROM public.users WHERE id = $1;`,
          [targetUserId]
        );
        if (uRows[0]) {
          await pool.query(
            `INSERT INTO public.partner_staff (partner_org_id, user_id, name, email, role, invite_status, last_active_at)
             VALUES ($1, $2, $3, $4, $5, 'active', NOW());`,
            [orgId, targetUserId, uRows[0].full_name || uRows[0].email, uRows[0].email, role]
          ).catch(async () => {
            await pool.query(
              `UPDATE public.partner_staff 
               SET partner_org_id = $1, role = $2, invite_status = 'active', last_active_at = NOW() 
               WHERE user_id = $3;`,
              [orgId, role, targetUserId]
            );
          });
        }
      } else {
        await pool.query(
          `UPDATE public.partner_staff 
           SET invite_status = 'revoked' 
           WHERE user_id = $1;`,
          [targetUserId]
        );
      }

      return NextResponse.json({
        success: true,
        message: isStaff
          ? `User granted Partner Role (${role})`
          : "Partner Role revoked",
      });
    }

    if (action === "reset_password") {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      const hash = await hashPassword(newPassword);
      await pool.query("UPDATE public.users SET password_hash = $1 WHERE id = $2;", [hash, targetUserId]);
      return NextResponse.json({ success: true, message: "Password updated successfully" });
    }

    if (action === "delete_user") {
      await pool.query("DELETE FROM public.users WHERE id = $1;", [targetUserId]);
      return NextResponse.json({ success: true, message: "User deleted successfully" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[API Admin User Action Error]", err);
    return NextResponse.json({ error: err.message || "Action failed" }, { status: 500 });
  }
}
