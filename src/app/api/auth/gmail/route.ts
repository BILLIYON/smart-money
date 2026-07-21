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
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2 style="color: #d32f2f;">Missing Configuration</h2>
          <p>Please add <b>GOOGLE_CLIENT_ID</b> and <b>GOOGLE_CLIENT_SECRET</b> to your Vercel Environment Variables.</p>
          <p style="color: #666; margin-top: 20px;">After adding them, you must <b>redeploy</b> the app on Vercel.</p>
          <!-- Padding to bypass Chrome's 512-byte short error filter: 
               ${"x".repeat(512)}
          -->
        </body>
      </html>
    `;
    return new Response(html, { 
      status: 500,
      headers: { "Content-Type": "text/html" }
    });
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
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h2 style="color: #d32f2f;">Auth Error</h2>
          <p>Failed to generate Google Auth URL: ${err.message}</p>
          <!-- Padding to bypass Chrome's 512-byte short error filter: 
               ${"x".repeat(512)}
          -->
        </body>
      </html>
    `;
    return new Response(html, { 
      status: 500,
      headers: { "Content-Type": "text/html" }
    });
  }
}


