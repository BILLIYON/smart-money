import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

export async function GET() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from("chat_sessions")
    .select("id, buddy_ids, session_name, is_group, created_at, last_message_at")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (dbError) {
    console.error("[GET /api/chat/sessions]", dbError);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { buddyIds, sessionName, isGroup } = await req.json() as {
    buddyIds: string[];
    sessionName?: string;
    isGroup?: boolean;
  };

  if (!buddyIds?.length) {
    return NextResponse.json({ error: "buddyIds required" }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from("chat_sessions")
    .insert({
      user_id: userId,
      buddy_ids: buddyIds,
      session_name: sessionName ?? null,
      is_group: isGroup ?? buddyIds.length > 1,
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (dbError) {
    console.error("[POST /api/chat/sessions]", dbError);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { sessionId, sessionName } = (await req.json()) as {
    sessionId: string;
    sessionName: string;
  };

  if (!sessionId || !sessionName) {
    return NextResponse.json({ error: "sessionId and sessionName required" }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from("chat_sessions")
    .update({ session_name: sessionName })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select()
    .single();

  if (dbError) {
    console.error("[PATCH /api/chat/sessions]", dbError);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { sessionId } = (await req.json()) as { sessionId: string };

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const { error: deleteMsgsErr } = await supabase
    .from("messages")
    .delete()
    .eq("session_id", sessionId);

  if (deleteMsgsErr) {
    console.warn("[DELETE /api/chat/sessions] delete msgs warning:", deleteMsgsErr);
  }

  const { error: dbError } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (dbError) {
    console.error("[DELETE /api/chat/sessions]", dbError);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
