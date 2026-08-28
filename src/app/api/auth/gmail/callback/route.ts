import { google } from "googleapis";
import { getCurrentUser } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/crypto";
import { getAppOrigin } from "@/lib/auth-utils";
import { Pool } from "pg";

const localPool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

function redirectOrPopup(url: string, type: "GMAIL_CONNECTED" | "GMAIL_ERROR") {
  return new Response(
    `<!DOCTYPE html>
    <html>
      <body>
        <script>
          try {
            if (window.opener) {
              window.opener.postMessage({ type: "${type}" }, "*");
            }
          } catch(e) {}
          setTimeout(function() {
            if (window.opener) {
              window.close();
            } else {
              window.location.href = "${url}";
            }
          }, 350);
        </script>
      </body>
    </html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

export async function GET(req: Request) {
  const urlObj = new URL(req.url);
  const baseUrl = getAppOrigin(req);
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

    const currentUser = await getCurrentUser(req);
    const targetUserId = (stateUserId && stateUserId !== "guest") ? stateUserId : (currentUser?.id || "guest");

    if (targetUserId && targetUserId !== "guest") {
      try {
        const tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;
        await localPool.query(
          `INSERT INTO user_integrations (
            user_id, provider, access_token, refresh_token, token_expiry, connected_at, scopes
          ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
          ON CONFLICT (user_id, provider) DO UPDATE SET
            access_token = EXCLUDED.access_token,
            refresh_token = CASE WHEN EXCLUDED.refresh_token != '' THEN EXCLUDED.refresh_token ELSE user_integrations.refresh_token END,
            token_expiry = COALESCE(EXCLUDED.token_expiry, user_integrations.token_expiry),
            connected_at = NOW(),
            scopes = EXCLUDED.scopes;`,
          [
            targetUserId,
            "gmail",
            encrypt(tokens.access_token),
            tokens.refresh_token ? encrypt(tokens.refresh_token) : "",
            tokenExpiry,
            ["gmail.readonly", "gmail.labels"],
          ]
        );
      } catch (dbErr) {
        console.error("[gmail/callback] DB upsert failed:", dbErr);
      }
    }

    return redirectOrPopup(`${baseUrl}${returnPath}?gmail=connected`, "GMAIL_CONNECTED");
  } catch (err: any) {
    console.error("[gmail/callback] Unexpected callback error:", err?.message || err);
    return redirectOrPopup(`${baseUrl}/databank?gmail=error`, "GMAIL_ERROR");
  }
}
