import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";

export async function GET(req: Request) {
  const urlObj = new URL(req.url);
  const redirectUri = `${urlObj.origin}/api/auth/gmail/callback`;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return new Response(
      "Missing Google OAuth credentials in environment variables (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)",
      { status: 500 }
    );
  }

  // Get current user session to secure the OAuth callback
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = urlObj;
  const returnPath = searchParams.get("return") ?? "/databank";

  // Encrypt the user's ID and target return path inside state
  const statePayload = JSON.stringify({ userId: user.id, returnPath });
  const state = encrypt(statePayload);

  try {
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",  // gets refresh_token for background sync
      prompt: "consent",       // always show consent (ensures refresh token)
      scope: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.labels",
      ],
      state,
    });
    return Response.redirect(url);
  } catch (err: any) {
    console.error("[gmail/route] Auth URL generation failed:", err);
    return new Response(`Failed to generate Google Auth URL: ${err.message}`, { status: 500 });
  }
}


