import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Pool } from "pg";

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = typeof fullName === "string" ? fullName.trim() : "";

    const serviceClient = createServiceClient();

    // Create user in Supabase Auth with auto-confirmed email (bypasses OTP / confirmation link)
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: cleanName },
    });

    if (authError) {
      const msg = authError.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("already exists")) {
        return NextResponse.json({ error: "An account with this email already exists. Please sign in instead." }, { status: 400 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 1. Ensure user row exists in Supabase public.users
    await serviceClient.from("users").upsert(
      {
        id: userId,
        email: cleanEmail,
        full_name: cleanName,
        onboarding_complete: false,
        plan: "free",
        created_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    // 2. Ensure user row exists in local PostgreSQL table (if active)
    if (process.env.DATABASE_URL) {
      try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        await pool.query(
          `INSERT INTO users (id, email, full_name, onboarding_complete, plan, created_at)
           VALUES ($1, $2, $3, false, 'free', NOW())
           ON CONFLICT (id) DO UPDATE SET email = $2, full_name = $3;`,
          [userId, cleanEmail, cleanName]
        );
        await pool.end();
      } catch (pgErr) {
        console.warn("[/api/auth/register] Local PG sync warning:", pgErr);
      }
    }

    return NextResponse.json({
      success: true,
      user: { id: userId, email: cleanEmail, full_name: cleanName },
    });
  } catch (err: any) {
    console.error("[/api/auth/register] Exception:", err);
    return NextResponse.json({ error: err?.message || "Failed to create account. Please try again." }, { status: 500 });
  }
}
