import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MONTH_START = new Date(
  new Date().getFullYear(),
  new Date().getMonth(),
  1
).toISOString().split("T")[0];

const PREV_MONTH_START = new Date(
  new Date().getFullYear(),
  new Date().getMonth() - 1,
  1
).toISOString().split("T")[0];

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, n));
}

function getHeadline(score: number): string {
  if (score >= 85) return "Excellent — you're building real wealth";
  if (score >= 70) return "Strong — keep the momentum going";
  if (score >= 55) return "Good foundation — a few key moves will accelerate this";
  if (score >= 40) return "Work in progress — meaningful progress is within reach";
  if (score >= 25) return "Early stage — focus on the fundamentals";
  return "Starting point — every naira in the right direction counts";
}

export async function GET() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const [entriesRes, prevEntriesRes, goalsRes] = await Promise.all([
    supabase
      .from("databank_entries")
      .select("entry_type, amount, category, entry_date")
      .eq("user_id", userId)
      .gte("entry_date", MONTH_START),

    supabase
      .from("databank_entries")
      .select("entry_type, amount, entry_date")
      .eq("user_id", userId)
      .gte("entry_date", PREV_MONTH_START)
      .lt("entry_date", MONTH_START),

    supabase
      .from("goals")
      .select("target_amount, current_amount, status")
      .eq("user_id", userId)
      .eq("status", "active"),
  ]);

  const entries = entriesRes.data ?? [];
  const prevEntries = prevEntriesRes.data ?? [];
  const goals = goalsRes.data ?? [];

  // ── 1. Savings rate (35%) ──────────────────────────────
  const income = entries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const expenses = entries.filter((e) => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
  const savingsRate = income > 0 ? (income - expenses) / income : 0;
  // Map: 0% → 0pts, 20% → 70pts, 35%+ → 100pts
  const savingsScore = clamp(Math.round(savingsRate * 280), 0, 100);

  // ── 2. Net-worth growth (25%) ──────────────────────────
  const prevIncome = prevEntries.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const prevExpenses = prevEntries.filter((e) => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
  const thisNet = income - expenses;
  const prevNet = prevIncome - prevExpenses;
  // Positive delta → good. Cap at 100.
  let growthScore = 50; // neutral if no history
  if (prevNet !== 0) {
    const delta = (thisNet - prevNet) / Math.abs(prevNet);
    growthScore = clamp(Math.round(50 + delta * 50), 0, 100);
  }

  // ── 3. Debt ratio inverted (20%) ──────────────────────
  const allEntriesRes = await supabase
    .from("databank_entries")
    .select("entry_type, amount")
    .eq("user_id", userId);

  const allEntries = allEntriesRes.data ?? [];
  const totalAssets = allEntries.filter((e) => e.entry_type === "asset").reduce((s, e) => s + e.amount, 0);
  const totalDebt = allEntries.filter((e) => e.entry_type === "debt").reduce((s, e) => s + Math.abs(e.amount), 0);
  let debtScore = 75; // neutral if no debt data
  if (totalAssets > 0) {
    const debtRatio = totalDebt / (totalAssets + totalDebt);
    debtScore = clamp(Math.round((1 - debtRatio) * 100), 0, 100);
  }

  // ── 4. Goal progress (20%) ────────────────────────────
  let goalScore = 50; // neutral if no goals
  if (goals.length > 0) {
    const avgProgress =
      goals.reduce(
        (s, g) => s + (g.target_amount > 0 ? g.current_amount / g.target_amount : 0),
        0
      ) / goals.length;
    goalScore = clamp(Math.round(avgProgress * 100), 0, 100);
  }

  // ── Weighted composite ────────────────────────────────
  const score = Math.round(
    savingsScore * 0.35 +
    growthScore  * 0.25 +
    debtScore    * 0.20 +
    goalScore    * 0.20
  );

  const insights: string[] = [];
  if (savingsRate < 0.1) insights.push("Savings rate below 10% — closing even one subscription could move this significantly.");
  if (savingsRate >= 0.25) insights.push("Strong savings rate — you're ahead of most users on the platform.");
  if (totalDebt > totalAssets * 0.5) insights.push("Debt-to-asset ratio is elevated — reducing liabilities should be a near-term priority.");
  if (goals.length === 0) insights.push("No active goals — setting one goal today has been shown to improve financial outcomes.");
  if (goalScore >= 70) insights.push("Goal progress is strong — you're ahead of your targets.");

  // ── Buddy-voice take from Claude ──────────────────────
  let buddyTake = "";
  try {
    const resp = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 120,
      messages: [
        {
          role: "user",
          content: `Financial health score: ${score}/100. Savings rate: ${Math.round(savingsRate * 100)}%. Key insight: ${insights[0] ?? "steady progress"}. Write 1–2 sentences of actionable commentary in the voice of a direct, no-nonsense finance advisor. Use ₦ for currency. No fluff.`,
        },
      ],
    });
    buddyTake =
      resp.content[0].type === "text" ? resp.content[0].text : "";
  } catch {
    // Non-critical — skip if AI call fails
  }

  return NextResponse.json({
    score,
    headline: getHeadline(score),
    breakdown: {
      savingsScore,
      growthScore,
      debtScore,
      goalScore,
    },
    insights,
    buddyTake,
  });
}
