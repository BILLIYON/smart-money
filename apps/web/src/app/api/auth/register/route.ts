import { NextResponse } from "next/server";
import { findUserByEmail, createUser, hashPassword, setSessionCookie } from "@/lib/auth";
import { sendEmail, renderWelcomeEmail } from "@/lib/email";

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

    // Check if user already exists in PostgreSQL
    const existing = await findUserByEmail(cleanEmail);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 400 }
      );
    }

    // Hash password and create user in PostgreSQL
    const password_hash = await hashPassword(password);
    const user = await createUser({
      email: cleanEmail,
      password_hash,
      full_name: cleanName,
    });

    // Set HTTP-only session cookie
    await setSessionCookie(user);

    // Send Welcome Email via AWS SES asynchronously
    try {
      sendEmail({
        to: cleanEmail,
        subject: "Welcome to Smart Money! 🚀",
        html: renderWelcomeEmail(cleanName),
      }).catch((emailErr) => console.warn("[/api/auth/register] Welcome email dispatch warning:", emailErr));
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        onboarding_complete: user.onboarding_complete,
      },
    });
  } catch (err: any) {
    console.error("[/api/auth/register] Exception:", err);
    return NextResponse.json({ error: err?.message || "Failed to create account. Please try again." }, { status: 500 });
  }
}
