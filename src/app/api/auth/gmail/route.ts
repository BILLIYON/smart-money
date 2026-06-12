import { google } from "googleapis";

export async function GET(req: Request) {
  const urlObj = new URL(req.url);
  const redirectUri = `${urlObj.origin}/api/auth/gmail/callback`;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const { searchParams } = urlObj;
  const returnPath = searchParams.get("return") ?? "/databank";

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",  // gets refresh_token for background sync
    prompt: "consent",       // always show consent (ensures refresh token)
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.labels",
    ],
    state: returnPath,
  });
  return Response.redirect(url);
}

