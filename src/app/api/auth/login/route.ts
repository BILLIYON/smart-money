import { NextResponse } from "next/server";
import { findUserByEmail, verifyPassword, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await findUserByEmail(cleanEmail);

    if (!user || !user.password_hash) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Set HTTP-only session cookie
    await setSessionCookie(user);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        is_admin: user.is_admin,
        onboarding_complete: user.onboarding_complete,
      },
    });
  } catch (err: any) {
    console.error("[/api/auth/login] Error:", err);
    return NextResponse.json({ error: "Authentication failed. Please try again." }, { status: 500 });
  }
}
