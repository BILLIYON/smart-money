import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Pool } from "pg";

const localPool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

export const dynamic = "force-dynamic";

export async function GET() {
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

    const { rows: users } = await localPool.query(`
      SELECT id, email, full_name, plan, is_admin, onboarding_complete, created_at
      FROM users
      ORDER BY created_at DESC;
    `);

    return NextResponse.json({ users });
  } catch (err: any) {
    console.error("[API Admin Users List Error]", err);
    return NextResponse.json({ error: err.message || "Failed to fetch user list" }, { status: 500 });
  }
}
