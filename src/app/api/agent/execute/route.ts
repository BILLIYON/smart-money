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
        .select("amount")
        .eq("user_id", userId)
        .eq("category", "wallet");

      if (walletError) {
        console.error("[POST /api/agent/execute] Wallet fetch failed:", walletError);
        return NextResponse.json({ error: "Failed to verify wallet balance" }, { status: 500 });
      }

      const walletBalance = (walletEntries ?? []).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
      if (actionAmount > walletBalance) {
        return NextResponse.json({ error: "Insufficient wallet balance to execute this action" }, { status: 400 });
      }

      // 2. Load user's current limits
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("limit_per_action, limit_daily, limit_monthly")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        console.error("[POST /api/agent/execute] User limits fetch failed:", userError);
        return NextResponse.json({ error: "Failed to verify security limits" }, { status: 500 });
      }

      const limitPerAction = Number(user.limit_per_action);
      const limitDaily = Number(user.limit_daily);
      const limitMonthly = Number(user.limit_monthly);

      // Check per-action limit
      if (actionAmount > limitPerAction) {
        return NextResponse.json({ error: "Action amount exceeds your per-action security limit" }, { status: 400 });
      }

      // Check daily limit
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayActions, error: todayErr } = await supabase
        .from("agent_actions")
        .select("amount")
        .eq("user_id", userId)
        .eq("status", "executed")
        .gte("executed_at", todayStart.toISOString());

      if (todayErr) {
        console.error("[POST /api/agent/execute] Daily actions fetch failed:", todayErr);
        return NextResponse.json({ error: "Failed to verify daily limit usage" }, { status: 500 });
      }

      const todaySum = (todayActions ?? []).reduce((sum, a) => sum + Number(a.amount || 0), 0);
      if (todaySum + actionAmount > limitDaily) {
        return NextResponse.json({ error: "Action would exceed your daily transaction limit" }, { status: 400 });
      }

      // Check monthly limit
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: monthActions, error: monthErr } = await supabase
        .from("agent_actions")
        .select("amount")
        .eq("user_id", userId)
        .eq("status", "executed")
        .gte("executed_at", monthStart.toISOString());

      if (monthErr) {
        console.error("[POST /api/agent/execute] Monthly actions fetch failed:", monthErr);
        return NextResponse.json({ error: "Failed to verify monthly limit usage" }, { status: 500 });
      }

      const monthSum = (monthActions ?? []).reduce((sum, a) => sum + Number(a.amount || 0), 0);
      if (monthSum + actionAmount > limitMonthly) {
        return NextResponse.json({ error: "Action would exceed your monthly transaction limit" }, { status: 400 });
      }

      // On success, insert a corresponding debit entry in databank_entries
      const { error: debitError } = await supabase
        .from("databank_entries")
        .insert({
          user_id: userId,
          source: "manual",
          entry_type: "expense",
          amount: -actionAmount, // negative amount for debit
          description: `Debit: ${action.description}`,
          category: "wallet",
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
