import { google } from "googleapis";
import { getCurrentUser } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({ error: "unauth" }, { status: 401 });
  }

  try {
    const { rows } = await pool.query(
      `SELECT access_token FROM user_integrations WHERE user_id = $1 AND provider = 'gmail' LIMIT 1;`,
      [user.id]
    );
    const integration = rows[0];

    if (integration?.access_token) {
      try {
        await oauth2Client.revokeToken(decrypt(integration.access_token));
      } catch (err) {
        console.warn("[gmail/revoke] Google revocation failed (continuing):", err);
      }
    }

    await pool.query(`DELETE FROM user_integrations WHERE user_id = $1 AND provider = 'gmail';`, [user.id]);
    await pool.query(`DELETE FROM databank_entries WHERE user_id = $1 AND source = 'gmail';`, [user.id]);

    return Response.json({ success: true });
  } finally {
    await pool.end();
  }
}
