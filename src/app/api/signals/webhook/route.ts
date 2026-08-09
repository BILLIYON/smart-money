import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { processSignalAlert, type SignalPayload } from "@/lib/ai";
import { getBuddy, type Buddy, type BuddyCategory } from "@/lib/buddies";
import { getCommunityBuddyById } from "@/lib/db";

/**
 * External signal providers POST to this endpoint.
 * We validate the sourceId, route to affected users, and insert signal messages
 * into their active sessions so Supabase Realtime pushes them to the client.
 *
 * Expected body:
 * {
 *   sourceId: string,
 *   webhookSecret: string,  // must match SIGNAL_WEBHOOK_SECRET env var
 *   signal: { type, headline, body, tags? }
 * }
 */
export async function POST(req: Request) {
  const body = await req.json() as {
    sourceId: string;
    webhookSecret?: string;
    signal: { type: string; headline: string; body: string; tags?: string[] };
  };

  // Basic shared-secret validation to prevent spoofed signals
  const expectedSecret = process.env.SIGNAL_WEBHOOK_SECRET;
  if (expectedSecret && body.webhookSecret !== expectedSecret) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  const { sourceId, signal } = body;
  if (!sourceId || !signal?.headline) {
    return NextResponse.json({ error: "sourceId and signal.headline required" }, { status: 400 });
  }

  // Use service-role client — this runs outside user session context
  const supabase = createServiceSupabaseClient();

  // Validate the signal source exists
  const { data: source, error: srcError } = await supabase
    .from("signal_sources")
    .select("id, name, status")
    .eq("id", sourceId)
    .single();

  if (srcError || !source || source.status !== "active") {
    return NextResponse.json({ error: "Signal source not found or inactive" }, { status: 404 });
  }

  // Find all users who have this source enabled
  const { data: subscribers } = await supabase
    .from("user_signal_sources")
    .select("user_id")
    .eq("source_id", sourceId)
    .eq("enabled", true);

  if (!subscribers?.length) {
    return NextResponse.json({ ok: true, delivered: 0 });
  }

  const signalPayload: SignalPayload = {
    sourceId,
    sourceName: source.name,
    headline: signal.headline,
    body: signal.body,
    tags: signal.tags,
  };

  let delivered = 0;

  // Process each subscriber in parallel (cap concurrency at 10)
  const chunks = [];
  for (let i = 0; i < subscribers.length; i += 10) {
    chunks.push(subscribers.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async ({ user_id }: { user_id: string }) => {
        try {
          // Get user context and their most recently active buddy
          const [userRes, sessionRes] = await Promise.all([
            supabase
              .from("users")
              .select("income_range, primary_goal, risk_tolerance")
              .eq("id", user_id)
              .single(),
            supabase
              .from("chat_sessions")
              .select("id, buddy_ids")
              .eq("user_id", user_id)
              .order("last_message_at", { ascending: false, nullsFirst: false })
              .limit(1)
              .single(),
          ]);

          const userProfile = userRes.data;
          const session = sessionRes.data;
          if (!session) return;

          const activeBuddyId = session.buddy_ids?.[0];
          let activeBuddy: Buddy | null = null;
          if (activeBuddyId) {
            const dbRow = await getCommunityBuddyById(activeBuddyId);
            if (dbRow) {
              const rawModel = (dbRow.model ?? "").toLowerCase();
              const model: Buddy["model"] =
                rawModel.includes("groq") || rawModel.includes("llama") ? "Groq" :
                rawModel.includes("gpt") ? "GPT-4" :
                rawModel.includes("gemini") ? "Gemini" :
                "Claude";
              activeBuddy = {
                id: dbRow.id,
                name: dbRow.name,
                tag: dbRow.tag ?? "",
                desc: dbRow.description ?? "",
                price: dbRow.price_note ?? (dbRow.price === "free" ? "Free" : `₦${Number(dbRow.custom_price ?? 0).toLocaleString()}/mo`),
                priceNote: dbRow.price_note ?? "",
                badge: dbRow.price === "free" ? "Free" : `₦${Number(dbRow.custom_price ?? 0).toLocaleString()}/mo`,
                badgeType: dbRow.price === "free" ? "free" : "pro",
                bannerColor: dbRow.banner_color ?? "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
                avatarBg: dbRow.avatar_bg ?? "#1A3A6E",
                avatarContent: dbRow.avatar_content ?? "🎯",
                avatarIsSerif: dbRow.avatar_is_serif ?? false,
                model,
                modelColor: "#7B68EE",
                rating: "New",
                reviewCount: "0",
                isFanSim: dbRow.is_fan_sim ?? false,
                disclaimer: dbRow.disclaimer ?? undefined,
                categories: (dbRow.categories ?? []) as BuddyCategory[],
                philosophy: dbRow.philosophy ?? "",
                samples: [],
                reviews: [],
                includes: [],
              };
            } else {
              activeBuddy = getBuddy(activeBuddyId) ?? null;
            }
          }
          if (!activeBuddy) return;

          const { relevant, message } = await processSignalAlert({
            signal: signalPayload,
            userContext: {
              incomeRange: userProfile?.income_range ?? undefined,
              primaryGoal: userProfile?.primary_goal ?? undefined,
              riskTolerance: userProfile?.risk_tolerance ?? undefined,
            },
            activeBuddy,
          });

          if (!relevant || !message) return;

          // Insert signal message into the user's active session
          // Supabase Realtime will broadcast this to the subscribed client
          await supabase.from("messages").insert({
            session_id: session.id,
            role: "signal",
            buddy_id: activeBuddyId,
            content: message,
            metadata: {
              signalAlert: {
                sourceId,
                sourceName: source.name,
                headline: signal.headline,
                tags: signal.tags,
              },
            },
          });

          // Update session's last_message_at so it surfaces at top of list
          await supabase
            .from("chat_sessions")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", session.id);

          delivered++;
        } catch (e) {
          console.error(`[/api/signals/webhook] user ${user_id}:`, e);
        }
      })
    );
  }

  return NextResponse.json({ ok: true, delivered });
}
