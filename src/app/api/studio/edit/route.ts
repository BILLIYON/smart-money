import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { getDbBuddyById } from "@/lib/db";

export async function GET(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing buddy id" }, { status: 400 });
  }

  const buddy = await getDbBuddyById(id);
  if (!buddy) {
    return NextResponse.json({ error: "Buddy not found" }, { status: 404 });
  }

  if (buddy.creator_id && buddy.creator_id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ buddy });
}
