import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { sendMessage, type Message, type DatabankContext } from "@/lib/ai";

function extractJsonPayload(content: string, tagPrefix: string): { jsonStr: string | null; fullMatch: string | null } {
  const tagIndex = content.indexOf(tagPrefix);
  if (tagIndex === -1) return { jsonStr: null, fullMatch: null };

  const startBrace = content.indexOf("{", tagIndex);
  if (startBrace === -1) return { jsonStr: null, fullMatch: null };

  let depth = 0;
  let endBrace = -1;
  let inString = false;
  let escape = false;

  for (let i = startBrace; i < content.length; i++) {
    const char = content[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{") depth++;
      else if (char === "}") {
        depth--;
        if (depth === 0) {
          endBrace = i;
          break;
        }
      }
    }
  }

  if (endBrace === -1) return { jsonStr: null, fullMatch: null };

  const jsonStr = content.slice(startBrace, endBrace + 1);
  const closingBracket = content.indexOf("]", endBrace);
  const fullMatch = closingBracket !== -1
    ? content.slice(tagIndex, closingBracket + 1)
    : content.slice(tagIndex, endBrace + 1);

  return { jsonStr, fullMatch };
}

function cleanJsonString(str: string): string {
  return str.replace(/,\s*([}\]])/g, "$1");
}

function parseIsoDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const monthYearMatch = str.match(/^([a-zA-Z]+)\s+(\d{2,4})$/);
  if (monthYearMatch) {
    const monthName = monthYearMatch[1];
    let year = monthYearMatch[2];
    if (year.length === 2) year = `20${year}`;
    const d = new Date(`${monthName} 1, ${year}`);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

function parseAmountToKobo(rawAmt: any): number {
  if (typeof rawAmt === "number") {
    return Math.round(Math.abs(rawAmt) * 100);
  }
  if (!rawAmt) return 0;
  const str = String(rawAmt).toLowerCase().trim();
  let multiplier = 1;
  if (str.endsWith("k")) multiplier = 1000;
  else if (str.endsWith("m")) multiplier = 1000000;

  const numericPart = parseFloat(str.replace(/[^0-9.]/g, "")) || 0;
  return Math.round(Math.abs(numericPart * multiplier) * 100);
}

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
            const domainUrl = process.env.NEXT_PUBLIC_APP_URL || "https://smartmoney.technology";
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

  // Fire-and-forget: collect the full AI response and persist it (for all authenticated users)
  if (user) {
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
        const serviceSupabase = createServiceSupabaseClient();

        let remainingText = fullText;
        let foundWriteTag = true;

        while (foundWriteTag) {
          const { jsonStr, fullMatch } = extractJsonPayload(remainingText, "[DATABANK_WRITE:");
          if (jsonStr && fullMatch) {
            try {
              const payload = JSON.parse(cleanJsonString(jsonStr));

              // Process entries
              if (payload.entries && Array.isArray(payload.entries)) {
                for (const e of payload.entries) {
                  if (!e.description || typeof e.amount !== "number") continue;
                  const rawAmt = typeof e.amount === "number" ? e.amount : parseFloat(String(e.amount).replace(/[^0-9.]/g, "")) || 0;
                  await serviceSupabase.from("databank_entries").insert({
                    user_id: user.id,
                    source: "manual",
                    entry_type: e.entry_type ?? "expense",
                    amount: Math.round(Math.abs(rawAmt) * 100),
                    description: String(e.description).trim(),
                    category: e.category ?? "other",
                    entry_date: e.date ?? new Date().toISOString().split("T")[0],
                    metadata: { ...(e.metadata || {}), created_by_ai: true, buddy_id: buddyId },
                  });
                }
              }

              // Process nested goal in DATABANK_WRITE
              if (payload.goal && (payload.goal.title || payload.goal.name)) {
                const title = payload.goal.title || payload.goal.name;
                const rawAmt = payload.goal.target_amount || payload.goal.amount || 0;
                const targetKobo = parseAmountToKobo(rawAmt);
                const validTargetDate = parseIsoDate(payload.goal.target_date || payload.goal.date);

                if (title && targetKobo > 0) {
                  const { error: gErr } = await serviceSupabase.from("goals").insert({
                    user_id: user.id,
                    buddy_id: buddyId ?? null,
                    title: String(title).trim(),
                    target_amount: targetKobo,
                    current_amount: parseAmountToKobo(payload.goal.current_amount ?? 0),
                    target_date: validTargetDate,
                    status: "active",
                  });
                  if (gErr) {
                    console.error("[/api/chat] Goal insert error:", gErr);
                  }
                }
              }
            } catch (e) {
              console.error("[/api/chat] Failed to process DATABANK_WRITE:", e);
            }
            remainingText = remainingText.replace(fullMatch, "").trim();
          } else {
            foundWriteTag = false;
          }
        }

        // Extract and process standalone [GOAL: {...}] tags
        let foundGoalTag = true;
        while (foundGoalTag) {
          const { jsonStr, fullMatch } = extractJsonPayload(remainingText, "[GOAL:");
          if (jsonStr && fullMatch) {
            try {
              const payload = JSON.parse(cleanJsonString(jsonStr));
              const title = payload.title || payload.name;
              const rawAmt = payload.target_amount || payload.amount || 0;
              const targetKobo = parseAmountToKobo(rawAmt);
              const validTargetDate = parseIsoDate(payload.target_date || payload.date);

              if (title && targetKobo > 0) {
                const { error: gErr } = await serviceSupabase.from("goals").insert({
                  user_id: user.id,
                  buddy_id: buddyId ?? null,
                  title: String(title).trim(),
                  target_amount: targetKobo,
                  current_amount: parseAmountToKobo(payload.current_amount ?? 0),
                  target_date: validTargetDate,
                  status: "active",
                });
                if (gErr) {
                  console.error("[/api/chat] Standalone Goal insert error:", gErr);
                }
              }
            } catch (e) {
              console.error("[/api/chat] Failed to process GOAL tag:", e);
            }
            remainingText = remainingText.replace(fullMatch, "").trim();
          } else {
            foundGoalTag = false;
          }
        }

        finalContent = remainingText;

        if (sessionId) {
          await supabase.from("messages").insert({
            session_id: sessionId,
            role: "assistant",
            buddy_id: buddyId,
            content: finalContent,
          });
        }
      } catch (e) {
        console.error("[/api/chat] DB persist failed:", e);
      }
    })();
  }

  return new Response(clientStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
