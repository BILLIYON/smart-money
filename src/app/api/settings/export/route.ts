import { requireAuth } from "@/lib/supabase-server";

export async function GET() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  // Fetch everything in parallel
  const [userRes, goalsRes, entriesRes, actionsRes, sessionsRes, subsRes] =
    await Promise.all([
      supabase.from("users").select("*").eq("id", userId).single(),
      supabase.from("goals").select("*").eq("user_id", userId),
      supabase.from("databank_entries").select("*").eq("user_id", userId),
      supabase.from("agent_actions").select("*").eq("user_id", userId),
      supabase.from("chat_sessions").select("id, buddy_ids, session_name, is_group, created_at, last_message_at").eq("user_id", userId),
      supabase.from("user_buddies").select("buddy_id, subscribed_at, active").eq("user_id", userId),
    ]);

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    profile: userRes.data,
    subscriptions: subsRes.data ?? [],
    goals: goalsRes.data ?? [],
    databankEntries: entriesRes.data ?? [],
    agentActions: actionsRes.data ?? [],
    chatSessions: sessionsRes.data ?? [],
  };

  const json = JSON.stringify(exportPayload, null, 2);

  return new Response(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="smart-money-export-${userId.slice(0, 8)}-${Date.now()}.json"`,
    },
  });
}
