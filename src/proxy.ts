import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = new Set(["/login", "/register"]);
const AUTH_REDIRECT = "/marketplace";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { supabaseResponse, user, supabase } = await updateSession(request);

  const isPublicPath = PUBLIC_PATHS.has(pathname);

  // Unauthenticated user hitting a protected route → /login
  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user hitting login/register → redirect to app
  if (user && isPublicPath) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = AUTH_REDIRECT;
    return NextResponse.redirect(appUrl);
  }

  // Admin routes — require is_admin flag
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/auth/login";
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const { data } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!data?.is_admin) {
      const marketplaceUrl = request.nextUrl.clone();
      marketplaceUrl.pathname = "/marketplace";
      return NextResponse.redirect(marketplaceUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (Next.js build files)
     * - _next/image (image optimisation)
     * - favicon.ico, robots.txt, sitemap.xml
     * - /api/signals/webhook  (externally called, no user session)
     * - /auth/callback        (OAuth exchange — runs before session exists)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|api/signals/webhook|auth/callback).*)",
  ],
};
