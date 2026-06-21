import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

export async function GET() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from("databank_entries")
    .select("amount")
    .eq("user_id", userId)
    .eq("category", "wallet");

  if (dbError) {
    console.error("[GET /api/agent/wallet]", dbError);
    return NextResponse.json({ error: "Failed to fetch wallet entries" }, { status: 500 });
  }

  const balance = (data ?? []).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  return NextResponse.json({ balance });
}
