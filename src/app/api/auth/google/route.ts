import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const next = searchParams.get("next") ?? "/";
  const redirectUri = `${new URL(req.url).origin}/api/auth/google/callback`;

  const googleAuthUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=openid%20email%20profile&` +
    `state=${encodeURIComponent(next)}&` +
    `prompt=select_account`;

  return NextResponse.redirect(googleAuthUrl);
}
