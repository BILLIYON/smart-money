import { type DatabankContext } from "@/lib/ai";
import { Pool } from "pg";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

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

export async function getDatabankContextForUser(
  _clientOrUserId: any,
  userIdParam?: string
): Promise<DatabankContext> {
  const userId = typeof _clientOrUserId === "string" ? _clientOrUserId : userIdParam ?? "";

  const MONTH_START       = monthStart();
  const PRIOR_MONTH_START = priorMonthStart();
  const THIRTY_DAYS_AGO   = thirtyDaysAgo();

  const pool = getPool();

  try {
    // Fetch all user databank entries, goals, integrations, active signals, and currency in parallel
    const [entriesRes, goalsRes, integrationsRes, signalsRes, userRes] = await Promise.all([
      pool.query(
        `SELECT entry_type, amount, description, category, entry_date, source, metadata
         FROM databank_entries
         WHERE user_id = $1
         ORDER BY entry_date DESC;`,
        [userId]
      ),

      pool.query(
        `SELECT title, target_amount, current_amount, target_date, status
         FROM goals
         WHERE user_id = $1 AND status = 'active';`,
        [userId]
      ),

      pool.query(
        `SELECT provider, last_synced_at
         FROM user_integrations
         WHERE user_id = $1;`,
        [userId]
      ),

      pool.query(
        `SELECT uss.source_id, ss.name as source_name
         FROM user_signal_sources uss
         LEFT JOIN signal_sources ss ON ss.id = uss.source_id
         WHERE uss.user_id = $1 AND uss.enabled = true;`,
        [userId]
      ),

      pool.query(
        `SELECT currency, primary_goal
         FROM users
         WHERE id = $1 LIMIT 1;`,
        [userId]
      ),
    ]);

    const entries      = entriesRes.rows ?? [];
    const goals        = goalsRes.rows ?? [];
    const integrations = integrationsRes.rows ?? [];
    const signals      = signalsRes.rows ?? [];
    const currency     = userRes.rows[0]?.currency ?? "NGN";
    const primaryGoal  = userRes.rows[0]?.primary_goal ?? undefined;

    // Filter time periods
    const thisMonth  = entries.filter((e) => e.entry_date >= MONTH_START);
    const priorMonth = entries.filter((e) => e.entry_date >= PRIOR_MONTH_START && e.entry_date < MONTH_START);
    const recent30   = entries.filter((e) => e.entry_date >= THIRTY_DAYS_AGO);

    // Monthly summary
    const incomeEntries   = thisMonth.filter((e) => e.entry_type === "income");
    const expenseEntries  = thisMonth.filter((e) => e.entry_type === "expense");

    let totalIncome   = incomeEntries.reduce((s, e) => s + Number(e.amount), 0);
    let totalExpenses = Math.abs(expenseEntries.reduce((s, e) => s + Number(e.amount), 0));

    // Fallback to rolling 30 days if calendar month is empty
    const hasCalendarData = totalIncome > 0 || totalExpenses > 0;
    const targetIncomeEntries = hasCalendarData ? incomeEntries : recent30.filter((e) => e.entry_type === "income");
    const targetExpenseEntries = hasCalendarData ? expenseEntries : recent30.filter((e) => e.entry_type === "expense");

    if (!hasCalendarData) {
      totalIncome = targetIncomeEntries.reduce((s, e) => s + Number(e.amount), 0);
      totalExpenses = Math.abs(targetExpenseEntries.reduce((s, e) => s + Number(e.amount), 0));
    }

    const savingsRate = totalIncome > 0
      ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) / 100
      : 0;

    const largestCredit = targetIncomeEntries.reduce<typeof targetIncomeEntries[0] | null>(
      (max, e) => (!max || Number(e.amount) > Number(max.amount) ? e : max), null
    );
    const largestDebit = targetExpenseEntries.reduce<typeof targetExpenseEntries[0] | null>(
      (max, e) => (!max || Math.abs(Number(e.amount)) > Math.abs(Number(max.amount)) ? e : max), null
    );

    // Top categories with trend
    function categoryTotals(list: typeof entries): Record<string, number> {
      const map: Record<string, number> = {};
      list
        .filter((e) => e.entry_type === "expense" && e.category)
        .forEach((e) => {
          const cat = e.category as string;
          map[cat] = (map[cat] ?? 0) + Math.abs(Number(e.amount));
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

    // Subscriptions
    const subscriptions = entries
      .filter((e) => e.entry_type === "subscription")
      .map((e) => ({
        name:        e.description || "Subscription",
        amount:      Number(e.amount),
        frequency:   "monthly" as const,
        lastCharged: e.entry_date,
        source:      (e.source ?? "manual") as "gmail" | "upload" | "manual",
      }));

    // Recent transactions (last 30 days, max 30)
    const recentTransactions = recent30.slice(0, 30).map((e) => ({
      description: e.description || "Transaction",
      amount:      Number(e.amount),
      type:        e.entry_type as "income" | "expense",
      category:    e.category ?? "Uncategorized",
      date:        e.entry_date,
      source:      e.source ?? "manual",
    }));

    // Active goals
    const activeGoals = goals.map((g) => ({
      title:           g.title,
      targetAmount:    Number(g.target_amount),
      currentAmount:   Number(g.current_amount),
      targetDate:      g.target_date || "",
      progressPercent: Number(g.target_amount) > 0
        ? Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100)
        : 0,
    }));

    // Connected sources
    const sourceSet = new Set(entries.map((e) => e.source ?? "manual")) as Set<string>;
    const connectedSources = [...sourceSet].filter((s) =>
      ["gmail", "upload", "manual", "openbanking"].includes(s)
    ) as Array<"gmail" | "upload" | "manual" | "openbanking">;

    // Last sync timestamps
    const lastSyncAt: { gmail?: string; openbanking?: string } = {};
    for (const row of integrations) {
      if (row.provider === "gmail" && row.last_synced_at)
        lastSyncAt.gmail = row.last_synced_at;
      if (row.provider === "openbanking" && row.last_synced_at)
        lastSyncAt.openbanking = row.last_synced_at;
    }

    // Active signals
    const activeSignals = signals
      .map((s: any) => s.source_name)
      .filter(Boolean) as string[];

    // Net worth & Savings calculations
    const totalIncomeAllTime = entries.filter((e) => e.entry_type === "income").reduce((s, e) => s + Number(e.amount), 0);
    const totalExpensesAllTime = entries.filter((e) => e.entry_type === "expense").reduce((s, e) => s + Math.abs(Number(e.amount)), 0);
    const netSavingsAllTime = totalIncomeAllTime - totalExpensesAllTime;

    const totalAssets = entries.filter((e) => e.entry_type === "asset").reduce((s, e) => s + Number(e.amount), 0);
    const totalDebt = entries.filter((e) => e.entry_type === "debt").reduce((s, e) => s + Math.abs(Number(e.amount)), 0);

    const bankBalancesRecord: Record<string, { balance: number; date: string }> = {};
    const sortedEntriesForBalances = [...entries].sort((a, b) => {
      return (b.entry_date ?? "").localeCompare(a.entry_date ?? "");
    });

    for (const entry of sortedEntriesForBalances) {
      const bankKey = (entry.metadata as any)?.bank || (entry.metadata as any)?.provider || "Other";
      const balance = (entry.metadata as any)?.account_balance;
      if (typeof balance === "number" && balance > 0 && !bankBalancesRecord[bankKey]) {
        bankBalancesRecord[bankKey] = {
          balance,
          date: entry.entry_date ?? ""
        };
      }
    }

    const totalBankBalance = Object.values(bankBalancesRecord).reduce((sum, b) => sum + b.balance, 0);
    const cashSavingsVal = totalBankBalance > 0 ? totalBankBalance : Math.max(0, netSavingsAllTime);

    const netWorth = cashSavingsVal + totalAssets - totalDebt;
    const savingsBalance = cashSavingsVal + totalAssets;

    const bankBalances = Object.entries(bankBalancesRecord).map(([bank, info]) => ({
      bank,
      balance: info.balance,
      date: info.date,
    }));

    return {
      currency,
      primaryGoal,
      connectedSources,
      lastSyncAt,
      activeSignals,
      netWorth,
      savingsBalance,
      bankBalances,
      monthlySummary: {
        totalIncome,
        totalExpenses,
        savingsRate,
        largestCredit: largestCredit
          ? { amount: Number(largestCredit.amount), description: largestCredit.description || "Credit", date: largestCredit.entry_date }
          : null,
        largestDebit: largestDebit
          ? { amount: Number(largestDebit.amount), description: largestDebit.description || "Debit", date: largestDebit.entry_date }
          : null,
      },
      topCategories,
      subscriptions,
      recentTransactions,
      activeGoals,
    };
  } finally {
    await pool.end();
  }
}
