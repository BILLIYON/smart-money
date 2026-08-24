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
  const key = process.env.NVIDIA_API_KEY || process.env.NVIDIA_BUILD_API_KEY || process.env.NIM_API_KEY;
  if (!_nvidia && key) {
    _nvidia = new OpenAI({
      apiKey: key,
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

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai && process.env.OPENAI_API_KEY) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
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
  knowledgeSummary?: string;
};

// ── Stream Handlers per Provider ──────────────────────────

async function tryStreamBedrock(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  selectedModel: string
): Promise<ReadableStream<Uint8Array> | null> {
  try {
    let modelId: string = BEDROCK_MODELS["claude-3-5-sonnet"];
    if (selectedModel.includes("haiku")) modelId = BEDROCK_MODELS["claude-3-5-haiku"];
    else if (selectedModel.includes("llama")) modelId = BEDROCK_MODELS["llama-3-3-70b"];
    else if (selectedModel.includes("nova")) modelId = BEDROCK_MODELS["nova-pro"];

    const chunks: string[] = [];
    await streamBedrockCompletion({ systemPrompt: system, messages, modelId, maxTokens: 400 }, (delta) => {
      if (delta) chunks.push(delta);
    });

    if (chunks.length === 0) {
      console.warn("[preview] Bedrock produced 0 text chunks, triggering fallback stream.");
      return null;
    }

    return new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      },
    });
  } catch (err) {
    console.warn("[preview] Bedrock execution notice (passing to fallback AI provider):", err);
    return null;
  }
}

async function tryStreamNvidia(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  selectedModel: string
): Promise<ReadableStream<Uint8Array> | null> {
  const client = getNvidia();
  if (!client) return null;

  try {
    const modelName = selectedModel.includes("gemma") ? "google/gemma-4-31b-it" : "meta/llama-3.3-70b-instruct";
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.6,
      max_tokens: 400,
      stream: true,
    });

    let emitted = false;
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) {
              emitted = true;
              controller.enqueue(new TextEncoder().encode(text));
            }
          }
        } catch (err) {
          console.warn("[preview] NVIDIA stream chunk notice:", err);
        } finally {
          if (!emitted) {
            console.warn("[preview] NVIDIA stream emitted 0 chunks.");
          }
          controller.close();
        }
      },
    });
  } catch (err) {
    console.warn("[preview] NVIDIA stream init notice:", err);
    return null;
  }
}

async function tryStreamGemini(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<ReadableStream<Uint8Array> | null> {
  const client = getGemini();
  if (!client) return null;

  try {
    const model = client.getGenerativeModel({
      model: "gemini-3.6-flash",
      systemInstruction: system,
    });

    const validMessages = messages.filter((m) => m.content && m.content.trim().length > 0);

    const geminiMessages = validMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const result = await model.generateContentStream({ contents: geminiMessages });

    let emitted = false;
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              emitted = true;
              controller.enqueue(new TextEncoder().encode(text));
            }
          }
        } catch (err) {
          console.warn("[preview] Gemini stream chunk notice:", err);
        } finally {
          if (!emitted) {
            console.warn("[preview] Gemini stream emitted 0 chunks.");
          }
          controller.close();
        }
      },
    });
  } catch (err) {
    console.warn("[preview] Gemini stream init notice:", err);
    return null;
  }
}

async function tryStreamGroq(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<ReadableStream<Uint8Array> | null> {
  const client = getGroq();
  if (!client) return null;

  try {
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: system }, ...messages],
      stream: true,
      max_tokens: 400,
    });

    return new ReadableStream<Uint8Array>({
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
  } catch (err) {
    console.warn("[preview] Groq stream notice:", err);
    return null;
  }
}

async function tryStreamAnthropic(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<ReadableStream<Uint8Array> | null> {
  const client = getAnthropic();
  if (!client) return null;

  try {
    const stream = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 400,
      system,
      messages,
      stream: true,
    });

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
              controller.enqueue(new TextEncoder().encode(chunk.delta.text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });
  } catch (err) {
    console.warn("[preview] Anthropic stream notice:", err);
    return null;
  }
}

async function tryStreamOpenAI(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<ReadableStream<Uint8Array> | null> {
  const client = getOpenAI();
  if (!client) return null;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: system }, ...messages],
      stream: true,
      max_tokens: 400,
    });

    return new ReadableStream<Uint8Array>({
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
  } catch (err) {
    console.warn("[preview] OpenAI stream notice:", err);
    return null;
  }
}

