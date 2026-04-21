import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * Fetches the stored Gmail tokens for a user, sets credentials on the OAuth
 * client, and syncs recent financial emails into databank_entries.
 */
export async function syncGmailForUser(userId: string): Promise<void> {
  const supabase = await createClient();

  // Load stored tokens and user currency in parallel
  const [{ data: integration, error }, { data: userProfile }] = await Promise.all([
    supabase
      .from("user_integrations")
      .select("access_token, refresh_token, token_expiry")
      .eq("user_id", userId)
      .eq("provider", "gmail")
      .single(),
    supabase
      .from("users")
      .select("currency")
      .eq("id", userId)
      .single(),
  ]);

  if (error || !integration) {
    console.error("[gmail-sync] No integration found for user", userId);
    return;
  }

  const currency = userProfile?.currency ?? "NGN";

  oauth2Client.setCredentials({
    access_token: decrypt(integration.access_token),
    refresh_token: decrypt(integration.refresh_token),
    expiry_date: new Date(integration.token_expiry).getTime(),
  });

  // Refresh token if expired
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      const { encrypt } = await import("@/lib/crypto");
      await supabase
        .from("user_integrations")
        .update({
          access_token: encrypt(tokens.access_token),
          ...(tokens.expiry_date && {
            token_expiry: new Date(tokens.expiry_date).toISOString(),
          }),
        })
        .eq("user_id", userId)
        .eq("provider", "gmail");
    }
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Fetch last 20 messages from financial labels / inbox
  const listRes = await gmail.users.messages.list({
    userId: "me",
    maxResults: 20,
    q: "category:primary OR label:finance",
  });

  const messages = listRes.data.messages ?? [];

  for (const msg of messages) {
    if (!msg.id) continue;

    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id,
      format: "metadata",
      metadataHeaders: ["Subject", "From", "Date"],
    });

    const headers = detail.data.payload?.headers ?? [];
    const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
    const from    = headers.find((h) => h.name === "From")?.value ?? "";
    const date    = headers.find((h) => h.name === "Date")?.value ?? "";

    // Store as a databank entry with source=gmail (upsert by gmail_message_id)
    await supabase.from("databank_entries").upsert(
      {
        user_id:          userId,
        source:           "gmail",
        entry_type:       "income",
        description:      subject,
        metadata:         { from, date, gmail_message_id: msg.id },
        amount:           0, // amount parsed by a later enrichment step
        currency:         currency,
        gmail_message_id: msg.id,
      },
      { onConflict: "gmail_message_id" }
    );
  }

  // Update last_synced_at
  await supabase
    .from("user_integrations")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", "gmail");
}
