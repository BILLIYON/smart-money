import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { decrypt, encrypt } from "@/lib/crypto";
import { syncGmailForUser } from "@/lib/gmail";

function redirectOrPopup(url: string, type: "GMAIL_CONNECTED" | "GMAIL_ERROR") {
  return new Response(
    `<!DOCTYPE html>
    <html>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: "${type}" }, "*");
            window.close();
          } else {
            window.location.href = "${url}";
          }
        </script>
      </body>
    </html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

export async function GET(req: Request) {
  const urlObj = new URL(req.url);
  const baseUrl = urlObj.origin;
  const redirectUri = `${baseUrl}/api/auth/gmail/callback`;

  const clientId = process.env.GOOGLE_CLIENT_ID || "64971754557-dt5ldg3u1vrvbns4k7venkvvcdtajfhl.apps.googleusercontent.com";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "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";

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  try {
    const { searchParams } = urlObj;
    const code = searchParams.get("code");

    if (!code) {
      console.error("[gmail/callback] Missing authorization code");
      return redirectOrPopup(`${baseUrl}/databank?gmail=error`, "GMAIL_ERROR");
    }

    // Exchange code for tokens
    let tokens: {
      access_token?: string | null;
      refresh_token?: string | null;
      expiry_date?: number | null;
    };
    try {
      const result = await oauth2Client.getToken(code);
      tokens = result.tokens;
    } catch (err: any) {
      console.error("[gmail/callback] Token exchange failed:", err?.message || err);
      return redirectOrPopup(`${baseUrl}/databank?gmail=error`, "GMAIL_ERROR");
    }

    if (!tokens.access_token) {
      console.error("[gmail/callback] Missing access token in Google response:", tokens);
      return redirectOrPopup(`${baseUrl}/databank?gmail=error`, "GMAIL_ERROR");
    }

    // Decrypt the state parameter if present to resolve the user ID and redirect path
    const state = searchParams.get("state");
    let stateUserId: string | null = null;
    let returnPath = "/databank";

    if (state) {
      try {
        const decrypted = decrypt(state);
        const parsed = JSON.parse(decrypted);
        stateUserId = parsed.userId || null;
        returnPath = parsed.returnPath || "/databank";
      } catch (err) {
        if (state.startsWith("/")) {
          returnPath = state;
        } else {
          console.error("[gmail/callback] Failed to decrypt state:", err);
        }
      }
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const targetUserId = stateUserId || user?.id || "guest";

    if (targetUserId && targetUserId !== "guest") {
      try {
        const serviceSupabase = createServiceSupabaseClient();
        await serviceSupabase.from("user_integrations").upsert(
          {
            user_id:      targetUserId,
            provider:     "gmail",
            access_token: encrypt(tokens.access_token),
            refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : "",
            token_expiry: tokens.expiry_date
              ? new Date(tokens.expiry_date).toISOString()
              : null,
            connected_at: new Date().toISOString(),
            scopes:       ["gmail.readonly", "gmail.labels"],
          },
          { onConflict: "user_id,provider" }
        );
      } catch (dbErr) {
        console.error("[gmail/callback] DB upsert failed:", dbErr);
      }

      // Kick off background sync for logged in user
      syncGmailForUser(targetUserId).catch((err) => {
        console.error("[gmail/callback] Initial Gmail sync failed:", err?.message || err);
      });
    }

    return redirectOrPopup(`${baseUrl}${returnPath}?gmail=connected`, "GMAIL_CONNECTED");
  } catch (err: any) {
    console.error("[gmail/callback] Unexpected callback error:", err?.message || err);
    return redirectOrPopup(`${baseUrl}/databank?gmail=error`, "GMAIL_ERROR");
  }
}
