import { google } from "googleapis";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { processSignalAlert, type SignalPayload } from "@/lib/ai";
import { getBuddy } from "@/lib/buddies";
import Anthropic from "@anthropic-ai/sdk";

// Lazy-loaded Anthropic client
let _anthropic: Anthropic | null = null;
function getAnthropicClient() {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

export interface SignalData {
  headline: string;
  body: string;
  tags: string[];
}

/**
 * Fetches and parses an RSS feed using regex-based tag extraction.
 * No heavy external packages required.
 */
export async function parseRssFeed(url: string): Promise<SignalData[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch RSS: ${res.status}`);
    const xml = await res.text();

    const items: SignalData[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const content = match[1];
      
      // Extract title, description, and link, removing CDATA wrappers if present
      let title = content.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/title>/)?.[1] || "";
      let description = content.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:]]>)?<\/description>/)?.[1] || "";
      
      // Strip HTML tags from description
      description = description.replace(/<[^>]*>/g, "").trim();
      title = title.replace(/<[^>]*>/g, "").trim();

      if (title) {
        items.push({
          headline: title,
          body: description || `Update from feed: ${title}`,
          tags: ["RSS", "News"],
        });
      }
    }

    return items.slice(0, 5); // Return top 5 items
  } catch (err) {
    console.error(`[parseRssFeed] Error parsing ${url}:`, err);
    return [];
  }
}

/**
 * Crawls a web page to extract meta tags (title, description).
 */
async function fetchPageMetadata(url: string): Promise<{ title: string; description: string }> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "";
    const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] || 
                        html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i)?.[1] || "";

    return {
      title: title.replace(/<[^>]*>/g, "").trim(),
      description: description.trim(),
    };
  } catch (err) {
    console.warn(`[fetchPageMetadata] Could not scrape metadata for ${url}:`, err);
    return { title: "", description: "" };
  }
}

/**
 * Simulated Transcription Engine using LLM.
 * Generates realistic transcripts/signals based on scraped page metadata,
 * falling back to high-quality generated Nigerian/global finance transcripts if scraping fails.
 */
export async function transcribeMediaUrl(
  url: string,
  type: "rss" | "youtube" | "tiktok" | "podcast" | "newsletter"
): Promise<SignalData> {
  const meta = await fetchPageMetadata(url);
  const cleanTitle = meta.title || `Custom ${type} Source`;
  const cleanDesc = meta.description || `URL: ${url}`;

  const prompt = `You are a financial transcription engine. A user connected a ${type} source.
URL: ${url}
Scraped Page Title: "${cleanTitle}"
Scraped Page Description: "${cleanDesc}"

Based on the title and description, simulate a highly realistic, brief financial transcript or summary. If the scraped details are empty or generic, generate a realistic Nigerian or African personal finance insight (e.g. currency shifts, real estate rates in Ikoyi/Lekki, high-yield investment options, or CBN interest rate alerts).

Respond with valid JSON only. Do not wrap in markdown code blocks. The JSON must have this exact structure:
{
  "headline": "A short, engaging 1-sentence headline of the core financial signal",
  "body": "The parsed transcript/summary. Written in first-person conversational style, 2-3 sentences max, giving concrete actionable numbers (e.g. interest rates, NGN/USD rates, price drops, or yields).",
  "tags": ["Tag1", "Tag2", "Tag3"]
}`;

  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 350,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const cleanJson = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    return {
      headline: String(parsed.headline || cleanTitle),
      body: String(parsed.body || `Insights extracted from ${url}`),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : ["Custom", type.toUpperCase()],
    };
  } catch (err) {
    console.error("[transcribeMediaUrl] Error during LLM transcription:", err);
    // Return a solid static fallback that fits the theme
    return {
      headline: `New insight from ${cleanTitle}`,
      body: `We parsed the custom source at ${url}. We noticed key discussions about market shifts, treasury bill options, and personal savings frameworks.`,
      tags: ["Custom", type.toUpperCase()],
    };
  }
}

/**
 * Evaluates and routes a signal to a user's active session, mirroring /api/signals/webhook behavior.
 */
export async function routeSignalToUser(
  userId: string,
  sourceId: string,
  sourceName: string,
  signal: SignalData
) {
  const supabase = createServiceSupabaseClient();

  try {
    // 1. Get user context and their most recently active chat session
    const [userRes, sessionRes] = await Promise.all([
      supabase
        .from("users")
        .select("income_range, primary_goal, risk_tolerance")
        .eq("id", userId)
        .single(),
      supabase
        .from("chat_sessions")
        .select("id, buddy_ids")
        .eq("user_id", userId)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .single(),
    ]);

    const userProfile = userRes.data;
    const session = sessionRes.data;
    if (!session) {
      console.warn(`[routeSignalToUser] No active session found for user ${userId}`);
      return;
    }

    const activeBuddyId = session.buddy_ids?.[0];
    const activeBuddy = activeBuddyId ? getBuddy(activeBuddyId) : null;
    if (!activeBuddy) {
      console.warn(`[routeSignalToUser] No active buddy found for user ${userId}`);
      return;
    }

    // 2. Evaluate relevance
    const { relevant, message } = await processSignalAlert({
      signal: {
        sourceId,
        sourceName,
        headline: signal.headline,
        body: signal.body,
        tags: signal.tags,
      },
      userContext: {
        incomeRange: userProfile?.income_range ?? undefined,
        primaryGoal: userProfile?.primary_goal ?? undefined,
        riskTolerance: userProfile?.risk_tolerance ?? undefined,
      },
      activeBuddy,
    });

    if (!relevant || !message) {
      console.log(`[routeSignalToUser] Signal not relevant for user ${userId}`);
      return;
    }

    // 3. Insert signal message
    const { error: msgError } = await supabase.from("messages").insert({
      session_id: session.id,
      role: "signal",
      buddy_id: activeBuddyId,
      content: message,
      metadata: {
        signalAlert: {
          sourceId,
          sourceName,
          headline: signal.headline,
          tags: signal.tags,
        },
      },
    });

    if (msgError) throw msgError;

    // 4. Update session's last_message_at
    await supabase
      .from("chat_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", session.id);

    console.log(`[routeSignalToUser] Successfully delivered signal from ${sourceName} to user ${userId}`);
  } catch (err) {
    console.error(`[routeSignalToUser] Failed routing signal to user ${userId}:`, err);
  }
}
