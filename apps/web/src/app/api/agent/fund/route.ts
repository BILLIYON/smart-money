import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { amount } = await req.json() as { amount: number }; // kobo
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive integer (kobo)" }, { status: 400 });
  }

  // TODO: In production, initiate Paystack charge here, then confirm on webhook.
  // For now, record the deposit immediately.
  const { data, error: dbError } = await supabase
    .from("databank_entries")
    .insert({
      user_id: userId,
      source: "manual",
      entry_type: "income",
      amount,
      description: "Smart Money Wallet deposit",
      category: "wallet",
      entry_date: new Date().toISOString().split("T")[0],
      metadata: { type: "wallet_deposit" },
    })
    .select("id")
    .single();

  if (dbError) {
    console.error("[POST /api/agent/fund]", dbError);
    return NextResponse.json({ error: "Failed to record deposit" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, funded: amount, entryId: data.id });
}
