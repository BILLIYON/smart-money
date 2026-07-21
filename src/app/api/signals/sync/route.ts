import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { parseRssFeed, routeSignalToUser } from "@/lib/transcription";

/**
 * GET /api/signals/sync
 * Called by Vercel Cron every hour.
 * Fetches RSS feeds for all active signal sources that have at least one subscriber,
 * and delivers the latest item to each subscriber via routeSignalToUser.
 *
 * Protected by CRON_SECRET header.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceSupabaseClient();

  // 1. Find all signal sources that have at least one enabled subscriber and have an RSS api_endpoint
  const { data: activeSources, error: srcError } = await supabase
    .from("signal_sources")
    .select(`
      id,
      name,
      api_endpoint,
      signal_schema,
      user_signal_sources!inner(user_id)
    `)
    .eq("status", "active")
    .eq("user_signal_sources.enabled", true)
    .not("api_endpoint", "is", null);

  if (srcError) {
    console.error("[/api/signals/sync] Failed to fetch active sources:", srcError);
    return NextResponse.json({ error: srcError.message }, { status: 500 });
  }

  if (!activeSources?.length) {
    return NextResponse.json({ ok: true, message: "No active subscriptions", processed: 0 });
  }

  let totalDelivered = 0;
  const results: { source: string; delivered: number; error?: string }[] = [];

  for (const source of activeSources) {
    const { id: sourceId, name: sourceName, api_endpoint, signal_schema } = source;
    const subscribers: { user_id: string }[] = (source as any).user_signal_sources ?? [];
    const schemaType = (signal_schema as any)?.type ?? "rss";

    // Only handle RSS for now (podcasts/newsletters also use RSS under the hood)
    if (!api_endpoint) continue;

    try {
      const feedItems = await parseRssFeed(api_endpoint);
      if (!feedItems.length) {
        results.push({ source: sourceName, delivered: 0, error: "Empty feed" });
        continue;
      }

      // Take only the latest item to avoid flooding users
      const latestItem = feedItems[0];

      // Add source type tags
      const tagsWithType = [...(latestItem.tags ?? []), schemaType.toUpperCase()];

      let sourceDelivered = 0;
      for (const { user_id } of subscribers) {
        try {
          await routeSignalToUser(user_id, sourceId, sourceName, {
            ...latestItem,
            tags: tagsWithType,
          });
          sourceDelivered++;
        } catch (e) {
          console.error(`[/api/signals/sync] Failed to route signal to user ${user_id}:`, e);
        }
      }

      totalDelivered += sourceDelivered;
      results.push({ source: sourceName, delivered: sourceDelivered });
    } catch (err: any) {
      console.error(`[/api/signals/sync] Error processing source ${sourceId}:`, err);
      results.push({ source: sourceName, delivered: 0, error: err.message });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: activeSources.length,
    totalDelivered,
    results,
  });
}
