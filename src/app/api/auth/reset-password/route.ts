import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { Pool } from "pg";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

export async function POST(req: Request) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "Email, code, and new password are required." }, { status: 400 });
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.trim();

    const pool = getPool();
    try {
      // Find matching valid reset entry
      const { rows } = await pool.query(
        `SELECT id FROM public.password_resets
         WHERE LOWER(email) = LOWER($1) AND code = $2 AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1;`,
        [cleanEmail, cleanCode]
      );

      if (!rows || rows.length === 0) {
        return NextResponse.json(
          { error: "Invalid or expired verification code. Please request a new code." },
          { status: 400 }
        );
      }

      // Hash new password and update user in PostgreSQL
      const passwordHash = await hashPassword(newPassword);
      await pool.query(
        `UPDATE public.users SET password_hash = $1 WHERE LOWER(email) = LOWER($2);`,
        [passwordHash, cleanEmail]
      );

      // Clean up reset codes for this email
      await pool.query(
        `DELETE FROM public.password_resets WHERE LOWER(email) = LOWER($1);`,
        [cleanEmail]
      );

      return NextResponse.json({
        success: true,
        message: "Password reset successful! You can now log in with your new password.",
      });
    } finally {
      await pool.end();
    }
  } catch (err: any) {
    console.error("[/api/auth/reset-password] Error:", err);
    return NextResponse.json({ error: "Failed to reset password. Please try again." }, { status: 500 });
  }
}
