import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { ALL_BUDDIES } from "@/lib/buddies";

// In-memory store for guest/demo sessions
let IN_MEMORY_GOALS: any[] = [];

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let dbGoals: any[] = [];

    if (user) {
      const serviceSupabase = createServiceSupabaseClient();
      const { data, error } = await serviceSupabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (!error && data) {
        dbGoals = data;
      }
    } else {
      dbGoals = IN_MEMORY_GOALS;
    }

    // Format goals for frontend
    const formattedGoals = dbGoals.map((g) => {
      const buddyId = g.buddy_id;
      const buddy = ALL_BUDDIES.find((b) => b.id === buddyId || b.id === "contrarian");

      let deadlineStr = "No deadline";
      if (g.target_date) {
        const d = new Date(g.target_date);
        deadlineStr = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      }

      let startStr = "Started";
      if (g.created_at) {
        const d = new Date(g.created_at);
        startStr = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      }

      let barColor = null;
      if (g.title?.toLowerCase().includes("subscription")) {
        barColor = "linear-gradient(90deg,#F5A623,#FFC107)";
      }

      let emoji = "🎯";
      if (g.title?.toLowerCase().includes("emergency")) {
        emoji = "🏦";
      } else if (g.title?.toLowerCase().includes("investment") || g.title?.toLowerCase().includes("seed")) {
        emoji = "📈";
      } else if (g.title?.toLowerCase().includes("subscription") || g.title?.toLowerCase().includes("audit")) {
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
        target: (g.target_amount || 0) / 100,   // kobo to Naira
        deadline: deadlineStr,
        barColor,
        milestoneMessage: "Keep pushing toward your financial target. Consistency builds wealth.",
      };
    });

    return NextResponse.json(formattedGoals);
  } catch (err) {
    console.error("[GET /api/goals/list]", err);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const buddy_id = body.buddy_id || "contrarian";
    const goalId = `g-${Date.now()}`;

    const newGoalRecord = {
      id: goalId,
      user_id: user?.id || "guest",
      buddy_id,
      title: body.title,
      target_amount: Number(body.target_amount) || 0,
      current_amount: Number(body.current_amount) || 0,
      target_date: body.target_date || null,
      status: body.status || "active",
      created_at: new Date().toISOString(),
    };

    if (user) {
      const serviceSupabase = createServiceSupabaseClient();
      const { data, error: insertError } = await serviceSupabase
        .from("goals")
        .insert({
          user_id: user.id,
          buddy_id: newGoalRecord.buddy_id,
          title: newGoalRecord.title,
          target_amount: newGoalRecord.target_amount,
          current_amount: newGoalRecord.current_amount,
          target_date: newGoalRecord.target_date,
          status: newGoalRecord.status,
        })
        .select()
        .single();

      if (insertError) {
        console.error("[POST /api/goals/list] Insert error:", insertError);
        // Fallback to in-memory store
        IN_MEMORY_GOALS.push(newGoalRecord);
        return NextResponse.json(newGoalRecord, { status: 201 });
      }

      return NextResponse.json(data, { status: 201 });
    } else {
      IN_MEMORY_GOALS.push(newGoalRecord);
      return NextResponse.json(newGoalRecord, { status: 201 });
    }
  } catch (err) {
    console.error("[POST /api/goals/list] Error:", err);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const serviceSupabase = createServiceSupabaseClient();
      await serviceSupabase.from("goals").delete().eq("user_id", user.id);
    }

    IN_MEMORY_GOALS = [];
    return NextResponse.json({ ok: true, message: "All goals cleared successfully" });
  } catch (err) {
    console.error("[DELETE /api/goals/list]", err);
    return NextResponse.json({ ok: true, message: "Cleared" });
  }
}
