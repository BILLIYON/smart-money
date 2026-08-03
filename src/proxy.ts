import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/chat", "/contact"]);
const AUTH_PATHS = new Set(["/login", "/register"]);
const AUTH_REDIRECT = "/";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`[Proxy Middleware] Path: "${pathname}"`);

  const { supabaseResponse, user, supabase } = await updateSession(request);
  console.log(`[Proxy Middleware] Path: "${pathname}" | User: ${user ? user.email : "none"}`);

  // Pass-through static files (files with extensions) to avoid infinite redirect loops on sw.js, manifest.webmanifest, etc.
  if (pathname.includes(".") && !pathname.startsWith("/api/")) {
    console.log(`[Proxy Middleware] Path: "${pathname}" | Static Pass-through`);
    return supabaseResponse;
  }

  const isPublicPath =
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/marketplace/") ||
    pathname.startsWith("/buddies/") ||
    pathname.startsWith("/chat/") ||
    pathname === "/contact" ||
    pathname === "/api/contact" ||
    pathname === "/api/studio" ||
    pathname === "/api/hidden-buddies" ||
    pathname === "/api/databank/sources-summary" ||
    pathname === "/api/subscriptions/price" ||
    pathname.startsWith("/api/auth/google");

  const isAuthPath = AUTH_PATHS.has(pathname);
  console.log(`[Proxy Middleware] Path: "${pathname}" | isPublic: ${isPublicPath} | isAuth: ${isAuthPath}`);

  // Unauthenticated user hitting a protected route → /login or return 401 for API
  if (!user && !isPublicPath) {
    if (pathname.startsWith("/api/")) {
      console.log(`[Proxy Middleware] Path: "${pathname}" | Protected API -> 401 Unauthorized`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    console.log(`[Proxy Middleware] Path: "${pathname}" | Redirecting unauthenticated to /login`);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user hitting login/register → redirect to app
  if (user && isAuthPath) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = AUTH_REDIRECT;
    console.log(`[Proxy Middleware] Path: "${pathname}" | Redirecting authenticated to root: "${AUTH_REDIRECT}"`);
    return NextResponse.redirect(appUrl);
  }

  // Admin routes — require is_admin flag
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
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
      marketplaceUrl.pathname = "/";
      return NextResponse.redirect(marketplaceUrl);
    }
  }

  return supabaseResponse;
}

