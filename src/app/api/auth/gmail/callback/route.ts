import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { syncGmailForUser } from "@/lib/gmail";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(req: Request) {
  const fs = require("fs");
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      fs.appendFileSync("auth_error.log", `[${new Date().toISOString()}] Gmail Callback: Missing code\n`);
      return Response.redirect(`${BASE_URL}/databank?gmail=error`);
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
      fs.appendFileSync("auth_error.log", `[${new Date().toISOString()}] Gmail Callback: Token exchange failed: ${err?.message || err}\n`);
      console.error("[gmail/callback] Token exchange failed:", err);
      return Response.redirect(`${BASE_URL}/databank?gmail=error`);
    }

    if (!tokens.access_token || !tokens.refresh_token) {
      fs.appendFileSync("auth_error.log", `[${new Date().toISOString()}] Gmail Callback: Missing tokens in response: ${JSON.stringify(tokens)}\n`);
      console.error("[gmail/callback] Missing tokens in response", tokens);
      return Response.redirect(`${BASE_URL}/databank?gmail=error`);
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      fs.appendFileSync("auth_error.log", `[${new Date().toISOString()}] Gmail Callback: No session found\n`);
      return Response.redirect(`${BASE_URL}/login`);
    }

    // Persist tokens encrypted at rest
    const { error } = await supabase.from("user_integrations").upsert(
      {
        user_id:      session.user.id,
        provider:     "gmail",
        access_token: encrypt(tokens.access_token),
        refresh_token: encrypt(tokens.refresh_token),
        token_expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        connected_at: new Date().toISOString(),
        scopes:       ["gmail.readonly", "gmail.labels"],
      },
      { onConflict: "user_id,provider" }
    );

    if (error) {
      fs.appendFileSync("auth_error.log", `[${new Date().toISOString()}] Gmail Callback: Database insert failed: ${error.message}\n`);
      console.error("[gmail/callback] Failed to store tokens:", error.message);
      return Response.redirect(`${BASE_URL}/databank?gmail=error`);
    }

    // Kick off first sync in the background — do not await
    syncGmailForUser(session.user.id).catch((err) => {
      fs.appendFileSync("auth_error.log", `[${new Date().toISOString()}] Gmail Sync: Sync failed: ${err?.message || err}\n`);
    });

    const state = searchParams.get("state");
    const returnPath = state?.startsWith("/") ? state : "/databank";
    return Response.redirect(`${BASE_URL}${returnPath}?gmail=connected`);
  } catch (err: any) {
    fs.appendFileSync("auth_error.log", `[${new Date().toISOString()}] Gmail Callback: Unexpected error: ${err?.message || err}\n`);
    return Response.redirect(`${BASE_URL}/databank?gmail=error`);
  }
}
