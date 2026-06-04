import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { sendGroupMessage, type Message, type DatabankContext } from "@/lib/ai";

export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { buddyIds, messages, databankContext, sessionId } = await req.json() as {
    buddyIds: string[];
    messages: Message[];
    databankContext: DatabankContext;
    sessionId?: string;
  };

  if (!buddyIds?.length || !messages?.length) {
    return NextResponse.json({ error: "buddyIds and messages required" }, { status: 400 });
  }

  // Persist user message
  const userMessage = messages[messages.length - 1];
  if (sessionId && userMessage?.role === "user") {
    await supabase.from("messages").insert({
      session_id: sessionId,
      role: "user",
      content: userMessage.content,
    });
  }

  // Fetch primary_goal for personalization if authenticated
  let primaryGoal: string | undefined;
  if (userId) {
    try {
      const { data: profile } = await supabase
        .from("users")
        .select("primary_goal")
        .eq("id", userId)
        .single();
      if (profile?.primary_goal) {
        primaryGoal = profile.primary_goal;
      }
    } catch (dbErr) {
      console.error("[/api/chat/group] Failed to fetch user primary goal:", dbErr);
    }
  }

  let streams: ReadableStream<Uint8Array>[];
  try {
    streams = await sendGroupMessage({
      buddyIds,
      messages,
      databankContext: {
        ...databankContext,
        ...(primaryGoal ? { primaryGoal } : {}),
      },
    });
  } catch (e) {
    console.error("[/api/chat/group] sendGroupMessage failed:", e);
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  // Collect all responses and persist each buddy's reply
  const responseTexts = await Promise.all(
    streams.map(async (stream, i) => {
      const [clientReadable, dbReadable] = stream.tee();

      // Accumulate for DB
      if (sessionId) {
        (async () => {
          try {
            const chunks: Uint8Array[] = [];
            const reader = dbReadable.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) chunks.push(value);
            }
            const fullText = new TextDecoder().decode(
              Buffer.concat(chunks.map((c) => Buffer.from(c)))
            );
            await supabase.from("messages").insert({
              session_id: sessionId,
              role: "assistant",
              buddy_id: buddyIds[i],
              content: fullText,
            });
          } catch (e) {
            console.error("[/api/chat/group] DB persist failed:", e);
          }
        })();
      }

      // Read into memory for JSON response (group chat responses are short)
      const chunks: Uint8Array[] = [];
      const reader = clientReadable.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      return new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
    })
  );

  return NextResponse.json(
    buddyIds.map((id, i) => ({ buddyId: id, text: responseTexts[i] }))
  );
}
