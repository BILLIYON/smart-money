import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

export async function DELETE() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  try {
    // Delete databank entries
    const { error: databankError } = await supabase
      .from("databank_entries")
      .delete()
      .eq("user_id", userId);

    if (databankError) throw databankError;

    // Delete chat sessions (cascades to messages)
    const { error: chatError } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("user_id", userId);

    if (chatError) throw chatError;

    // Delete goals
    const { error: goalsError } = await supabase
      .from("goals")
      .delete()
      .eq("user_id", userId);

    if (goalsError) throw goalsError;

    // Delete agent actions
    const { error: actionsError } = await supabase
      .from("agent_actions")
      .delete()
      .eq("user_id", userId);

    if (actionsError) throw actionsError;

    return NextResponse.json({ ok: true, message: "All DataBank data and memory permanently deleted." });
  } catch (err: any) {
    console.error("Failed to wipe databank and memory:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
