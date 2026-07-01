import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { ALL_BUDDIES } from "@/lib/buddies";

export async function GET() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  // 1. Fetch user's goals from public.goals
  let { data: goals, error: dbError } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (dbError) {
    console.error("[GET /api/goals/list]", dbError);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }

  // 2. Seed default goals if database is empty
  if (!goals || goals.length === 0) {
    const seedGoals = [
      {
        user_id: userId,
        buddy_id: "contrarian",
        title: "Emergency Fund — 6 Months",
        target_amount: 90000000, // ₦900k in kobo
        current_amount: 48000000, // ₦480k in kobo
        target_date: "2026-06-30",
        status: "active",
      },
      {
        user_id: userId,
        buddy_id: "architect",
        title: "Investment Seed Fund",
        target_amount: 50000000, // ₦500k in kobo
        current_amount: 22500000, // ₦225k in kobo
        target_date: "2026-12-31",
        status: "active",
      },
      {
        user_id: userId,
        buddy_id: "contrarian",
        title: "Subscription Audit",
        target_amount: 3400000, // ₦34k in kobo
        current_amount: 1200000, // ₦12k in kobo
        target_date: "2026-03-31",
        status: "active",
      }
    ];

    const { data: insertedGoals, error: insertError } = await supabase
      .from("goals")
      .insert(seedGoals)
      .select();

    if (insertError) {
      console.error("[GET /api/goals/list] Seed insertion error:", insertError);
    } else {
      goals = insertedGoals || [];
    }
  }

  // 3. Format goals for GoalsPage frontend
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
      current: g.current_amount / 100, // kobo to Naira
      target: g.target_amount / 100, // kobo to Naira
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
