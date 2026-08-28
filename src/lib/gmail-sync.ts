import { google } from "googleapis";
import { decrypt } from "@/lib/crypto";
import { Pool } from "pg";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

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
  const pool = getPool();

  try {
    const [integrationRes, userProfileRes] = await Promise.all([
      pool.query(
        `SELECT access_token, refresh_token, token_expiry FROM user_integrations WHERE user_id = $1 AND provider = 'gmail' LIMIT 1;`,
        [userId]
      ),
      pool.query(
        `SELECT currency FROM users WHERE id = $1 LIMIT 1;`,
        [userId]
      ),
    ]);

    const integration = integrationRes.rows[0];
    const userProfile = userProfileRes.rows[0];

    if (!integration) {
      console.error("[gmail-sync] No integration found for user", userId);
      return;
    }

    const currency = userProfile?.currency ?? "NGN";

    oauth2Client.setCredentials({
      access_token: decrypt(integration.access_token),
      refresh_token: decrypt(integration.refresh_token),
      expiry_date: new Date(integration.token_expiry).getTime(),
    });

    oauth2Client.on("tokens", async (tokens) => {
      if (tokens.access_token) {
        const { encrypt } = await import("@/lib/crypto");
        const tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;
        await pool.query(
          `UPDATE user_integrations SET access_token = $1, token_expiry = COALESCE($2, token_expiry) WHERE user_id = $3 AND provider = 'gmail';`,
          [encrypt(tokens.access_token), tokenExpiry, userId]
        );
      }
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

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

      let entryDate = new Date().toISOString().split("T")[0];
      if (date) {
        const parsed = new Date(date);
        if (!isNaN(parsed.getTime())) {
          entryDate = parsed.toISOString().split("T")[0];
        }
      }

      await pool.query(
        `INSERT INTO databank_entries (
          user_id, source, entry_type, description, metadata, amount, currency, gmail_message_id, entry_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (gmail_message_id) DO UPDATE SET
          description = EXCLUDED.description,
          metadata = EXCLUDED.metadata,
          entry_date = EXCLUDED.entry_date;`,
        [
          userId,
          "gmail",
          "income",
          subject,
          JSON.stringify({ from, date, gmail_message_id: msg.id }),
          0,
          currency,
          msg.id,
          entryDate,
        ]
      );
    }

    await pool.query(
      `UPDATE user_integrations SET last_synced_at = NOW() WHERE user_id = $1 AND provider = 'gmail';`,
      [userId]
    );
  } finally {
    await pool.end();
  }
}
