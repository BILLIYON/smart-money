import { NextResponse } from "next/server";
import { findUserByEmail, getCurrentUser } from "@/lib/auth";
import {
  sendEmail,
  renderRegistrationOTPEmail,
  renderEmailChangeOTPEmail,
  renderPhoneChangeOTPEmail,
  renderProfileUpdateOTPEmail,
} from "@/lib/email";
import { Pool } from "pg";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

export async function POST(req: Request) {
  try {
    const { purpose, targetEmail, targetPhone, fullName } = await req.json();

    if (!purpose) {
      return NextResponse.json({ error: "OTP purpose is required." }, { status: 400 });
    }

    const pool = getPool();
    const currentUser = await getCurrentUser();
    let emailToSend = "";
    let nameForEmail = fullName || currentUser?.full_name || "User";

    if (purpose === "registration") {
      if (!targetEmail || !targetEmail.includes("@")) {
        return NextResponse.json({ error: "Valid email address is required for registration OTP." }, { status: 400 });
      }
      emailToSend = targetEmail.toLowerCase().trim();

      // Check if user already exists
      const existing = await findUserByEmail(emailToSend);
      if (existing) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
      }
    } else if (purpose === "email_change") {
      if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (!targetEmail || !targetEmail.includes("@")) {
        return NextResponse.json({ error: "Valid new email address is required." }, { status: 400 });
      }
      emailToSend = targetEmail.toLowerCase().trim();

      const existing = await findUserByEmail(emailToSend);
      if (existing) {
        return NextResponse.json({ error: "This email is already registered to another account." }, { status: 400 });
      }
    } else if (purpose === "phone_change") {
      if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (!targetPhone || targetPhone.trim().length < 7) {
        return NextResponse.json({ error: "Valid phone number is required." }, { status: 400 });
      }
      emailToSend = currentUser.email;
    } else if (purpose === "profile_update") {
      if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      emailToSend = currentUser.email;
    } else {
      return NextResponse.json({ error: "Invalid purpose specified." }, { status: 400 });
    }

    // Generate 6-digit numeric OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Clear old unexpired OTPs for this target & purpose
    try {
      await pool.query(
        `DELETE FROM public.otps WHERE (LOWER(email) = LOWER($1) OR (user_id IS NOT NULL AND user_id = $2)) AND purpose = $3;`,
        [emailToSend, currentUser?.id || null, purpose]
      );

      // Insert new OTP record
      await pool.query(
        `INSERT INTO public.otps (user_id, email, phone, purpose, code, metadata, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [
          currentUser?.id || null,
          emailToSend,
          targetPhone || null,
          purpose,
          code,
          JSON.stringify({ fullName, targetEmail, targetPhone }),
          expiresAt.toISOString(),
        ]
      );
    } finally {
      await pool.end();
    }

    // Render HTML email based on purpose
    let htmlContent = "";
    let subjectLine = "";

    if (purpose === "registration") {
      subjectLine = `${code} is your Smart Money registration verification code`;
      htmlContent = renderRegistrationOTPEmail(code, nameForEmail);
    } else if (purpose === "email_change") {
      subjectLine = `${code} is your Smart Money email change verification code`;
      htmlContent = renderEmailChangeOTPEmail(code, emailToSend);
    } else if (purpose === "phone_change") {
      subjectLine = `${code} is your Smart Money phone verification code`;
      htmlContent = renderPhoneChangeOTPEmail(code, targetPhone || "");
    } else {
      subjectLine = `${code} is your Smart Money security verification code`;
      htmlContent = renderProfileUpdateOTPEmail(code);
    }

    // Dispatch via AWS SES
    try {
      await sendEmail({
        to: emailToSend,
        subject: subjectLine,
        html: htmlContent,
      });
    } catch (sesErr: any) {
      console.error("[/api/auth/send-otp] AWS SES dispatch error:", sesErr);
    }

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${emailToSend}`,
    });
  } catch (err: any) {
    console.error("[/api/auth/send-otp] Error:", err);
    return NextResponse.json({ error: err?.message || "Failed to send verification code." }, { status: 500 });
  }
}
