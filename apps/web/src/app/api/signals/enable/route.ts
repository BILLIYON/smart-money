import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

// Maps onboarding source IDs to real signal_sources IDs in the DB
const SOURCE_MAP: Record<string, string> = {
  news: "tbill-alerts",
};

export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { sourceId } = await req.json() as { sourceId: string };
  const dbSourceId = SOURCE_MAP[sourceId] ?? sourceId;

  const { error: dbError } = await supabase
    .from("user_signal_sources")
    .upsert(
      { user_id: userId, source_id: dbSourceId, enabled: true },
      { onConflict: "user_id,source_id" }
    );

  if (dbError) {
    return NextResponse.json({ error: "Failed to enable signal source" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
