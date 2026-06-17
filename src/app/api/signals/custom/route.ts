import { NextResponse } from "next/server";
import { requireAuth, createServiceSupabaseClient } from "@/lib/supabase-server";
import { parseRssFeed, transcribeMediaUrl, routeSignalToUser } from "@/lib/transcription";

export async function POST(req: Request) {
  const { supabase: userSupabase, userId, error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const { url, type, name } = await req.json() as {
      url: string;
      type: "rss" | "youtube" | "tiktok" | "podcast" | "newsletter";
      name?: string;
    };

    if (!url || !type) {
      return NextResponse.json({ error: "url and type are required" }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Bypass user RLS for signal_sources insertion
    const adminSupabase = createServiceSupabaseClient();

    // 1. Check if the signal source already exists in DB
    let { data: existingSource } = await adminSupabase
      .from("signal_sources")
      .select("id, name, api_endpoint, signal_schema")
      .eq("api_endpoint", url)
      .maybeSingle();

    let sourceId = existingSource?.id;
    let sourceName = name || existingSource?.name;

    if (!existingSource) {
      // 2. Derive a clean name from type & URL if name is not provided
      if (!sourceName) {
        try {
          const urlObj = new URL(url);
          const domain = urlObj.hostname.replace("www.", "");
          sourceName = `${type.toUpperCase()} from ${domain}`;
        } catch {
          sourceName = `Custom ${type.toUpperCase()} Source`;
        }
      }

      // Generate a unique source ID
      sourceId = `custom-${type}-${Math.random().toString(36).substring(2, 9)}`;

      // 3. Create the signal source record
      const { error: insertErr } = await adminSupabase
        .from("signal_sources")
        .insert({
          id: sourceId,
          name: sourceName,
          description: `Custom ${type} signal source: ${url}`,
          creator_name: "User Custom Source",
          price_monthly: 0,
          api_endpoint: url,
          signal_schema: { type, custom: true },
          status: "active",
        });

      if (insertErr) {
        console.error("[api/signals/custom] Failed to create signal source:", insertErr);
        return NextResponse.json({ error: "Failed to register signal source" }, { status: 500 });
      }
    }

    // 4. Subscribe the current user to this signal source
    const { error: subErr } = await userSupabase
      .from("user_signal_sources")
      .upsert(
        { user_id: userId, source_id: sourceId, enabled: true },
        { onConflict: "user_id,source_id" }
      );

    if (subErr) {
      console.error("[api/signals/custom] Failed to subscribe user to custom source:", subErr);
      return NextResponse.json({ error: "Failed to enable custom signal source" }, { status: 500 });
    }

    // 5. Fire transcription/parsing in the background (asynchronous)
    const activeSourceName = sourceName || `Custom ${type.toUpperCase()} Source`;
    (async () => {
      try {
        console.log(`[api/signals/custom] Ingesting signals from ${url} (${type})...`);
        if (type === "rss") {
          const feedItems = await parseRssFeed(url);
          for (const item of feedItems) {
            await routeSignalToUser(userId, sourceId!, activeSourceName, item);
          }
        } else {
          const singleSignal = await transcribeMediaUrl(url, type);
          await routeSignalToUser(userId, sourceId!, activeSourceName, singleSignal);
        }
      } catch (err) {
        console.error(`[api/signals/custom] Ingestion failed for source ${sourceId}:`, err);
      }
    })();

    return NextResponse.json({
      ok: true,
      source: {
        id: sourceId,
        name: activeSourceName,
        type,
        url,
      },
    });
  } catch (err: any) {
    console.error("[api/signals/custom] Unexpected error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { userId, error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    const { sourceId } = await req.json() as { sourceId: string };
    if (!sourceId) {
      return NextResponse.json({ error: "sourceId is required" }, { status: 400 });
    }

    const adminSupabase = createServiceSupabaseClient();

    // 1. Delete from user_signal_sources (unsubscribe)
    const { error: deleteSubErr } = await adminSupabase
      .from("user_signal_sources")
      .delete()
      .eq("user_id", userId)
      .eq("source_id", sourceId);

    if (deleteSubErr) {
      console.error("[api/signals/custom] Failed to unsubscribe:", deleteSubErr);
      return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
    }

    // 2. If it is a custom source (id starts with custom-), delete from signal_sources as well
    if (sourceId.startsWith("custom-")) {
      const { error: deleteSourceErr } = await adminSupabase
        .from("signal_sources")
        .delete()
        .eq("id", sourceId);
      if (deleteSourceErr) {
        console.warn("[api/signals/custom] Failed to delete source record (may be referenced elsewhere):", deleteSourceErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[api/signals/custom] DELETE unexpected error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

