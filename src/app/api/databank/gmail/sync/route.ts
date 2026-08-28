import { getCurrentUser } from "@/lib/auth";
import { syncGmailForUser } from "@/lib/gmail";
import { Pool } from "pg";

export const maxDuration = 60;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

export async function POST(req: Request) {
  const user = await getCurrentUser(req);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const results = await syncGmailForUser(user.id, true, (progress, syncedCount) => {
          try {
            controller.enqueue(
              encoder.encode(JSON.stringify({ progress, synced: syncedCount }) + "\n")
            );
          } catch (e) {
            // Client disconnected. Swallow the error to let sync continue in background.
          }
        }, false);
        try {
          controller.enqueue(
            encoder.encode(JSON.stringify({ progress: 100, entries: results }) + "\n")
          );
        } catch (e) {
          // Stream already closed
        }
      } catch (err: unknown) {
        let message = err instanceof Error ? err.message : "Sync failed";
        if (message.includes("DECRYPTION_FAILED")) {
          message = "Gmail connection encryption key mismatch. Please disconnect and reconnect your Gmail account to re-authenticate.";
        }
        try {
          controller.enqueue(
            encoder.encode(JSON.stringify({ error: message, progress: 100 }) + "\n")
          );
        } catch (e) {
          // Stream already closed
        }
      } finally {
        try {
          controller.close();
        } catch (e) {
          // Already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser(req);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rows } = await pool.query(
      `SELECT metadata FROM user_integrations WHERE user_id = $1 AND provider = 'gmail' LIMIT 1;`,
      [user.id]
    );

    const metadata = (rows[0]?.metadata as any) || {};

    const updatedMeta = {
      ...metadata,
      is_syncing: false,
      sync_progress: null,
      sync_message: "Sync stopped by user",
      sync_updated_at: new Date().toISOString(),
      should_stop_sync: true,
    };

    await pool.query(
      `UPDATE user_integrations SET metadata = $1 WHERE user_id = $2 AND provider = 'gmail';`,
      [JSON.stringify(updatedMeta), user.id]
    );

    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
