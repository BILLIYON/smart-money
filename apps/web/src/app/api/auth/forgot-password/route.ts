import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/auth";
import { sendEmail, renderPasswordResetEmail } from "@/lib/email";
import { Pool } from "pg";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(cleanEmail);

    // Return success even if user not found (security best practice to prevent account enumeration)
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account with this email exists, a password reset code has been sent.",
      });
    }

    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save to PostgreSQL password_resets table
    const pool = getPool();
    try {
      await pool.query(
        `INSERT INTO public.password_resets (email, code, expires_at) VALUES ($1, $2, $3);`,
        [cleanEmail, code, expiresAt.toISOString()]
      );
    } finally {
      await pool.end();
    }

    // Dispatch email via AWS SES
    try {
      await sendEmail({
        to: cleanEmail,
        subject: `${code} is your Smart Money password reset code`,
        html: renderPasswordResetEmail(code),
      });
    } catch (sesErr: any) {
      console.error("[/api/auth/forgot-password] SES dispatch failed:", sesErr);
    }

    return NextResponse.json({
      success: true,
      message: "If an account with this email exists, a password reset code has been sent.",
    });
  } catch (err: any) {
    console.error("[/api/auth/forgot-password] Exception:", err);
    return NextResponse.json({ error: "Unable to process request. Please try again." }, { status: 500 });
  }
}
