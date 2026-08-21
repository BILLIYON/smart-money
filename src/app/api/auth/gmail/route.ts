import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { getAppOrigin } from "@/lib/auth-utils";

export async function GET(req: Request) {
  try {
    const urlObj = new URL(req.url);
    const origin = getAppOrigin(req);
    const redirectUri = `${origin}/api/auth/gmail/callback`;

    const clientId = process.env.GOOGLE_CLIENT_ID || "64971754557-dt5ldg3u1vrvbns4k7venkvvcdtajfhl.apps.googleusercontent.com";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "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";

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Get current user session safely
    let userId = "guest";
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) userId = user.id;
    } catch {
      // Fallback for guest mode
    }

    const { searchParams } = urlObj;
    const returnPath = searchParams.get("return") ?? "/databank";

    // Encrypt the user's ID and target return path inside state
    const statePayload = JSON.stringify({ userId, returnPath });
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
  } catch (err: any) {
    console.error("[gmail/route] Auth URL generation failed:", err);
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gmail Auth Error</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b1528; color: #ffffff; padding: 40px 20px; text-align: center;">
          <div style="max-width: 400px; margin: 0 auto; background: #13233d; border: 1px solid rgba(255,255,255,0.1); padding: 30px; border-radius: 16px;">
            <div style="font-size: 36px; margin-bottom: 12px;">⚠️</div>
            <h3 style="margin: 0 0 8px 0; color: #f87171; font-size: 18px;">Gmail Authorization Error</h3>
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
              ${err?.message || "Failed to generate Google Authentication URL. Please try again."}
            </p>
            <button onclick="window.close()" style="background: #00c48c; color: #fff; border: none; padding: 10px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 13px;">
              Close Window
            </button>
          </div>
        </body>
      </html>
    `;
    return new Response(html, { 
      status: 200,
      headers: { "Content-Type": "text/html" }
    });
  }
}
