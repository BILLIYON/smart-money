import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { Pool } from "pg";

const localPool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
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
      const hash = await hashPassword(newPassword);
      await localPool.query("UPDATE users SET password_hash = $1 WHERE id = $2;", [hash, targetUserId]);
      return NextResponse.json({ success: true, message: "Password updated successfully" });
    }

    if (action === "delete_user") {
      await localPool.query("DELETE FROM users WHERE id = $1;", [targetUserId]);
      return NextResponse.json({ success: true, message: "User deleted successfully" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[API Admin User Action Error]", err);
    return NextResponse.json({ error: err.message || "Action failed" }, { status: 500 });
  }
}
