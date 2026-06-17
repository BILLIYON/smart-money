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
}


