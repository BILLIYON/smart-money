import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth + magic-link callback.
 * Supabase redirects here with ?code=xxx after successful provider auth.
 * We exchange the code for a session, then redirect to the app.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/marketplace";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[/auth/callback] exchangeCodeForSession:", error.message);
  }

  // Something went wrong — bounce to login with an error flag
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
