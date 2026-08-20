import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Pool } from "pg";

const localPool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { action, targetUserId, plan, isAdmin, newPassword } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "Target User ID is required" }, { status: 400 });
    }

    if (action === "update_plan") {
      if (!plan || !["free", "pro"].includes(plan)) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      }
      await localPool.query("UPDATE users SET plan = $1 WHERE id = $2;", [plan, targetUserId]);
      return NextResponse.json({ success: true, message: `User plan updated to ${plan}` });
    }

    if (action === "toggle_admin") {
      await localPool.query("UPDATE users SET is_admin = $1 WHERE id = $2;", [Boolean(isAdmin), targetUserId]);
      return NextResponse.json({ success: true, message: `User admin status updated to ${isAdmin}` });
    }

    if (action === "reset_password") {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }
      // Update in auth.users
      await localPool.query("UPDATE auth.users SET encrypted_password = $1 WHERE id = $2;", [newPassword, targetUserId]);
      return NextResponse.json({ success: true, message: "Password updated successfully" });
    }

    if (action === "delete_user") {
      await localPool.query("DELETE FROM users WHERE id = $1;", [targetUserId]);
      await localPool.query("DELETE FROM auth.users WHERE id = $1;", [targetUserId]);
      return NextResponse.json({ success: true, message: "User deleted successfully" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[API Admin User Action Error]", err);
    return NextResponse.json({ error: err.message || "Action failed" }, { status: 500 });
  }
}
