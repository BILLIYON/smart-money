import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

let _nvidia: OpenAI | null = null;
function getNvidia() {
  if (!_nvidia) {
    _nvidia = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY || process.env.NVIDIA_BUILD_API_KEY || process.env.NIM_API_KEY,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });
  }
  return _nvidia;
}

let _gemini: GoogleGenerativeAI | null = null;
function getGemini() {
  if (!_gemini) _gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  return _gemini;
}

type StudioConfig = {
  buddyName?: string;
  tag?: string;
  philosophy?: string;
  tone: number;        // 0–100
  delivery: number;   // 0–100
  register: number;   // 0–100
  signaturePhrase: string;
  willNotAdviseOn: string;
  model: string;
  triggers: string[];
};

export async function POST(req: Request) {
  const { messages, config } = await req.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
    config: StudioConfig;
  };

  const buddyName = config.buddyName?.trim() || "AI Finance Buddy";

  const toneLabel =
    config.tone > 66
      ? "aggressive and high-conviction"
      : config.tone > 33
      ? "balanced"
      : "conservative and cautious";
  const deliveryLabel =
    config.delivery > 66
      ? "blunt and direct — no softening"
      : config.delivery > 33
      ? "clear but empathetic"
      : "gentle and encouraging";
  const registerLabel =
    config.register > 66
      ? "casual and conversational"
      : config.register > 33
      ? "professional but accessible"
      : "formal and structured";

  const system = [
    `You are ${buddyName}, a custom AI Finance Buddy currently being built in Smart Money's AI Studio.`,
    config.tag ? `Tagline: ${config.tag}` : "",
    config.philosophy ? `Philosophy:\n${config.philosophy}` : "",
    `Tone: ${toneLabel}. Delivery: ${deliveryLabel}. Register: ${registerLabel}.`,
    config.signaturePhrase
      ? `Your signature phrase is: "${config.signaturePhrase}" — weave it in naturally when appropriate.`
      : "",
    config.willNotAdviseOn
      ? `You will NOT advise on: ${config.willNotAdviseOn}.`
      : "",
    "",
    "Keep responses concise (2–4 sentences). Use ₦ for Nigerian currency.",
    "This is a live preview — demonstrate your distinct voice and financial mindset right away.",
  ]
    .filter(Boolean)
    .join("\n");

  const selectedModel = (config.model || "").toLowerCase();
  const hasNvidiaKey = Boolean(process.env.NVIDIA_API_KEY || process.env.NVIDIA_BUILD_API_KEY || process.env.NIM_API_KEY);

  // If NVIDIA / Gemma selected and key available, stream directly from NVIDIA NIM
  if ((selectedModel.includes("nvidia") || selectedModel.includes("gemma")) && hasNvidiaKey) {
    const modelName = selectedModel.includes("gemma") ? "google/gemma-4-31b-it" : "meta/llama-3.3-70b-instruct";
    try {
      const response = await getNvidia().chat.completions.create({
        model: modelName,
        messages: [{ role: "system", content: system }, ...messages],
        temperature: 0.6,
        max_tokens: 256,
        stream: true,
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

      return new Response(readable, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    } catch (nErr) {
      console.warn("[/api/chat/preview] NVIDIA stream failed, falling back:", nErr);
    }
  }

  try {
    const stream = await getAnthropic().messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 256,
      system,
      messages,
      stream: true,
    });

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(new TextEncoder().encode(chunk.delta.text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    console.warn("[/api/chat/preview] Anthropic failed, trying NVIDIA/Gemini fallbacks:", e);

    if (hasNvidiaKey) {
      try {
        const response = await getNvidia().chat.completions.create({
          model: "google/gemma-4-31b-it",
          messages: [{ role: "system", content: system }, ...messages],
          temperature: 0.6,
          max_tokens: 256,
          stream: true,
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

        return new Response(readable, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      } catch (nvidiaErr) {
        console.warn("[/api/chat/preview] NVIDIA fallback failed:", nvidiaErr);
      }
    }
    
    try {
      const model = getGemini().getGenerativeModel({
        model: "gemini-2.0-flash",
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

      return new Response(readable, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    } catch (geminiErr) {
      console.error("[/api/chat/preview] Gemini fallback failed:", geminiErr);
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }
  }
}
