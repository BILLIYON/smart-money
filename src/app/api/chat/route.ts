import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { sendMessage, type Message, type DatabankContext } from "@/lib/ai";

export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { buddyId, messages, databankContext, sessionId } = await req.json() as {
    buddyId: string;
    messages: Message[];
    databankContext: DatabankContext;
    sessionId?: string;
  };

  if (!buddyId || !messages?.length) {
    return NextResponse.json({ error: "buddyId and messages required" }, { status: 400 });
  }

  // Persist the user's last message before streaming
  const userMessage = messages[messages.length - 1];
  if (sessionId && userMessage?.role === "user") {
    await supabase.from("messages").insert({
      session_id: sessionId,
      role: "user",
      content: userMessage.content,
    });
  }

  // Stream from AI
  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await sendMessage({ buddyId, messages, databankContext });
  } catch (e) {
    console.error("[/api/chat] sendMessage failed:", e);
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  // Tee the stream: one side goes to the client, the other accumulates for DB save
  const [clientStream, dbStream] = stream.tee();

  // Fire-and-forget: collect the full AI response and persist it
  if (sessionId) {
    (async () => {
      try {
        const chunks: Uint8Array[] = [];
        const reader = dbStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        const fullText = new TextDecoder().decode(
          chunks.reduce((a, b) => {
            const merged = new Uint8Array(a.length + b.length);
            merged.set(a, 0);
            merged.set(b, a.length);
            return merged;
          }, new Uint8Array())
        );
        await supabase.from("messages").insert({
          session_id: sessionId,
          role: "assistant",
          buddy_id: buddyId,
          content: fullText,
        });
      } catch (e) {
        console.error("[/api/chat] DB persist failed:", e);
      }
    })();
  }

  return new Response(clientStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
