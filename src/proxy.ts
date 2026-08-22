import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/", "/login", "/register", "/chat", "/contact"]);
const AUTH_PATHS = new Set(["/login", "/register"]);
const AUTH_REDIRECT = "/";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass-through static files (files with extensions) to avoid infinite redirect loops on sw.js, manifest.webmanifest, etc.
  if (pathname.includes(".") && !pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("smart_money_session")?.value;
  const user = token ? verifyToken<{ id: string; email: string; is_admin?: boolean }>(token) : null;

  const isPublicPath =
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/marketplace/") ||
    pathname.startsWith("/buddies/") ||
    pathname.startsWith("/chat/") ||
    pathname === "/contact" ||
    pathname === "/api/contact" ||
    pathname === "/api/studio" ||
    pathname === "/api/chat/preview" ||
    pathname === "/api/hidden-buddies" ||
    pathname === "/api/databank/sources-summary" ||
    pathname === "/api/subscriptions/price" ||
    pathname.startsWith("/api/auth/");

  const isAuthPath = AUTH_PATHS.has(pathname);

  // Unauthenticated user hitting a protected route → /login or return 401 for API
  if (!user && !isPublicPath) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user hitting login/register → redirect to app
  if (user && isAuthPath) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = AUTH_REDIRECT;
    return NextResponse.redirect(appUrl);
  }

  // Admin routes — require is_admin flag
  if (pathname.startsWith("/admin")) {
    if (!user || !user.is_admin) {
      const rootUrl = request.nextUrl.clone();
      rootUrl.pathname = "/";
      return NextResponse.redirect(rootUrl);
    }
  }

  return NextResponse.next();
}
