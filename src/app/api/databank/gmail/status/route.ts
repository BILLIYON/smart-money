import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ connected: false });
  }

  const { data: integration } = await supabase
    .from("user_integrations")
    .select("connected_at, last_synced_at, metadata")
    .eq("user_id", user.id)
    .eq("provider", "gmail")
    .single();

  if (!integration) {
    return Response.json({ connected: false });
  }

  const { count } = await supabase
    .from("databank_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("source", "gmail");

  return Response.json({
    connected: true,
    connectedAt: integration.connected_at,
    lastSyncedAt: integration.last_synced_at,
    entryCount: count ?? 0,
    metadata: integration.metadata,
  });
}

