import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

export async function GET() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from("agent_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (dbError) {
    console.error("[GET /api/agent/pending]", dbError);
    return NextResponse.json({ error: "Failed to fetch actions" }, { status: 500 });
  }

  return NextResponse.json(data);
}
