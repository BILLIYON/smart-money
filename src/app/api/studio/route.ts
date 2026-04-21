import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { submitBuddy, getApprovedCommunityBuddies } from "@/lib/db";

export async function GET() {
  try {
    const buddies = await getApprovedCommunityBuddies();
    return NextResponse.json(buddies);
  } catch (err) {
    console.error("[GET /api/studio]", err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  const config = await req.json();

  try {
    const buddyId = await submitBuddy(config, userId);
    return NextResponse.json({
      ok: true,
      buddyId,
      status: "in_review",
      estimatedReviewTime: "24–48 hours",
    });
  } catch (err) {
    console.error("[POST /api/studio]", err);
    return NextResponse.json({ error: "Failed to submit buddy" }, { status: 500 });
  }
}
