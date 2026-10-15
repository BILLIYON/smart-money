import { NextResponse } from "next/server";
import { scrapeWebpageToJson, parseRssFeed } from "@/lib/transcription";

export async function POST(req: Request) {
  try {
    const { url, type } = (await req.json()) as { url: string; type?: "rss" | "web" };

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    if (type === "rss" || url.includes(".xml") || url.includes("/rss") || url.includes("/feed")) {
      const items = await parseRssFeed(url);
      return NextResponse.json({ ok: true, source: "rss_feed", count: items.length, data: items });
    } else {
      const signal = await scrapeWebpageToJson(url);
      return NextResponse.json({ ok: true, source: "web_html_scraper", data: signal });
    }
  } catch (err: any) {
    console.error("[api/signals/scrape] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to scrape web source" }, { status: 500 });
  }
}
