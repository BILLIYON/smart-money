import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("state") ?? "/";
  const redirectUri = `${origin}/api/auth/google/callback`;

  if (!code) {
    console.error("[/api/auth/google/callback] Missing authorization code");
    return NextResponse.redirect(`${origin}/login?error=google_auth_failed`);
  }

  try {
    // Exchange code for tokens directly from Google
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
    const idToken = tokens.id_token;

    if (!idToken) {
      console.error("[/api/auth/google/callback] No id_token returned by Google");
      return NextResponse.redirect(`${origin}/login?error=google_auth_failed`);
    }

    // Authenticate user in Supabase locally using the Google ID Token
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) {
      console.error("[/api/auth/google/callback] signInWithIdToken failed:", error.message);
      return NextResponse.redirect(`${origin}/login?error=google_auth_failed`);
    }

    // Fail-safe: ensure user profile is in public.users
    if (data?.user) {
      const user = data.user;
      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profile) {
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
        await supabase.from("users").insert({
          id: user.id,
          email: user.email || "",
          full_name: fullName,
          onboarding_complete: false,
        });
      }
    }

    // Success redirect
    return NextResponse.redirect(`${origin}${next}`);
  } catch (err: any) {
    console.error("[/api/auth/google/callback] Unexpected error:", err?.message || err);
    return NextResponse.redirect(`${origin}/login?error=google_auth_failed`);
  }
}
