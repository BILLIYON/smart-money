import { createClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ connected: false });
  }

  const serviceSupabase = createServiceSupabaseClient();

  const { data: integration } = await serviceSupabase
    .from("user_integrations")
    .select("connected_at, last_synced_at, metadata")
    .eq("user_id", user.id)
    .eq("provider", "gmail")
    .single();

  if (!integration) {
    return Response.json({ connected: false });
  }

  let metadata = (integration.metadata as Record<string, any>) || {};

  // Auto-recovery for stale/dead syncs (>35 seconds without heartbeat)
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

      await serviceSupabase
        .from("user_integrations")
        .update({ metadata })
        .eq("user_id", user.id)
        .eq("provider", "gmail");
    }
  }

  const { count } = await serviceSupabase
    .from("databank_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("source", "gmail");

  return Response.json({
    connected: true,
    connectedAt: integration.connected_at,
    lastSyncedAt: integration.last_synced_at,
    entryCount: count ?? 0,
    metadata,
  });
}


