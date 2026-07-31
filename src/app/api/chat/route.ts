import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendMessage, type Message, type DatabankContext } from "@/lib/ai";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { buddyId, messages, databankContext, sessionId, enableCrossSessionMemory = true } = (await req.json()) as {
    buddyId: string;
    messages: Message[];
    databankContext: DatabankContext;
    sessionId?: string;
    enableCrossSessionMemory?: boolean;
  };

  if (!buddyId || !messages?.length) {
    return NextResponse.json({ error: "buddyId and messages required" }, { status: 400 });
  }

  // Persist the user's last message before streaming
  const userMessage = messages[messages.length - 1];
  if (user && sessionId && userMessage?.role === "user") {
    await supabase.from("messages").insert({
      session_id: sessionId,
      role: "user",
      content: userMessage.content,
    });
  }

  // Load real databank context on the server side if authenticated
  let realContext = databankContext;
  let crossSessionMemoryText = "";

  if (user) {
    try {
      const { getDatabankContextForUser } = await import("@/lib/databank-context");
      realContext = await getDatabankContextForUser(supabase, user.id);
    } catch (dbErr) {
      console.error("[/api/chat] Failed to fetch real user databank context:", dbErr);
    }

    // Fetch cross-session memories if enabled
    if (enableCrossSessionMemory) {
      try {
        const { data: otherSessions } = await supabase
          .from("chat_sessions")
          .select("id, session_name, created_at, messages(role, content)")
          .eq("user_id", user.id)
          .neq("id", sessionId ?? "")
          .order("last_message_at", { ascending: false })
          .limit(5);

        if (otherSessions && otherSessions.length > 0) {
          const memories: string[] = [];
          otherSessions.forEach((sess: any) => {
            const topic = sess.session_name || "Past Session";
            const userMsgs = (sess.messages || [])
              .filter((m: any) => m.role === "user" && m.content && m.content.length > 10)
              .map((m: any) => m.content)
              .slice(0, 2);
            if (userMsgs.length > 0) {
              memories.push(`• Conversation Topic "${topic}": User asked/stated "${userMsgs.join(" | ")}"`);
            }
          });
          crossSessionMemoryText = memories.join("\n");
        }
      } catch (memErr) {
        console.warn("[/api/chat] Cross-session memory error:", memErr);
      }
    }

    // Trigger auto topic title generation if session has no title yet
    if (sessionId && userMessage?.role === "user" && messages.length <= 2) {
      (async () => {
        try {
          const { data: sessRow } = await supabase
            .from("chat_sessions")
            .select("session_name")
            .eq("id", sessionId)
            .single();

          if (sessRow && !sessRow.session_name) {
            const domainUrl = process.env.NEXT_PUBLIC_APP_URL || "https://smart-money-livid.vercel.app";
            await fetch(`${domainUrl}/api/chat/title`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId, firstMessage: userMessage.content }),
            });
          }
        } catch { /* background title generation */ }
      })();
    }
  }

  // Stream from AI
  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await sendMessage({
      buddyId,
      messages,
      databankContext: realContext,
      crossSessionMemory: crossSessionMemoryText,
    });
  } catch (e) {
    console.error("[/api/chat] sendMessage failed:", e);
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  // Tee the stream: one side goes to the client, the other accumulates for DB save
  const [clientStream, dbStream] = stream.tee();

  // Fire-and-forget: collect the full AI response and persist it (only for authenticated users with sessionId)
  if (user && sessionId) {
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
        let finalContent = fullText;

        // Extract [AGENT_ACTION: {...}]
        const actionRegex = /\[AGENT_ACTION:\s*(\{[\s\S]*?\})\s*\]/g;
        let match;
        const actionsToInsert = [];
        
        while ((match = actionRegex.exec(fullText)) !== null) {
          try {
            const payload = JSON.parse(match[1]);
            actionsToInsert.push({
              user_id: user.id,
              buddy_id: buddyId,
              action_type: payload.action || 'generic',
              description: payload.title || 'Agent Action',
              amount: payload.amount || 0,
              currency: 'NGN',
              status: 'pending'
            });
          } catch (e) {
            console.error("[/api/chat] Failed to parse agent action JSON:", e);
          }
        }

        if (actionsToInsert.length > 0) {
          await supabase.from("agent_actions").insert(actionsToInsert);
          // Strip the action blocks from the final message saved to DB
          finalContent = fullText.replace(/\[AGENT_ACTION:\s*\{[\s\S]*?\}\s*\]/g, '').trim();
        }

        // Extract and process [DATABANK_WRITE: {...}] tags
        const writeRegex = /\[DATABANK_WRITE:\s*(\{[\s\S]*?\})\s*\]/g;
        let writeMatch;
        let hadDatabankWrite = false;

        while ((writeMatch = writeRegex.exec(fullText)) !== null) {
          try {
            const payload = JSON.parse(writeMatch[1]);
            const domainUrl = process.env.NEXT_PUBLIC_APP_URL || "https://smartmoney.technology";

            // Fire off the agent-write call server-side using the same auth session cookies
            const writeResp = await fetch(`${domainUrl}/api/databank/agent-write`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                // Forward auth by calling supabase insert directly from context we already have
              },
              body: JSON.stringify({
                entries: payload.entries ?? [],
                goal: payload.goal ?? null,
                buddy_id: buddyId,
                _user_id: user.id, // used below for direct supabase fallback
              }),
            });

            if (!writeResp.ok) {
              // Fallback: write directly via supabase since we already have the client
              const p = payload as { entries?: any[]; goal?: any };

              if (p.entries && Array.isArray(p.entries)) {
                for (const e of p.entries) {
                  if (!e.description || !e.amount) continue;
                  await supabase.from("databank_entries").insert({
                    user_id: user.id,
                    source: "manual",
                    entry_type: e.entry_type ?? "expense",
                    amount: Math.round(Math.abs(e.amount) * 100),
                    description: e.description.trim(),
                    category: e.category ?? "other",
                    entry_date: e.date ?? new Date().toISOString().split("T")[0],
                  });
                }
              }

              if (p.goal && p.goal.title && p.goal.target_amount) {
                await supabase.from("goals").insert({
                  user_id: user.id,
                  buddy_id: buddyId ?? null,
                  title: p.goal.title.trim(),
                  target_amount: Math.round(Math.abs(p.goal.target_amount) * 100),
                  current_amount: Math.round(Math.abs(p.goal.current_amount ?? 0) * 100),
                  target_date: p.goal.target_date ?? null,
                  status: "active",
                });
              }
            }

            hadDatabankWrite = true;
          } catch (e) {
            console.error("[/api/chat] Failed to parse DATABANK_WRITE JSON:", e);
          }
        }

        if (hadDatabankWrite) {
          // Strip the write blocks from the stored message — the UI renders a card separately
          finalContent = finalContent.replace(/\[DATABANK_WRITE:\s*\{[\s\S]*?\}\s*\]/g, '').trim();
        }

        await supabase.from("messages").insert({
          session_id: sessionId,
          role: "assistant",
          buddy_id: buddyId,
          content: finalContent,
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
