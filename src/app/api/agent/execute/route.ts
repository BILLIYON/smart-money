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

  try {
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

    const actionAmount = Number(action.amount || 0);

    if (actionAmount > 0) {
      // 1. Load user's current wallet balance
      const { data: walletEntries, error: walletError } = await supabase
        .from("databank_entries")
        .select("amount, entry_type")
        .eq("user_id", userId)
        .eq("category", "wallet");

      if (walletError) {
        console.error("[POST /api/agent/execute] Wallet fetch failed:", walletError);
        return NextResponse.json({ error: "Failed to verify wallet balance" }, { status: 500 });
      }

      const walletBalance = ((walletEntries as any[]) ?? []).reduce((sum, entry: any) => {
        const amt = Math.abs(Number(entry.amount || 0));
        return entry.entry_type === "expense" ? sum - amt : sum + amt;
      }, 0);

      // If wallet is insufficient, allow execution if user balance allows, or record transaction directly
      // 2. Load user's current limits
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("limit_per_action, limit_daily, limit_monthly")
        .eq("id", userId)
        .single();

      if (!userError && user) {
        const limitPerAction = Number(user.limit_per_action);
        const limitDaily = Number(user.limit_daily);
        const limitMonthly = Number(user.limit_monthly);

        if (limitPerAction > 0 && actionAmount > limitPerAction) {
          return NextResponse.json({ error: "Action amount exceeds your per-action security limit" }, { status: 400 });
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: todayActions } = await supabase
          .from("agent_actions")
          .select("amount")
          .eq("user_id", userId)
          .eq("status", "executed")
          .gte("executed_at", todayStart.toISOString());

        const todaySum = ((todayActions as any[]) ?? []).reduce((sum: number, a: any) => sum + Number(a.amount || 0), 0);
        if (limitDaily > 0 && todaySum + actionAmount > limitDaily) {
          return NextResponse.json({ error: "Action would exceed your daily transaction limit" }, { status: 400 });
        }
      }

      // On success, insert a corresponding debit entry in databank_entries (positive amount in kobo)
      const { error: debitError } = await supabase
        .from("databank_entries")
        .insert({
          user_id: userId,
          source: "manual",
          entry_type: "expense",
          amount: Math.abs(actionAmount),
          description: `Agent Execution: ${action.description}`,
          category: "transfer",
          entry_date: new Date().toISOString().split("T")[0],
          metadata: { type: "agent_debit", actionId },
        });

      if (debitError) {
        console.error("[POST /api/agent/execute] Debit entry failed:", debitError);
        return NextResponse.json({ error: "Failed to record wallet transaction" }, { status: 500 });
      }
    }

    const reference = genReference();
    const now = new Date().toISOString();

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
      console.error("[POST /api/agent/execute] Action update failed:", updateError);
      return NextResponse.json({ error: "Failed to record execution status" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, reference, executedAt: now });
  } catch (err) {
    console.error("[POST /api/agent/execute] Parsing error:", err);
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
