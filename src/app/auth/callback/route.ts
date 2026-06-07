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
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fail-safe: ensure user profile exists in public.users and contains the email address
        const { data: profile } = await supabase
          .from("users")
          .select("id, email")
          .eq("id", user.id)
          .single();

        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";

        if (!profile) {
          await supabase.from("users").insert({
            id: user.id,
            email: user.email || "",
            full_name: fullName,
            onboarding_complete: false,
          });
        } else if (!profile.email && user.email) {
          await supabase
            .from("users")
            .update({ email: user.email })
            .eq("id", user.id);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[/auth/callback] exchangeCodeForSession:", error.message);
  }

  // Something went wrong — bounce to login with an error flag
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
