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
  const totalExpenses = Math.abs(expenseEntries.reduce((s, e) => s + e.amount, 0));
  const savingsRate   = totalIncome > 0
    ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) / 100
    : 0;

  const largestCredit = incomeEntries.reduce<typeof incomeEntries[0] | null>(
    (max, e) => (!max || e.amount > max.amount ? e : max), null
  );
  const largestDebit = expenseEntries.reduce<typeof expenseEntries[0] | null>(
    (max, e) => (!max || Math.abs(e.amount) > Math.abs(max.amount) ? e : max), null
  );

  // ── Top categories with trend ────────────────────────────
  function categoryTotals(list: typeof entries): Record<string, number> {
    const map: Record<string, number> = {};
    list
      .filter((e) => e.entry_type === "expense" && e.category)
      .forEach((e) => {
        const cat = e.category as string;
        map[cat] = (map[cat] ?? 0) + Math.abs(e.amount);
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

  // ── Net worth & Savings calculations ──────────────────────
  const totalIncomeAllTime = entries.filter((e) => e.entry_type === "income").reduce((s, e) => s + e.amount, 0);
  const totalExpensesAllTime = entries.filter((e) => e.entry_type === "expense").reduce((s, e) => s + Math.abs(e.amount), 0);
  const netSavingsAllTime = totalIncomeAllTime - totalExpensesAllTime;

  const totalAssets = entries.filter((e) => e.entry_type === "asset").reduce((s, e) => s + e.amount, 0);
  const totalDebt = entries.filter((e) => e.entry_type === "debt").reduce((s, e) => s + Math.abs(e.amount), 0);

  const netWorth = netSavingsAllTime + totalAssets - totalDebt;
  const savingsBalance = Math.max(0, netSavingsAllTime) + totalAssets;

  const rawAssets = entries.filter((e) => e.entry_type === "asset");
  const cashSavingsVal = Math.max(0, netSavingsAllTime);
  let assetsList = rawAssets.map((e) => ({
    name: e.description,
    value: Math.round(e.amount / 100),
    pct: Math.round((e.amount / Math.max(1, savingsBalance)) * 100),
  }));
  if (cashSavingsVal > 0) {
    assetsList.unshift({
      name: "Cash Savings",
      value: Math.round(cashSavingsVal / 100),
      pct: Math.round((cashSavingsVal / Math.max(1, savingsBalance)) * 100),
    });
  } else if (assetsList.length === 0 && savingsBalance > 0) {
    assetsList = [{
      name: "Cash Savings",
      value: Math.round(savingsBalance / 100),
      pct: 100,
    }];
  }

  const rawLiabilities = entries.filter((e) => e.entry_type === "debt");
  const liabilitiesList = rawLiabilities.map((e) => ({
    name: e.description,
    value: Math.round(Math.abs(e.amount) / 100),
    pct: Math.round((Math.abs(e.amount) / Math.max(1, totalDebt)) * 100),
  }));

  // ── Last 12 months time-series data ────────────────────────
  const monthlyData: Record<string, { month: string; income: number; spent: number; saved: number; networth: number }> = {};
  const monthsList: { key: string; label: string }[] = [];
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

  function toNairaVal(amt: number): number {
    const abs = Math.abs(amt);
    if (abs > 100000) return abs / 100; // stored in kobo
    return abs; // stored in Naira
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
    const amtNaira = toNairaVal(e.amount);

    if (e.entry_type === "income") {
      runningIncome += amtNaira * 100;
    } else if (e.entry_type === "expense") {
      runningExpense += amtNaira * 100;
    } else if (e.entry_type === "asset") {
      runningAssets += amtNaira * 100;
    } else if (e.entry_type === "debt") {
      runningDebt += amtNaira * 100;
    }

    if (monthlyData[yearMonth]) {
      if (e.entry_type === "income") {
        monthlyData[yearMonth].income += amtNaira / 1000;
      } else if (e.entry_type === "expense") {
        monthlyData[yearMonth].spent += amtNaira / 1000;
      }
    }

    monthsList.forEach((m) => {
      if (m.key >= yearMonth) {
        const netCash = runningIncome - runningExpense;
        monthlyData[m.key].networth = Math.round((netCash + runningAssets - runningDebt) / 100000);
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

  // ── Monthly category trends ──────────────────────────────
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().split("T")[0];

  const sixMonthEntries = entries.filter((e) => e.entry_date && e.entry_date >= sixMonthsAgoStr && e.entry_type === "expense");
  const uniqueCategories = Array.from(new Set(sixMonthEntries.map((e) => e.category).filter(Boolean))) as string[];

  const trendMonths = monthsList.slice(-6); // last 6 months
  const catTrendRows = uniqueCategories.map((cat) => {
    const vals = trendMonths.map((m) => {
      const monthSpent = entries
        .filter((e) => e.entry_type === "expense" && e.category === cat && e.entry_date && e.entry_date.substring(0, 7) === m.key)
        .reduce((s, e) => s + Math.abs(e.amount), 0);
      return Math.round(monthSpent / 100000 * 10) / 10; // in thousands of Naira
    });

    const lastVal = vals[vals.length - 1] ?? 0;
    const priorVal = vals[vals.length - 2] ?? 0;
    let trendText = "→ 0%";
    let trendDir: "up" | "down" | "flat" = "flat";
    if (priorVal > 0) {
      const pct = Math.round(((lastVal - priorVal) / priorVal) * 100);
      if (pct > 0) {
        trendText = `↑ +${pct}%`;
        trendDir = "up";
      } else if (pct < 0) {
        trendText = `↓ ${pct}%`;
        trendDir = "down";
      }
    } else if (lastVal > 0) {
      trendText = "↑ New";
      trendDir = "up";
    }

    let icon = "⚡";
    const catLower = cat.toLowerCase();
    if (catLower.includes("food") || catLower.includes("dining")) icon = "🍔";
    else if (catLower.includes("sub")) icon = "🔄";
    else if (catLower.includes("transport") || catLower.includes("ride")) icon = "🚗";
    else if (catLower.includes("shop")) icon = "🛍️";
    else if (catLower.includes("utility") || catLower.includes("power") || catLower.includes("electricity")) icon = "⚡";
    else if (catLower.includes("salary") || catLower.includes("income")) icon = "💰";

    return {
      cat: `${icon} ${cat}`,
      vals,
      trend: trendText,
      trendDir: trendDir as "up" | "down" | "flat",
    };
  });

  // ── Extract real bank accounts ────────────────────────────
  const bankMap: Record<string, { bankName: string; accountNumber: string; balance: number; source: string; lastUpdated: string }> = {};

  entries.forEach((e) => {
    const descLower = (e.description || "").toLowerCase();
    let bankName = "";
    if (descLower.includes("gtbank") || descLower.includes("gtb") || descLower.includes("guaranty")) bankName = "GTBank";
    else if (descLower.includes("zenith")) bankName = "Zenith Bank";
    else if (descLower.includes("kuda")) bankName = "Kuda Bank";
    else if (descLower.includes("access")) bankName = "Access Bank";
    else if (descLower.includes("firstbank") || descLower.includes("first bank")) bankName = "First Bank";
    else if (descLower.includes("uba")) bankName = "UBA";
    else if (descLower.includes("stanbic")) bankName = "Stanbic IBTC";
    else if (descLower.includes("opay")) bankName = "OPay";
    else if (descLower.includes("palmpay")) bankName = "PalmPay";
    else if (descLower.includes("moniepoint")) bankName = "Moniepoint";
    else if (e.source === "gmail") bankName = "Gmail Synced Account";
    else if (e.source === "upload") bankName = "Uploaded Statement Account";

    if (bankName) {
      if (!bankMap[bankName]) {
        bankMap[bankName] = {
          bankName,
          accountNumber: "•••• Main",
          balance: 0,
          source: e.source === "gmail" ? "Gmail Alert" : e.source === "upload" ? "Statement Upload" : "DataBank",
          lastUpdated: e.entry_date ? new Date(e.entry_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recent",
        };
      }
      const val = toNairaVal(e.amount);
      if (e.entry_type === "income" || e.entry_type === "asset") {
        bankMap[bankName].balance += val;
      } else if (e.entry_type === "expense") {
        bankMap[bankName].balance += val;
      }
    }
  });

  const parsedBankAccounts = Object.values(bankMap);

  return NextResponse.json({
    currency,
    netWorth,
    savingsBalance,
    parsedBankAccounts,
    chartData,
    catTrendRows,
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
    assetsList,
    liabilitiesList,
  });
}