// ── Main Preview Handler ────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { messages, config } = (await req.json()) as {
      messages: { role: "user" | "assistant"; content: string }[];
      config: StudioConfig;
    };

    // Sanitize messages to ensure first message starts with role: "user"
    let sanitizedMessages = (messages || []).filter((m) => m.content && m.content.trim().length > 0);
    const firstUserIdx = sanitizedMessages.findIndex((m) => m.role === "user");
    if (firstUserIdx > 0) {
      sanitizedMessages = sanitizedMessages.slice(firstUserIdx);
    } else if (firstUserIdx === -1) {
      sanitizedMessages = [{ role: "user", content: "Hello! Analyze my finances." }];
    }

    const buddyName = config.buddyName?.trim() || "AI Finance Buddy";
    const tone = config.tone ?? 50;
    const delivery = config.delivery ?? 50;
    const register = config.register ?? 50;

    const toneLabel = tone > 66 ? "aggressive, high-conviction, and bold" : tone > 33 ? "balanced, pragmatic, and objective" : "conservative, cautious, and risk-averse";
    const deliveryLabel = delivery > 66 ? "blunt, direct, and unfiltered" : delivery > 33 ? "clear, empathetic, and constructive" : "gentle, soft, and highly encouraging";
    const registerLabel = register > 66 ? "casual, colloquial, and conversational" : register > 33 ? "professional, polished, yet accessible" : "formal, academic, and structured";

    const system = [
      `You are ${buddyName}, a custom AI Finance Buddy being created in Smart Money's AI Studio.`,
      config.tag ? `Tagline: ${config.tag}` : "",
      config.desc ? `Summary: ${config.desc}` : "",
      config.philosophy ? `Financial Philosophy:\n${config.philosophy}` : "",
      `Voice & Personality Instructions:`,
      `- Tone: ${toneLabel} (${tone}/100)`,
      `- Delivery Style: ${deliveryLabel} (${delivery}/100)`,
      `- Register: ${registerLabel} (${register}/100)`,
      config.signaturePhrase ? `- Signature Catchphrase: "${config.signaturePhrase}" (incorporate naturally when appropriate)` : "",
      config.willNotAdviseOn ? `- Strict Boundary (Will NOT advise on): ${config.willNotAdviseOn}` : "",
      config.knowledgeSummary ? `- Ingested Knowledge Base Context: ${config.knowledgeSummary}` : "",
      "",
      "Respond strictly as this persona in 2–4 concise sentences. Use ₦ for Naira currency amounts.",
      "Demonstrate your financial mindset and distinct personality clearly right away.",
    ]
      .filter(Boolean)
      .join("\n");

    const selectedModel = (config.model || "").toLowerCase();

    // Prioritize active working model providers (Gemini 3.6 Flash & NVIDIA Gemma) followed by requested model
    const providersToTry: Array<"gemini" | "nvidia" | "bedrock" | "groq" | "anthropic" | "openai"> = [];

    // Always start with requested model if specified
    if (selectedModel.includes("bedrock") || selectedModel.includes("aws")) {
      providersToTry.push("bedrock");
    } else if (selectedModel.includes("gemma") || selectedModel.includes("nvidia")) {
      providersToTry.push("nvidia");
    } else if (selectedModel.includes("groq") || selectedModel.includes("llama")) {
      providersToTry.push("groq");
    } else if (selectedModel.includes("gpt")) {
      providersToTry.push("openai");
    } else if (selectedModel.includes("claude")) {
      providersToTry.push("anthropic");
    } else if (selectedModel.includes("gemini")) {
      providersToTry.push("gemini");
    }

    // Add fallback providers in order of verified execution
    const fallbacks: Array<"gemini" | "nvidia" | "groq" | "bedrock" | "anthropic" | "openai"> = [
      "gemini",
      "nvidia",
      "groq",
      "bedrock",
      "anthropic",
      "openai",
    ];

    for (const fb of fallbacks) {
      if (!providersToTry.includes(fb)) {
        providersToTry.push(fb);
      }
    }

    // Execute providers in order
    for (const provider of providersToTry) {
      let stream: ReadableStream<Uint8Array> | null = null;

      if (provider === "bedrock") {
        stream = await tryStreamBedrock(system, sanitizedMessages, selectedModel);
      } else if (provider === "nvidia") {
        stream = await tryStreamNvidia(system, sanitizedMessages, selectedModel);
      } else if (provider === "gemini") {
        stream = await tryStreamGemini(system, sanitizedMessages);
      } else if (provider === "groq") {
        stream = await tryStreamGroq(system, sanitizedMessages);
      } else if (provider === "anthropic") {
        stream = await tryStreamAnthropic(system, sanitizedMessages);
      } else if (provider === "openai") {
        stream = await tryStreamOpenAI(system, sanitizedMessages);
      }

      if (stream) {
        return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    }

    // Static fallback response if all AI endpoints fail
    const fallbackText = `👋 Hello! I am ${buddyName}. ${config.tag ? `(${config.tag}) ` : ""}I'm configured with your ${toneLabel} tone and ${deliveryLabel} delivery. ${config.signaturePhrase ? `Remember: "${config.signaturePhrase}"! ` : ""}Send any financial question to test how I analyze your Naira cashflow!`;
    return new Response(fallbackText, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (err: any) {
    console.error("[/api/chat/preview] Critical exception:", err);
    return NextResponse.json({ error: err?.message || "Failed to generate preview" }, { status: 500 });
  }
}
