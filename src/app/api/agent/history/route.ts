import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

export async function GET() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { data: actions, error: dbError } = await supabase
    .from("agent_actions")
    .select(`
      id,
      status,
      action_type,
      description,
      amount,
      currency,
      created_at,
      executed_at,
      buddy_id
    `)
    .eq("user_id", userId)
    .neq("status", "pending")
    .order("created_at", { ascending: false });

  if (dbError) {
    console.error("[GET /api/agent/history]", dbError);
    return NextResponse.json({ error: "Failed to fetch action history" }, { status: 500 });
  }

  // Load buddy names
  const { data: buddies, error: buddyError } = await supabase
    .from("buddies")
    .select("id, name");

  const buddyMap = new Map<string, string>();
  if (!buddyError && buddies) {
    buddies.forEach((b) => buddyMap.set(b.id, b.name));
  }

  const formatted = (actions ?? []).map((action) => {
    const buddyName = buddyMap.get(action.buddy_id || "") || "AI Buddy";
    const dateObj = new Date(action.executed_at || action.created_at);
    const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }); // e.g. "Mar 3"

    let outcome = "Executed successfully";
    if (action.status === "declined") {
      outcome = "Decided to skip";
    } else {
      const type = (action.action_type || "").toLowerCase();
      if (type.includes("invest")) {
        outcome = "Funds allocated";
      } else if (type.includes("cancel") || type.includes("subscription")) {
        outcome = "Saves money monthly";
      } else if (type.includes("pay") || type.includes("bill") || type.includes("debt")) {
        outcome = "Paid off";
      }
    }

    return {
      id: action.id,
      status: action.status === "executed" ? "done" : "declined",
      title: action.description,
      buddy: buddyName,
      date: dateStr,
      outcome,
      amount: Number(action.amount || 0)
    };
  });

  return NextResponse.json(formatted);
}
