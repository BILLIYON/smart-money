import { createClient } from "@/lib/supabase/server";
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
          controller.enqueue(
            encoder.encode(JSON.stringify({ progress, synced: syncedCount }) + "\n")
          );
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Sync failed";
        controller.enqueue(
          encoder.encode(JSON.stringify({ error: message, progress: 100 }) + "\n")
        );
      } finally {
        controller.close();
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

