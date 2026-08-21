import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Groq from "groq-sdk";
import Anthropic from "@anthropic-ai/sdk";
import { streamBedrockCompletion, BEDROCK_MODELS } from "@/lib/bedrock";

let _gemini: GoogleGenerativeAI | null = null;
function getGemini() {
  if (!_gemini && process.env.GOOGLE_AI_API_KEY) {
    _gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  }
  return _gemini;
}

let _groq: Groq | null = null;
function getGroq() {
  if (!_groq && process.env.GROQ_API_KEY) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return _groq;
}

let _nvidia: OpenAI | null = null;
function getNvidia() {
  if (!_nvidia && (process.env.NVIDIA_API_KEY || process.env.NVIDIA_BUILD_API_KEY || process.env.NIM_API_KEY)) {
    _nvidia = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY || process.env.NVIDIA_BUILD_API_KEY || process.env.NIM_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });
  }
  return _nvidia;
}

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic && process.env.ANTHROPIC_API_KEY) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

type StudioConfig = {
  buddyName?: string;
  tag?: string;
  desc?: string;
  philosophy?: string;
  tone?: number;        // 0–100
  delivery?: number;   // 0–100
  register?: number;   // 0–100
  signaturePhrase?: string;
  willNotAdviseOn?: string;
  model?: string;
};

export async function POST(req: Request) {
  try {
    const { messages, config } = (await req.json()) as {
      messages: { role: "user" | "assistant"; content: string }[];
      config: StudioConfig;
    };

    const buddyName = config.buddyName?.trim() || "AI Finance Buddy";
    const tone = config.tone ?? 50;
    const delivery = config.delivery ?? 50;
    const register = config.register ?? 50;

    const toneLabel = tone > 66 ? "aggressive and high-conviction" : tone > 33 ? "balanced" : "conservative and cautious";
    const deliveryLabel = delivery > 66 ? "blunt and direct" : delivery > 33 ? "clear but empathetic" : "gentle and encouraging";
    const registerLabel = register > 66 ? "casual and conversational" : register > 33 ? "professional but accessible" : "formal and structured";

    const system = [
      `You are ${buddyName}, a custom AI Finance Buddy being created in Smart Money's AI Studio.`,
      config.tag ? `Tagline: ${config.tag}` : "",
      config.desc ? `Summary: ${config.desc}` : "",
      config.philosophy ? `Financial Philosophy:\n${config.philosophy}` : "",
      `Voice & Personality: Tone: ${toneLabel}. Delivery: ${deliveryLabel}. Register: ${registerLabel}.`,
      config.signaturePhrase ? `Signature phrase: "${config.signaturePhrase}"` : "",
      config.willNotAdviseOn ? `Will NOT advise on: ${config.willNotAdviseOn}` : "",
      "",
      "Respond strictly as this persona in 2–4 concise sentences. Use ₦ for Naira currency amounts.",
      "Demonstrate your financial mindset clearly right away.",
    ]
      .filter(Boolean)
      .join("\n");

    const selectedModel = (config.model || "").toLowerCase();

    // 1. AWS Bedrock streaming attempt (if selected)
    if (selectedModel.includes("bedrock") || selectedModel.includes("aws")) {
      try {
        let modelId: string = BEDROCK_MODELS["claude-3-5-sonnet"];
        if (selectedModel.includes("haiku")) modelId = BEDROCK_MODELS["claude-3-5-haiku"];
        else if (selectedModel.includes("llama")) modelId = BEDROCK_MODELS["llama-3-3-70b"];
        else if (selectedModel.includes("nova")) modelId = BEDROCK_MODELS["nova-pro"];

        let firstChunkReceived = false;
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              await streamBedrockCompletion({ systemPrompt: system, messages, modelId, maxTokens: 300 }, (delta) => {
                if (delta) {
                  firstChunkReceived = true;
                  controller.enqueue(new TextEncoder().encode(delta));
                }
              });
            } catch (err) {
              console.warn("[/api/chat/preview] Bedrock inner stream error:", err);
            } finally {
              controller.close();
            }
          },
        });

        // Test if bedrock started cleanly
        return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      } catch (bErr) {
        console.warn("[/api/chat/preview] Bedrock failed, trying Gemini 3.6 Flash fallback:", bErr);
      }
    }

    // 2. Google Gemini 3.6 Flash (Fast, reliable, 100% active API key)
    const gemini = getGemini();
    if (gemini) {
      try {
        const model = gemini.getGenerativeModel({
          model: "gemini-3.6-flash",
          systemInstruction: system,
        });

        const geminiMessages = messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

        const result = await model.generateContentStream({ contents: geminiMessages });

        const readable = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) controller.enqueue(new TextEncoder().encode(text));
              }
            } finally {
              controller.close();
            }
          },
        });

        return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      } catch (gemErr) {
        console.warn("[/api/chat/preview] Gemini 3.6 Flash failed:", gemErr);
      }
    }

    // 3. Groq (if key active)
    const groq = getGroq();
    if (groq) {
      try {
        const response = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: system }, ...messages],
          stream: true,
          max_tokens: 300,
        });

        const readable = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              for await (const chunk of response) {
                const text = chunk.choices[0]?.delta?.content ?? "";
                if (text) controller.enqueue(new TextEncoder().encode(text));
              }
            } finally {
              controller.close();
            }
          },
        });

        return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      } catch (gErr) {
        console.warn("[/api/chat/preview] Groq failed:", gErr);
      }
    }

    // 4. Fallback static persona response if all AI stream endpoints fail
    const fallbackText = `👋 Hello! I am ${buddyName}. ${config.tag ? `(${config.tag}) ` : ""}I'm configured with your ${toneLabel} tone and ${deliveryLabel} delivery. Send any financial question to test how I analyze your Naira cashflow!`;
    return new Response(fallbackText, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (err: any) {
    console.error("[/api/chat/preview] Critical exception:", err);
    return NextResponse.json({ error: err?.message || "Failed to generate preview" }, { status: 500 });
  }
}
