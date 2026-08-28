import { requireAuth } from "@/lib/supabase-server";
import Papa from "papaparse";

export async function GET(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");

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

  if (format === "csv") {
    const entries: any[] = (entriesRes.data as any[]) ?? [];
    const formatted = entries.map((e) => ({
      ID: e.id,
      Source: e.source,
      Type: e.entry_type,
      "Amount (NGN)": (e.amount / 100).toFixed(2),
      Description: e.description,
      Category: e.category,
      Date: new Date(e.entry_date).toLocaleDateString(),
      "Created At": new Date(e.created_at).toLocaleString(),
    }));
    const csv = Papa.unparse(formatted);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="smart-money-export-${userId.slice(0, 8)}-${Date.now()}.csv"`,
      },
    });
  }

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
