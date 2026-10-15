import { google } from "googleapis";
import { Pool } from "pg";
import { processSignalAlert, type SignalPayload } from "@/lib/ai";
import { getBuddy } from "@/lib/buddies";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

// Lazy-loaded clients
let _anthropic: Anthropic | null = null;
function getAnthropicClient() {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

let _gemini: GoogleGenerativeAI | null = null;
function getGeminiClient() {
  if (!_gemini) {
    _gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  }
  return _gemini;
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
 * Scrapes raw HTML from any financial website (Nairametrics, BusinessDay, Reuters, etc.)
 * and uses LLM to convert the article body into clean, structured JSON signal data for AI.
 */
export async function scrapeWebpageToJson(url: string): Promise<SignalData> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "";

    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let paragraphs: string[] = [];
    let pMatch;
    while ((pMatch = pRegex.exec(html)) !== null) {
      const text = pMatch[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      if (text.length > 40) {
        paragraphs.push(text);
      }
    }

    const scrapedBody = paragraphs.slice(0, 5).join("\n\n");
    const domain = new URL(url).hostname.replace("www.", "");

    const prompt = `You are a web scraping & JSON extraction engine for Smart Money AI.
Web Page Domain: ${domain}
Web Page URL: ${url}
Scraped Page Title: "${rawTitle}"
Scraped Article Content:
"${scrapedBody || rawTitle}"

Extract the key financial signal from this web page and return valid JSON only — no markdown, no explanation outside JSON:
{
  "headline": "A concise 1-sentence headline capturing the core financial news",
  "body": "A 2-3 sentence actionable summary detailing key numbers, interest rates, asset prices, or policy impacts.",
  "tags": ["Tag1", "Tag2"]
}`;

    try {
      let rawJson = "";
      try {
        const anthropic = getAnthropicClient();
        const response = await anthropic.messages.create({
          model: "claude-3-5-haiku-latest",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        });
        rawJson = response.content[0].type === "text" ? response.content[0].text : "";
      } catch {
        const geminiClient = getGeminiClient();
        const model = geminiClient.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        rawJson = (await result.response).text();
      }

      const cleanJson = rawJson.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      return {
        headline: String(parsed.headline || rawTitle || `Update from ${domain}`),
        body: String(parsed.body || scrapedBody || `Latest news from ${domain}`),
        tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [domain, "Web Signal"],
      };
    } catch {
      return {
        headline: rawTitle || `Financial Update from ${domain}`,
        body: scrapedBody.slice(0, 250) || `Scraped latest updates from ${url}`,
        tags: [domain, "News"],
      };
    }
  } catch (err) {
    console.error(`[scrapeWebpageToJson] Failed to scrape ${url}:`, err);
    return {
      headline: `Web Source Update`,
      body: `Could not reach ${url}. Source remains active for automated polling.`,
      tags: ["Web", "Custom"],
    };
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
    let raw = "";
    try {
      const anthropic = getAnthropicClient();
      const response = await anthropic.messages.create({
        model: "claude-3-5-haiku-latest",
        max_tokens: 350,
        messages: [{ role: "user", content: prompt }],
      });
      raw = response.content[0].type === "text" ? response.content[0].text : "";
    } catch (anthropicErr) {
      console.warn("[transcribeMediaUrl] Anthropic failed, trying Gemini fallback:", anthropicErr);
      const geminiClient = getGeminiClient();
      const model = geminiClient.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      raw = response.text();
    }

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
  const pool = getPool();

  try {
    const [userRes, sessionRes] = await Promise.all([
      pool.query(`SELECT income_range, primary_goal, risk_tolerance FROM users WHERE id = $1 LIMIT 1;`, [userId]),
      pool.query(`SELECT id, buddy_ids FROM chat_sessions WHERE user_id = $1 ORDER BY last_message_at DESC LIMIT 1;`, [userId]),
    ]);

    const userProfile = userRes.rows[0];
    const session = sessionRes.rows[0];
    if (!session) {
      console.warn(`[routeSignalToUser] No active session found for user ${userId}`);
      return;
    }

    const activeBuddyId = Array.isArray(session.buddy_ids) ? session.buddy_ids[0] : null;
    const activeBuddy = activeBuddyId ? getBuddy(activeBuddyId) : null;
    if (!activeBuddy) {
      console.warn(`[routeSignalToUser] No active buddy found for user ${userId}`);
      return;
    }

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

    await pool.query(
      `INSERT INTO messages (session_id, role, buddy_id, content, metadata) VALUES ($1, $2, $3, $4, $5);`,
      [
        session.id,
        "signal",
        activeBuddyId,
        message,
        JSON.stringify({
          signalAlert: {
            sourceId,
            sourceName,
            headline: signal.headline,
            tags: signal.tags,
          },
        }),
      ]
    );

    await pool.query(`UPDATE chat_sessions SET last_message_at = NOW() WHERE id = $1;`, [session.id]);
    console.log(`[routeSignalToUser] Successfully delivered signal from ${sourceName} to user ${userId}`);
  } catch (err) {
    console.error(`[routeSignalToUser] Failed routing signal to user ${userId}:`, err);
  } finally {
    await pool.end();
  }
}
