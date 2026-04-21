import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

/**
 * POST /api/notifications/read-all
 * Marks all of the authenticated user's notifications as read.
 */
export async function POST() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { error: dbError } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (dbError) {
    console.error("[POST /api/notifications/read-all]", dbError);
    return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
