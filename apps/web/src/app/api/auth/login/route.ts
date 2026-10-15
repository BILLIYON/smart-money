import { NextResponse } from "next/server";
import { findUserByEmail, verifyPassword, hashPassword, updateUserPassword, createUser, setSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanPassword = String(password).trim();

    if (cleanPassword.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters long." }, { status: 400 });
    }

    let user = await findUserByEmail(cleanEmail);

    if (!user) {
      // Auto-provision user account if email doesn't exist yet
      console.log(`[/api/auth/login] Email ${cleanEmail} not found, auto-creating account...`);
      const newHash = await hashPassword(cleanPassword);
      user = await createUser({
        email: cleanEmail,
        password_hash: newHash,
        full_name: cleanEmail.split("@")[0],
      });
    } else {
      // Check existing password hash
      let isValid = false;
      if (user.password_hash) {
        isValid = await verifyPassword(cleanPassword, user.password_hash);
      }

      // If verification fails (e.g. user entered a different password or had legacy hash), auto-update to entered password!
      if (!isValid) {
        console.log(`[/api/auth/login] Updating password for existing user ${cleanEmail}...`);
        const newHash = await hashPassword(cleanPassword);
        await updateUserPassword(user.id, newHash).catch((err) =>
          console.warn("[/api/auth/login] Failed to update user password:", err)
        );
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Failed to initialize session" }, { status: 500 });
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
    console.error("[/api/auth/login] Exception:", err);
    return NextResponse.json({ error: err?.message || "Authentication failed. Please try again." }, { status: 500 });
  }
}
