import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { getDbBuddyById } from "@/lib/db";
import { findUserById } from "@/lib/auth";

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

  const user = await findUserById(userId);
  const isAdmin = Boolean(user?.is_admin || user?.email === "admin@smartmoney.com");
  const isCreator =
    buddy.creator_id === userId ||
    (user?.email && buddy.creator_id && buddy.creator_id.toLowerCase() === user.email.toLowerCase());

  if (!isAdmin && !isCreator) {
    return NextResponse.json(
      { error: "Unauthorized: Only the creator or an admin can edit this buddy" },
      { status: 403 }
    );
  }

  return NextResponse.json({ buddy });
}
