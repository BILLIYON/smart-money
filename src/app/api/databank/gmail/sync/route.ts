import { createClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { syncGmailForUser } from "@/lib/gmail";

export const maxDuration = 60;

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await syncGmailForUser(user.id, true, (progress, syncedCount) => {
          try {
            controller.enqueue(
              encoder.encode(JSON.stringify({ progress, synced: syncedCount }) + "\n")
            );
          } catch (e) {
            // Client disconnected. Swallow the error to let sync continue in background.
          }
        });
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

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceSupabase = createServiceSupabaseClient();

  // Load current metadata via service role client
  const { data: integration } = await serviceSupabase
    .from("user_integrations")
    .select("metadata")
    .eq("user_id", user.id)
    .eq("provider", "gmail")
    .single();

  const metadata = integration?.metadata as any || {};

  // Set the stop flag via service role client
  await serviceSupabase
    .from("user_integrations")
    .update({
      metadata: {
        ...metadata,
        should_stop_sync: true,
      }
    })
    .eq("user_id", user.id)
    .eq("provider", "gmail");

  return Response.json({ success: true });
}

