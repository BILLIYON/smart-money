import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

let _anthropic: Anthropic | null = null;
function getAnthropicClient() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

let _gemini: GoogleGenerativeAI | null = null;
function getGeminiClient() {
  if (!_gemini) _gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  return _gemini;
}

export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  try {
    const { sessionId, firstMessage } = (await req.json()) as {
      sessionId: string;
      firstMessage: string;
    };

    if (!sessionId || !firstMessage) {
      return NextResponse.json({ error: "sessionId and firstMessage required" }, { status: 400 });
    }

    const prompt = `Generate a concise 3 to 5 word topic title for a financial conversation starting with this user message:
"${firstMessage}"

Return ONLY the title string — no quotation marks, no ending period, no extra text:`;

    let generatedTitle = "";
    try {
      const anthropic = getAnthropicClient();
      const response = await anthropic.messages.create({
        model: "claude-3-5-haiku-latest",
        max_tokens: 30,
        messages: [{ role: "user", content: prompt }],
      });
      generatedTitle = response.content[0].type === "text" ? response.content[0].text : "";
    } catch {
      try {
        const geminiClient = getGeminiClient();
        const model = geminiClient.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        generatedTitle = (await result.response).text();
      } catch {
        generatedTitle = firstMessage.slice(0, 30) + "...";
      }
    }

    const cleanTitle = generatedTitle.replace(/["']/g, "").trim() || "Financial Conversation";

    await supabase
      .from("chat_sessions")
      .update({ session_name: cleanTitle })
      .eq("id", sessionId)
      .eq("user_id", userId);

    return NextResponse.json({ ok: true, title: cleanTitle });
  } catch (err: any) {
    console.error("[/api/chat/title] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to generate title" }, { status: 500 });
  }
}
