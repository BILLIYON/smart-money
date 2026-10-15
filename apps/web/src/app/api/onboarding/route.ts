import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { goal, buddyId } = await req.json() as {
    goal?: string;
    buddyId: string;
    connectedSources?: string[]; // reserved for future source-linking step
  };

  if (!buddyId) {
    return NextResponse.json({ error: "buddyId required" }, { status: 400 });
  }

  // Run all mutations in parallel
  const [profileUpdate, subInsert, sessionInsert] = await Promise.all([
    // 1. Mark onboarding complete and save preferences
    supabase
      .from("users")
      .update({
        onboarding_complete: true,
        ...(goal ? { primary_goal: goal } : {}),
      })
      .eq("id", userId),

    // 2. Subscribe to the selected buddy (upsert in case of re-onboarding)
    supabase
      .from("user_buddies")
      .upsert({ user_id: userId, buddy_id: buddyId, active: true }, { onConflict: "user_id,buddy_id" }),

    // 3. Create the initial 1-to-1 chat session for the selected buddy
    supabase
      .from("chat_sessions")
      .insert({
        user_id: userId,
        buddy_ids: [buddyId],
        is_group: false,
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single(),

    // 4. Insert the onboarding goal into the goals table if provided
    ...(goal ? [
      supabase
        .from("goals")
        .insert({
          user_id: userId,
          buddy_id: buddyId,
          title: goal,
          target_amount: 100000000, // ₦1,000,000 default target
          current_amount: 0,
          status: "active",
        })
    ] : [])
  ]);

  const errors = [profileUpdate.error, subInsert.error, sessionInsert.error].filter(Boolean);
  if (errors.length) {
    console.error("[POST /api/onboarding]", errors);
    return NextResponse.json({ error: "Onboarding failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    sessionId: sessionInsert.data?.id,
  });
}
