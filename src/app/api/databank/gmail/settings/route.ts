import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sync_mode, preset_filter, custom_query, ai_prompt, ai_engine, enable_fallback, fallback_engine, presets } = await req.json();

    // Fetch existing metadata to merge
    const { data: integration, error: fetchErr } = await supabase
      .from("user_integrations")
      .select("metadata")
      .eq("user_id", user.id)
      .eq("provider", "gmail")
      .single();

    if (fetchErr || !integration) {
      return Response.json({ error: "Gmail integration not connected" }, { status: 404 });
    }

    const updatedMetadata = {
      ...(integration.metadata || {}),
      sync_mode: sync_mode || "lightweight",
      preset_filter: preset_filter || "all",
      custom_query: custom_query || "",
      ai_prompt: ai_prompt || "",
      ai_engine: ai_engine || "groq",
      enable_fallback: enable_fallback !== undefined ? Boolean(enable_fallback) : true,
      fallback_engine: fallback_engine || "groq",
    };

    if (presets) {
      updatedMetadata.presets = presets;
    }

    const { error: updateErr } = await supabase
      .from("user_integrations")
      .update({ metadata: updatedMetadata })
      .eq("user_id", user.id)
      .eq("provider", "gmail");

    if (updateErr) {
      throw updateErr;
    }

    return Response.json({ ok: true, metadata: updatedMetadata });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update settings";
    return Response.json({ error: message }, { status: 500 });
  }
}
