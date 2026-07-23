import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { ALL_BUDDIES } from "@/lib/buddies";

export async function GET() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  // Fetch user's goals from public.goals
  const { data: goals, error: dbError } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (dbError) {
    console.error("[GET /api/goals/list]", dbError);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }

  // Format goals for GoalsPage frontend
  const formattedGoals = (goals || []).map((g) => {
    const buddyId = g.buddy_id;
    // Match buddy details
    const buddy = ALL_BUDDIES.find((b) => b.id === buddyId || b.id === "contrarian");

    // Format target_date
    let deadlineStr = "No deadline";
    if (g.target_date) {
      const d = new Date(g.target_date);
      deadlineStr = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }

    // Format created_at
    let startStr = "Started";
    if (g.created_at) {
      const d = new Date(g.created_at);
      startStr = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }

    // Custom gradient coloring for subscription audit goal progress bar
    let barColor = null;
    if (g.title.toLowerCase().includes("subscription")) {
      barColor = "linear-gradient(90deg,#F5A623,#FFC107)";
    }

    let emoji = "🎯";
    if (g.title.toLowerCase().includes("emergency")) {
      emoji = "🏦";
    } else if (g.title.toLowerCase().includes("investment") || g.title.toLowerCase().includes("seed")) {
      emoji = "📈";
    } else if (g.title.toLowerCase().includes("subscription") || g.title.toLowerCase().includes("audit")) {
      emoji = "✂️";
    }

    return {
      id: g.id,
      emoji,
      title: g.title,
      meta: `Started ${startStr} · Target: ${deadlineStr}`,
      buddy: buddy ? buddy.name : "The Contrarian Investor",
      buddyEmoji: buddy ? buddy.avatarContent : "🎯",
      buddyColor: buddy ? buddy.avatarBg : "#132952",
      current: (g.current_amount || 0) / 100, // kobo to Naira
      target: (g.target_amount || 0) / 100, // kobo to Naira
      deadline: deadlineStr,
      barColor: barColor,
      milestoneMessage: g.title.toLowerCase().includes("emergency")
        ? "You're more than halfway to financial security. Most Nigerians never build this. Keep the pace."
        : g.title.toLowerCase().includes("investment")
        ? "45% in — you're ahead of the curve. At this rate, you'll hit your seed fund target two months early."
        : "Every cancelled subscription compounds. You've already freed up money working for you now.",
    };
  });

  return NextResponse.json(formattedGoals);
}

export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    
    // Set a default buddy if not provided
    const buddy_id = body.buddy_id || "contrarian";

    const { data, error: insertError } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        buddy_id,
        title: body.title,
        target_amount: body.target_amount,
        current_amount: body.current_amount || 0,
        target_date: body.target_date || null,
        status: body.status || "active",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[POST /api/goals/list] Insert error:", insertError);
      return NextResponse.json({ error: insertError.message || "Failed to create goal" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[POST /api/goals/list] Error:", err);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { error: dbError } = await supabase
    .from("goals")
    .delete()
    .eq("user_id", userId);

  if (dbError) {
    console.error("[DELETE /api/goals/list]", dbError);
    return NextResponse.json({ error: "Failed to clear goals" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "All goals cleared from database" });
}
