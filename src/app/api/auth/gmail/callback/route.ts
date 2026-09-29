import { google } from "googleapis";
import { getCurrentUser } from "@/lib/auth";
import { decrypt, encrypt } from "@/lib/crypto";
import { getAppOrigin } from "@/lib/auth-utils";
import { Pool } from "pg";

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money";
const isRemote = dbUrl.includes("supabase.com") || dbUrl.includes("pooler") || dbUrl.includes("aws-");
const localPool = new Pool({
  connectionString: dbUrl,
  ssl: isRemote ? { rejectUnauthorized: false } : false,
});

function redirectOrPopup(url: string, type: "GMAIL_CONNECTED" | "GMAIL_ERROR") {
  return new Response(
    `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Smart Money Google Connect</title>
        <meta http-equiv="refresh" content="3;url=${url}">
      </head>
      <body style="background: #0f172a; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
        <div style="text-align: center; max-width: 420px; padding: 24px; background: rgba(30,41,59,0.7); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="font-size: 36px; margin-bottom: 12px;">🚀</div>
          <div style="font-size: 17px; font-weight: 600; margin-bottom: 6px;">Google Connected!</div>
          <div style="font-size: 13px; color: #94a3b8;">Redirecting to deploy your Financial Ledger...</div>
        </div>
        <script>
          try {
            if (window.opener && !window.opener.closed) {
              try {
                window.opener.location.href = "${url}";
              } catch(e) {}
              try {
                window.opener.postMessage({ type: "${type}", url: "${url}" }, "*");
              } catch(e) {}
              setTimeout(function() {
                try { window.close(); } catch(e) {}
              }, 400);
            } else {
              window.location.href = "${url}";
            }
          } catch(e) {
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
            [
              "https://www.googleapis.com/auth/gmail.readonly",
              "https://www.googleapis.com/auth/gmail.labels",
              "https://www.googleapis.com/auth/spreadsheets",
              "https://www.googleapis.com/auth/drive.file",
            ],
          ]
        );

        // Auto-provision Google Sheet financial ledger from master template immediately
        try {
          const { getOrCreateLedgerSheet } = await import("@/lib/google-sheets");
          await getOrCreateLedgerSheet(targetUserId, true);
        } catch (sheetProvisionErr) {
          console.warn("[gmail/callback] Background sheet provisioning warning:", sheetProvisionErr);
        }
      } catch (dbErr) {
        console.error("[gmail/callback] DB upsert failed:", dbErr);
      }
    }

    let destinationUrl = `${baseUrl}/databank?gmail=connected&deploy=true#google-sheets-ledger`;
    if (returnPath) {
      try {
        const parsedUrl = new URL(returnPath, baseUrl);
        parsedUrl.searchParams.set("gmail", "connected");
        parsedUrl.searchParams.set("deploy", "true");
        if (!parsedUrl.hash) {
          parsedUrl.hash = "google-sheets-ledger";
        }
        destinationUrl = parsedUrl.toString();
      } catch {
        const sep = returnPath.includes("?") ? "&" : "?";
        destinationUrl = `${baseUrl}${returnPath}${sep}gmail=connected&deploy=true#google-sheets-ledger`;
      }
    }

    return redirectOrPopup(destinationUrl, "GMAIL_CONNECTED");
  } catch (err: any) {
    console.error("[gmail/callback] Unexpected callback error:", err?.message || err);
    return redirectOrPopup(`${baseUrl}/databank?gmail=error`, "GMAIL_ERROR");
  }
}
