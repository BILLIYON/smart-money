import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { submitBuddy, getApprovedCommunityBuddies, getBuddiesByCreator } from "@/lib/db";

export async function GET() {
  try {
    const buddies = await getApprovedCommunityBuddies();
    
    // Check if current user is logged in to append their pending/draft buddies
    const auth = await requireAuth().catch(() => null);
    if (auth && auth.userId) {
      const creatorBuddies = await getBuddiesByCreator(auth.userId);
      const approvedIds = new Set(buddies.map((b) => b.id));
      for (const b of creatorBuddies) {
        if (!approvedIds.has(b.id)) {
          buddies.push(b);
        }
      }
    }

    return NextResponse.json(buddies);
  } catch (err) {
    console.error("[GET /api/studio]", err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId, error } = await requireAuth();
  if (error) return error;

  try {
    const config = await req.json();
    const buddyId = await submitBuddy(config, userId);
    return NextResponse.json({
      ok: true,
      buddyId,
      status: "in_review",
      estimatedReviewTime: "24–48 hours",
    });
  } catch (err: any) {
    console.error("[POST /api/studio]", err);
    return NextResponse.json(
      { error: err?.message || err?.details || "Failed to submit buddy for review" },
      { status: 500 }
    );
  }
}
