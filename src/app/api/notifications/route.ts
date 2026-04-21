import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

/**
 * GET /api/notifications
 * Returns the last 20 notifications for the authenticated user,
 * ordered newest first.
 */
export async function GET() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (dbError) {
    console.error("[GET /api/notifications]", dbError);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/**
 * POST /api/notifications
 * Creates a notification for the authenticated user.
 * Used by server-side events (signals, agent actions, etc.).
 */
export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json() as {
    buddy_id?: string;
    title: string;
    body?: string;
    trigger_type?: string;
    trigger_source?: string;
    action_url?: string;
  };

  if (!body.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const { data, error: dbError } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      buddy_id: body.buddy_id ?? null,
      title: body.title,
      body: body.body ?? "",
      trigger_type: body.trigger_type ?? "system",
      trigger_source: body.trigger_source ?? null,
      action_url: body.action_url ?? null,
      read: false,
    })
    .select()
    .single();

  if (dbError) {
    console.error("[POST /api/notifications]", dbError);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
