import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Updates the Supabase session and returns the refreshed response.
 * Must be called from middleware so auth cookies are kept fresh.
 */
export async function updateSession(request: NextRequest) {
  // Start with a pass-through response — we'll modify cookies on it
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies to the request (for downstream server reads)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Recreate response with updated request headers
          supabaseResponse = NextResponse.next({ request });
          // Write cookies to the response (sent back to browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() refreshes the session if expired.
  // Do NOT use getSession() here — it skips the refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user, supabase };
}
