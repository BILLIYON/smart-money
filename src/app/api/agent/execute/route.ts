import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

function genReference(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SM${ts}${rand}`;
}

export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { actionId } = await req.json() as { actionId: string };
  if (!actionId) {
    return NextResponse.json({ error: "actionId required" }, { status: 400 });
  }

  // Validate action exists, belongs to user, and is still pending
  const { data: action, error: fetchError } = await supabase
    .from("agent_actions")
    .select("*")
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

  const reference = genReference();
  const now = new Date().toISOString();

  // TODO: In production, call the relevant bank/fintech API here based on
  // action.action_type (e.g. Paystack for transfers, Flutterwave for bills).
  // For now we simulate success after a short delay.
  await new Promise((r) => setTimeout(r, 600));

  const { error: updateError } = await supabase
    .from("agent_actions")
    .update({
      status: "executed",
      reference,
      approved_at: now,
      executed_at: now,
    })
    .eq("id", actionId);

  if (updateError) {
    console.error("[POST /api/agent/execute]", updateError);
    return NextResponse.json({ error: "Failed to record execution" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reference, executedAt: now });
}
