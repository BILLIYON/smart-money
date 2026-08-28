import { getCurrentUser } from "@/lib/auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

export async function GET(req: Request) {
  const user = await getCurrentUser(req);

  if (!user) {
    return Response.json({ connected: false });
  }

  try {
    const { rows: intRows } = await pool.query(
      `SELECT connected_at, last_synced_at, metadata FROM user_integrations WHERE user_id = $1 AND provider = 'gmail' LIMIT 1;`,
      [user.id]
    );

    const integration = intRows[0];
    if (!integration) {
      return Response.json({ connected: false });
    }

    let metadata = (integration.metadata as Record<string, any>) || {};

    if (metadata.is_syncing) {
      const lastUpdate = metadata.sync_updated_at ? new Date(metadata.sync_updated_at).getTime() : 0;
      const now = Date.now();
      const STALE_THRESHOLD_MS = 35 * 1000;

      if (now - lastUpdate > STALE_THRESHOLD_MS) {
        metadata = {
          ...metadata,
          is_syncing: false,
          sync_progress: null,
          sync_message: "Sync complete",
          sync_updated_at: new Date().toISOString(),
        };

        await pool.query(
          `UPDATE user_integrations SET metadata = $1 WHERE user_id = $2 AND provider = 'gmail';`,
          [JSON.stringify(metadata), user.id]
        );
      }
    }

    const { rows: countRows } = await pool.query(
      `SELECT count(*)::int as count FROM databank_entries WHERE user_id = $1 AND source = 'gmail';`,
      [user.id]
    );

    return Response.json({
      connected: true,
      connectedAt: integration.connected_at,
      lastSyncedAt: integration.last_synced_at,
      entryCount: countRows[0]?.count ?? 0,
      metadata,
    });
  } catch (err: any) {
    console.error("[databank/gmail/status] Error:", err);
    return Response.json({ connected: false });
  }
}
