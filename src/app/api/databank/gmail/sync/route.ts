import { getCurrentUser } from "@/lib/auth";
import { syncGmailForUser } from "@/lib/gmail";
import { Pool } from "pg";

export const maxDuration = 300;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
});

export async function POST(req: Request) {
  const user = await getCurrentUser(req);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const previewOnly = url.searchParams.get("preview") === "true";
  const saveToDb = !previewOnly;

  // Check user syncer preference from metadata
  let syncerEngine = "node_standard";
  try {
    const { rows } = await pool.query(
      `SELECT metadata FROM user_integrations WHERE user_id = $1 AND provider = 'gmail' LIMIT 1;`,
      [user.id]
    );
    const meta = rows[0]?.metadata || {};
    syncerEngine = meta.syncer_engine || "python_transaction";
  } catch (err) {
    console.warn("Failed to fetch user syncer engine metadata:", err);
  }

  const encoder = new TextEncoder();

  // If user selected Python Engine or AI Agentic Engine, try calling Python Service
  if (syncerEngine === "python_transaction" || syncerEngine === "ai_agentic") {
    try {
      const pythonRes = await fetch("http://127.0.0.1:8000/api/v1/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          mode: syncerEngine,
          save_to_db: saveToDb,
          max_results: 150
        }),
      });

      if (pythonRes.ok && pythonRes.body) {
        return new Response(pythonRes.body, {
          headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
          },
        });
      }
      console.warn(`[Sync Route] Python engine returned HTTP ${pythonRes.status}. Falling back to Node syncer.`);
    } catch (pythonErr) {
      console.warn("[Sync Route] Python engine unreachable. Falling back to Node syncer:", pythonErr);
    }
  }

  // Fallback / Standard Node.js Syncer
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const results = await syncGmailForUser(user.id, true, (progress, syncedCount) => {
          try {
            controller.enqueue(
              encoder.encode(JSON.stringify({ progress, synced: syncedCount }) + "\n")
            );
          } catch (e) {
            // Client disconnected.
          }
        }, saveToDb);
        try {
          controller.enqueue(
            encoder.encode(JSON.stringify({ progress: 100, entries: results }) + "\n")
          );
        } catch (e) {
          // Stream closed
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
          // Stream closed
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
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
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
