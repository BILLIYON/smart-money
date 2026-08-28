import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/auth-utils";
import { findUserByEmail, createUser, setSessionCookie } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("state") ?? "/";
  const origin = getAppOrigin(req);
  const redirectUri = `${origin}/api/auth/google/callback`;

  if (!code) {
    console.error("[/api/auth/google/callback] Missing authorization code");
    return NextResponse.redirect(`${origin}/login?error=google_auth_failed`);
  }

  try {
    // Exchange code for tokens from Google
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("[/api/auth/google/callback] Token exchange failed:", errText);
      return NextResponse.redirect(`${origin}/login?error=google_auth_failed`);
    }

    const tokens = await tokenRes.json();

    // Fetch user profile from Google using access token
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) {
      console.error("[/api/auth/google/callback] Failed to fetch Google profile");
      return NextResponse.redirect(`${origin}/login?error=google_auth_failed`);
    }

    const googleUser = await profileRes.json();
    const email = googleUser.email;
    const fullName = googleUser.name || googleUser.given_name || "";

    if (!email) {
      console.error("[/api/auth/google/callback] Google profile missing email");
      return NextResponse.redirect(`${origin}/login?error=google_auth_failed`);
    }

    // Find or create user in PostgreSQL
    let user = await findUserByEmail(email);
    if (!user) {
      user = await createUser({
        email,
        full_name: fullName,
      });
    }

    if (!user) {
      return NextResponse.redirect(`${origin}/login?error=google_auth_failed`);
    }

    // Set HTTP-only session cookie
    await setSessionCookie(user);

    // Success redirect
    return NextResponse.redirect(`${origin}${next}`);
  } catch (err: any) {
    console.error("[/api/auth/google/callback] Unexpected error:", err?.message || err);
    return NextResponse.redirect(`${origin}/login?error=google_auth_failed`);
  }
}
