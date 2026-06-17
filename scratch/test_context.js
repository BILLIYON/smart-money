const { createClient } = require("@supabase/supabase-js");

const url = "https://gmbwrhdoyoinkmtrtbnr.supabase.co";
const serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYndyaGRveW9pbmttdHJ0Ym5yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4OTUzMSwiZXhwIjoyMDkxMjY1NTMxfQ.8uFfLI-KNwj3vLSpvwEhTcwjmD9-KUG5wYFz9FELt7c";

const supabase = createClient(url, serviceKey);

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

function priorMonthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split("T")[0];
}

function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

async function main() {
  const userId = '315d21b8-dfd2-4651-a82e-41b1b41931c3';

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

  const largestCredit = incomeEntries.reduce(
    (max, e) => (!max || e.amount > max.amount ? e : max), null
  );
  const largestDebit = expenseEntries.reduce(
    (max, e) => (!max || e.amount > max.amount ? e : max), null
  );

  // ── Top categories with trend ────────────────────────────
  function categoryTotals(list) {
    const map = {};
    list
      .filter((e) => e.entry_type === "expense" && e.category)
      .forEach((e) => {
        const cat = e.category;
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
      const trend =
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
      frequency:   "monthly",
      lastCharged: e.entry_date,
      source:      e.source ?? "manual",
    }));

  // ── Recent transactions (last 30 days, max 30) ───────────
  const recentTransactions = recent30.slice(0, 30).map((e) => ({
    description: e.description,
    amount:      e.amount,
    type:        e.entry_type,
    category:    e.category ?? "Uncategorized",
    date: e.entry_date,
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
  const sourceSet = new Set(entries.map((e) => e.source ?? "manual"));
  const connectedSources = [...sourceSet].filter((s) =>
    ["gmail", "upload", "manual", "openbanking"].includes(s)
  );

  // ── Last sync timestamps ─────────────────────────────────
  const lastSyncAt = {};
  for (const row of integrations) {
    if (row.provider === "gmail" && row.last_synced_at)
      lastSyncAt.gmail = row.last_synced_at;
    if (row.provider === "openbanking" && row.last_synced_at)
      lastSyncAt.openbanking = row.last_synced_at;
  }

  // ── Net worth & Savings calculations ──────────────────────
  const totalIncomeAllTime = entries.filter((e) => e.entry_type === "income").reduce((s, e) => s + e.amount, 0);
  const totalExpensesAllTime = entries.filter((e) => e.entry_type === "expense").reduce((s, e) => s + Math.abs(e.amount), 0);
  const netSavingsAllTime = Math.max(0, totalIncomeAllTime - totalExpensesAllTime);

  const totalAssets = entries.filter((e) => e.entry_type === "asset").reduce((s, e) => s + e.amount, 0);
  const totalDebt = entries.filter((e) => e.entry_type === "debt").reduce((s, e) => s + Math.abs(e.amount), 0);

  const netWorth = netSavingsAllTime + totalAssets - totalDebt;
  const savingsBalance = netSavingsAllTime + totalAssets;

  // ── Last 12 months time-series data ────────────────────────
  const monthlyData = {};
  const monthsList = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("default", { month: "short" });
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthsList.push({ key, label });
    monthlyData[key] = {
      month: label,
      income: 0,
      spent: 0,
      saved: 0,
      networth: 0,
    };
  }

  // Sort entries chronologically to compute running totals
  const sortedEntries = [...entries].sort((a, b) => (a.entry_date ?? "").localeCompare(b.entry_date ?? ""));

  let runningIncome = 0;
  let runningExpense = 0;
  let runningAssets = 0;
  let runningDebt = 0;

  sortedEntries.forEach((e) => {
    if (!e.entry_date) return;
    const yearMonth = e.entry_date.substring(0, 7);
    const amt = e.amount;

    if (e.entry_type === "income") {
      runningIncome += amt;
    } else if (e.entry_type === "expense") {
      runningExpense += Math.abs(amt);
    } else if (e.entry_type === "asset") {
      runningAssets += amt;
    } else if (e.entry_type === "debt") {
      runningDebt += Math.abs(amt);
    }

    if (monthlyData[yearMonth]) {
      if (e.entry_type === "income") {
        monthlyData[yearMonth].income += amt / 100000; // convert kobo to thousands of Naira
      } else if (e.entry_type === "expense") {
        monthlyData[yearMonth].spent += Math.abs(amt) / 100000;
      }
    }

    monthsList.forEach((m) => {
      if (m.key >= yearMonth) {
        const netCash = Math.max(0, runningIncome - runningExpense);
        monthlyData[m.key].networth = (netCash + runningAssets - runningDebt) / 100000;
      }
    });
  });

  monthsList.forEach((m) => {
    const md = monthlyData[m.key];
    md.saved = Math.max(0, md.income - md.spent);

    md.income = Math.round(md.income * 10) / 10;
    md.spent = Math.round(md.spent * 10) / 10;
    md.saved = Math.round(md.saved * 10) / 10;
    md.networth = Math.round(md.networth * 10) / 10;
  });

  const chartData = monthsList.map((m) => monthlyData[m.key]);

  console.log("Chart Data:", chartData);
  console.log("hasRealData would be:", chartData.some(d => d.income > 0 || d.spent > 0));
  console.log("Net Worth:", netWorth);
  console.log("Savings Balance:", savingsBalance);
}

main().catch(console.error);
