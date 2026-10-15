import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

function genReference(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SM${ts}${rand}`;
}

export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error || !userId) {
    return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, action_type, amount, buddy_id } = await req.json() as {
      title?: string;
      action_type?: string;
      amount?: number; // amount in kobo/cents
      buddy_id?: string;
    };

    const actionTitle = title || "Agent Action";
    const actionType = action_type || "transfer";
    const amountKobo = Math.abs(Number(amount || 0));
    const reference = genReference();
    const now = new Date().toISOString();

    // 1. Record in agent_actions table as executed
    const { data: actionData, error: actionErr } = await supabase
      .from("agent_actions")
      .insert({
        user_id: userId,
        buddy_id: buddy_id || null,
        action_type: actionType,
        description: actionTitle,
        amount: amountKobo,
        currency: "NGN",
        status: "executed",
        reference,
        approved_at: now,
        executed_at: now,
      })
      .select("id")
      .single();

    if (actionErr) {
      console.warn("[POST /api/agent/execute-direct] agent_actions log warning:", actionErr);
    }

    const actionId = actionData?.id;

    // 2. Insert debit transaction entry in databank_entries so it appears in DataBank immediately
    if (amountKobo > 0) {
      const { error: databankErr } = await supabase
        .from("databank_entries")
        .insert({
          user_id: userId,
          source: "manual",
          entry_type: "expense",
          amount: amountKobo,
          description: `Agent Execution: ${actionTitle}`,
          category: "transfer",
          entry_date: new Date().toISOString().split("T")[0],
          metadata: {
            type: "agent_execution",
            action_type: actionType,
            reference,
            actionId,
            created_by_agent: true,
          },
        });

      if (databankErr) {
        console.error("[POST /api/agent/execute-direct] databank_entries error:", databankErr);
        return NextResponse.json({ error: "Failed to record transaction to DataBank" }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      reference,
      executedAt: now,
      amount: amountKobo,
      title: actionTitle,
    });
  } catch (err: any) {
    console.error("[POST /api/agent/execute-direct] Error:", err);
    return NextResponse.json({ error: err?.message || "Failed to execute action" }, { status: 500 });
  }
}
