import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  const buddyId = url.searchParams.get("buddyId");

  try {
    let targetSessionId = sessionId;

    // If no sessionId provided but buddyId is, find the user's latest session with that buddy
    if (!targetSessionId && buddyId) {
      const { data: sessionData } = await supabase
        .from("chat_sessions")
        .select("id, buddy_ids, session_name, created_at, last_message_at")
        .eq("user_id", userId)
        .contains("buddy_ids", [buddyId])
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .single();

      if (sessionData) {
        targetSessionId = sessionData.id;
      }
    }

    if (!targetSessionId) {
      return NextResponse.json({ session: null, messages: [] });
    }

    // Verify session belongs to user
    const { data: session, error: sessErr } = await supabase
      .from("chat_sessions")
      .select("id, buddy_ids, session_name, is_group, created_at, last_message_at")
      .eq("id", targetSessionId)
      .eq("user_id", userId)
      .single();

    if (sessErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: rawMsgs, error: msgErr } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("session_id", targetSessionId)
      .order("created_at", { ascending: true });

    if (msgErr) {
      console.error("[GET /api/chat/messages]", msgErr);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    const formattedMessages = ((rawMsgs as any[]) ?? []).map((m: any) => ({
      id: m.id,
      role: m.role === "assistant" ? ("ai" as const) : ("user" as const),
      content: m.content,
      time: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }));

    return NextResponse.json({
      session,
      messages: formattedMessages,
    });
  } catch (err: any) {
    console.error("[GET /api/chat/messages] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load history" }, { status: 500 });
  }
}
