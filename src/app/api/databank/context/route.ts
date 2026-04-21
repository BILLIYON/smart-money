import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

function monthStart(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

function priorMonthStart(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split("T")[0];
}

function thirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

export async function GET() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const MONTH_START       = monthStart();
  const PRIOR_MONTH_START = priorMonthStart();
  const THIRTY_DAYS_AGO   = thirtyDaysAgo();

  // ── All queries in parallel ──────────────────────────────
  const [entriesRes, goalsRes, integrationsRes, userRes] = await Promise.all([
    supabase
      .from("databank_entries")
      .select("entry_type, amount, description, category, entry_date, source")
      .eq("user_id", userId)
      .order("entry_date", { ascending: false }),

    supabase
      .from("goals")
      .select("title, target_amount, current_amount, target_date, status")
      .eq("user_id", userId)
      .eq("status", "active"),

    supabase
      .from("user_integrations")
      .select("provider, last_synced_at")
      .eq("user_id", userId),

    supabase
      .from("users")
      .select("currency")
      .eq("id", userId)
      .single(),
  ]);

  const entries      = entriesRes.data ?? [];
  const goals        = goalsRes.data ?? [];
  const integrations = integrationsRes.data ?? [];
  const currency     = userRes.data?.currency ?? "NGN";

  // ── Helpers ──────────────────────────────────────────────
  const thisMonth  = entries.filter((e) => e.entry_date >= MONTH_START);
  const priorMonth = entries.filter((e) => e.entry_date >= PRIOR_MONTH_START && e.entry_date < MONTH_START);
  const recent30   = entries.filter((e) => e.entry_date >= THIRTY_DAYS_AGO);

  // ── Monthly summary ──────────────────────────────────────
  const incomeEntries   = thisMonth.filter((e) => e.entry_type === "income");
  const expenseEntries  = thisMonth.filter((e) => e.entry_type === "expense");

  const totalIncome   = incomeEntries.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = expenseEntries.reduce((s, e) => s + e.amount, 0);
  const savingsRate   = totalIncome > 0
    ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) / 100
    : 0;

  const largestCredit = incomeEntries.reduce<typeof incomeEntries[0] | null>(
    (max, e) => (!max || e.amount > max.amount ? e : max), null
  );
  const largestDebit = expenseEntries.reduce<typeof expenseEntries[0] | null>(
    (max, e) => (!max || e.amount > max.amount ? e : max), null
  );

  // ── Top categories with trend ────────────────────────────
  function categoryTotals(list: typeof entries): Record<string, number> {
    const map: Record<string, number> = {};
    list
      .filter((e) => e.entry_type === "expense" && e.category)
      .forEach((e) => {
        const cat = e.category as string;
        map[cat] = (map[cat] ?? 0) + e.amount;
      });
    return map;
  }

  const thisCats  = categoryTotals(thisMonth);
  const priorCats = categoryTotals(priorMonth);
  const totalSpend = Object.values(thisCats).reduce((s, v) => s + v, 0);

  const topCategories = Object.entries(thisCats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([category, total]) => {
      const prior = priorCats[category] ?? 0;
      const trend: "up" | "down" | "stable" =
        prior === 0 ? "stable"
        : total > prior * 1.05 ? "up"
        : total < prior * 0.95 ? "down"
        : "stable";
      return {
        category,
        total,
        percentage: totalSpend > 0 ? Math.round((total / totalSpend) * 100) : 0,
        trend,
      };
    });

  // ── Subscriptions ────────────────────────────────────────
  const subscriptions = entries
    .filter((e) => e.entry_type === "subscription")
    .map((e) => ({
      name:        e.description,
      amount:      e.amount,
      frequency:   "monthly" as const,
      lastCharged: e.entry_date,
      source:      (e.source ?? "manual") as "gmail" | "upload" | "manual",
    }));

  // ── Recent transactions (last 30 days, max 30) ───────────
  const recentTransactions = recent30.slice(0, 30).map((e) => ({
    description: e.description,
    amount:      e.amount,
    type:        e.entry_type as "income" | "expense",
    category:    e.category ?? "Uncategorized",
    date:        e.entry_date,
    source:      e.source ?? "manual",
  }));

  // ── Active goals ─────────────────────────────────────────
  const activeGoals = goals.map((g) => ({
    title:           g.title,
    targetAmount:    g.target_amount,
    currentAmount:   g.current_amount,
    targetDate:      g.target_date,
    progressPercent: g.target_amount > 0
      ? Math.round((g.current_amount / g.target_amount) * 100)
      : 0,
  }));

  // ── Connected sources ────────────────────────────────────
  const sourceSet = new Set(entries.map((e) => e.source ?? "manual")) as Set<string>;
  const connectedSources = [...sourceSet].filter((s) =>
    ["gmail", "upload", "manual", "openbanking"].includes(s)
  ) as Array<"gmail" | "upload" | "manual" | "openbanking">;

  // ── Last sync timestamps ─────────────────────────────────
  const lastSyncAt: { gmail?: string; openbanking?: string } = {};
  for (const row of integrations) {
    if (row.provider === "gmail" && row.last_synced_at)
      lastSyncAt.gmail = row.last_synced_at;
    if (row.provider === "openbanking" && row.last_synced_at)
      lastSyncAt.openbanking = row.last_synced_at;
  }

  return NextResponse.json({
    currency,
    monthlySummary: {
      totalIncome,
      totalExpenses,
      savingsRate,
      largestCredit: largestCredit
        ? { amount: largestCredit.amount, description: largestCredit.description, date: largestCredit.entry_date }
        : null,
      largestDebit: largestDebit
        ? { amount: largestDebit.amount, description: largestDebit.description, date: largestDebit.entry_date }
        : null,
    },
    topCategories,
    subscriptions,
    recentTransactions,
    activeGoals,
    connectedSources,
    lastSyncAt,
  });
}
