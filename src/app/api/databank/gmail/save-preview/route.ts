import { createClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entries } = await req.json();

    if (!Array.isArray(entries)) {
      return NextResponse.json({ error: "entries must be an array" }, { status: 400 });
    }

    const serviceSupabase = createServiceSupabaseClient();

    if (entries.length > 0) {
      // Upsert into databank_entries
      const { error: upsertError } = await serviceSupabase
        .from("databank_entries")
        .upsert(entries, {
          onConflict: "gmail_message_id",
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error("[save-preview] Database upsert failed:", upsertError.message);
        return NextResponse.json({ error: `Database upsert failed: ${upsertError.message}` }, { status: 500 });
      }
    }

    // Update the last sync time on user_integrations
    const { data: integration } = await serviceSupabase
      .from("user_integrations")
      .select("metadata")
      .eq("user_id", user.id)
      .eq("provider", "gmail")
      .single();

    const metadata = (integration?.metadata as any) || {};

    await serviceSupabase
      .from("user_integrations")
      .update({
        last_synced_at: new Date().toISOString(),
        metadata: {
          ...metadata,
          is_syncing: false,
          sync_progress: 100,
          sync_message: `Synced ${entries.length} new transactions`
        }
      })
      .eq("user_id", user.id)
      .eq("provider", "gmail");

    return NextResponse.json({ success: true, count: entries.length });
  } catch (err: any) {
    console.error("[save-preview] Error saving preview:", err);
    return NextResponse.json({ error: err.message || "Failed to save data" }, { status: 500 });
  }
}
