import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  try {
    const { actionId } = await req.json() as { actionId: string };
    if (!actionId) {
      return NextResponse.json({ error: "actionId required" }, { status: 400 });
    }

    const { data: action, error: fetchError } = await supabase
      .from("agent_actions")
      .select("id")
      .eq("id", actionId)
      .eq("user_id", userId)
      .eq("status", "pending")
      .single();

    if (fetchError || !action) {
      return NextResponse.json(
        { error: "Action not found or already processed" },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabase
      .from("agent_actions")
      .update({ status: "declined" })
      .eq("id", actionId);

    if (updateError) {
      console.error("[POST /api/agent/decline]", updateError);
      return NextResponse.json({ error: "Failed to decline action" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/agent/decline] Parsing error:", err);
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
