import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type StudioConfig = {
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
    "You are a custom AI Finance Buddy being previewed in Smart Money's AI Studio.",
    `Tone: ${toneLabel}. Delivery: ${deliveryLabel}. Register: ${registerLabel}.`,
    config.signaturePhrase
      ? `Your signature phrase is: "${config.signaturePhrase}" — weave it in naturally when appropriate.`
      : "",
    config.willNotAdviseOn
      ? `You will NOT advise on: ${config.willNotAdviseOn}.`
      : "",
    "",
    "Keep responses concise (2–4 sentences). Use ₦ for Nigerian currency.",
    "This is a live preview — show off the persona's personality right away.",
  ]
    .filter(Boolean)
    .join("\n");

  let stream: AsyncIterable<Anthropic.MessageStreamEvent>;
  try {
    stream = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 256,
      system,
      messages,
      stream: true,
    });
  } catch (e) {
    console.error("[/api/chat/preview]", e);
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

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
}
