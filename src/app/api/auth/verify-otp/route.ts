import { NextResponse } from "next/server";
import { createUser, hashPassword, setSessionCookie, getCurrentUser } from "@/lib/auth";
import { Pool } from "pg";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

export async function POST(req: Request) {
  try {
    const { purpose, code, targetEmail, targetPhone, fullName, password } = await req.json();

    if (!purpose || !code) {
      return NextResponse.json({ error: "Purpose and 6-digit code are required." }, { status: 400 });
    }

    const cleanCode = code.trim();
    const pool = getPool();
    const currentUser = await getCurrentUser();

    let queryParamEmail = targetEmail ? targetEmail.toLowerCase().trim() : currentUser?.email || "";

    try {
      // Query valid non-expired OTP record
      const { rows } = await pool.query(
        `SELECT id, metadata FROM public.otps
         WHERE (LOWER(email) = LOWER($1) OR (user_id IS NOT NULL AND user_id = $2))
           AND purpose = $3
           AND code = $4
           AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1;`,
        [queryParamEmail, currentUser?.id || null, purpose, cleanCode]
      );

      if (!rows || rows.length === 0) {
        return NextResponse.json(
          { error: "Invalid or expired verification code. Please check and try again." },
          { status: 400 }
        );
      }

      const otpRecord = rows[0];

      // Purpose-specific actions
      if (purpose === "registration") {
        if (!password || password.length < 8) {
          return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
        }

        const password_hash = await hashPassword(password);
        const user = await createUser({
          email: queryParamEmail,
          password_hash,
          full_name: fullName ? fullName.trim() : "",
        });

        // Mark email_verified = true
        await pool.query(`UPDATE public.users SET email_verified = true WHERE id = $1;`, [user.id]);

        // Clean up OTP record
        await pool.query(`DELETE FROM public.otps WHERE id = $1;`, [otpRecord.id]);

        // Create HTTP-only session cookie
        await setSessionCookie(user);

        return NextResponse.json({
          success: true,
          message: "Account verified and registered successfully!",
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            email_verified: true,
          },
        });
      }

      if (purpose === "email_change") {
        if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const newEmail = targetEmail ? targetEmail.toLowerCase().trim() : "";

        await pool.query(
          `UPDATE public.users SET email = $1, email_verified = true WHERE id = $2;`,
          [newEmail, currentUser.id]
        );

        await pool.query(`DELETE FROM public.otps WHERE id = $1;`, [otpRecord.id]);

        return NextResponse.json({
          success: true,
          message: "Email address updated successfully!",
        });
      }

      if (purpose === "phone_change") {
        if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const newPhone = targetPhone ? targetPhone.trim() : "";

        await pool.query(
          `UPDATE public.users SET phone_number = $1, phone_verified = true WHERE id = $2;`,
          [newPhone, currentUser.id]
        );

        await pool.query(`DELETE FROM public.otps WHERE id = $1;`, [otpRecord.id]);

        return NextResponse.json({
          success: true,
          message: "Phone number verified and updated successfully!",
        });
      }

      if (purpose === "profile_update") {
        if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        await pool.query(`DELETE FROM public.otps WHERE id = $1;`, [otpRecord.id]);

        return NextResponse.json({
          success: true,
          verified: true,
          message: "Security code verified!",
        });
      }

      return NextResponse.json({ success: true, verified: true });
    } finally {
      await pool.end();
    }
  } catch (err: any) {
    console.error("[/api/auth/verify-otp] Error:", err);
    return NextResponse.json({ error: err?.message || "Failed to verify code." }, { status: 500 });
  }
}
