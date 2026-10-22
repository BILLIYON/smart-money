import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getApprovedCommunityBuddies } from "@/lib/db";
import { Pool } from "pg";

let poolInstance: Pool | null = null;
function getPool() {
  if (!poolInstance) {
    const connectionString = process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money";
    const isRemote = connectionString.includes("supabase.com") || connectionString.includes("pooler") || connectionString.includes("aws-");
    poolInstance = new Pool({
      connectionString,
      ssl: isRemote ? { rejectUnauthorized: false } : false,
      max: 10,
    });
  }
  return poolInstance;
}

// In-memory store for guest/demo sessions
let IN_MEMORY_GOALS: any[] = [];

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let dbGoals: any[] = [];

    if (user) {
      const pool = getPool();
      const res = await pool.query(
        `SELECT g.*, p.name as partner_name, p.slug as partner_slug
         FROM public.goals g
         LEFT JOIN public.partner_orgs p ON g.origin_partner_org_id = p.id
         WHERE g.user_id = $1 AND (g.status IS NULL OR g.status != 'declined')
         ORDER BY g.created_at ASC;`,
        [user.id]
      );
      dbGoals = res.rows;
    } else {
      dbGoals = IN_MEMORY_GOALS;
    }

    const allCommunityBuddies = await getApprovedCommunityBuddies();

    // Format goals for frontend
    const formattedGoals = dbGoals.map((g) => {
      const buddyId = g.buddy_id;
      const buddy = allCommunityBuddies.find((b) => b.id === buddyId) || allCommunityBuddies[0];

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
        buddyEmoji: buddy ? (buddy.avatar_content || "🎯") : "🎯",
        buddyColor: buddy ? (buddy.avatar_bg || "#132952") : "#132952",
        current: (g.current_amount || 0) / 100, // kobo to Naira
        target: (g.target_amount || 0) / 100,   // kobo to Naira
        deadline: deadlineStr,
        barColor,
        milestoneMessage: "Keep pushing toward your financial target. Consistency builds wealth.",
        origin: g.origin || "client",
        originPartnerOrgId: g.origin_partner_org_id || null,
        partnerName: g.partner_name || null,
        advisorNote: g.advisor_note || null,
        requiresAcceptance: Boolean(g.requires_acceptance),
        acceptedAt: g.accepted_at || null,
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
      origin: "client",
      requires_acceptance: false,
    };

    if (user) {
      const pool = getPool();
      const { rows } = await pool.query(
        `INSERT INTO public.goals (user_id, buddy_id, title, target_amount, current_amount, target_date, status, origin, requires_acceptance)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'client', false)
         RETURNING *;`,
        [user.id, newGoalRecord.buddy_id, newGoalRecord.title, newGoalRecord.target_amount, newGoalRecord.current_amount, newGoalRecord.target_date, newGoalRecord.status]
      );
      return NextResponse.json(rows[0], { status: 201 });
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
      const pool = getPool();
      await pool.query("DELETE FROM public.goals WHERE user_id = $1;", [user.id]);
    }

    IN_MEMORY_GOALS = [];
    return NextResponse.json({ ok: true, message: "All goals cleared successfully" });
  } catch (err) {
    console.error("[DELETE /api/goals/list]", err);
    return NextResponse.json({ ok: true, message: "Cleared" });
  }
}
