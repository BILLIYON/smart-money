import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { Pool } from "pg";

function getPool() {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money";
  const isRemote = connectionString.includes("supabase.com") || connectionString.includes("pooler") || connectionString.includes("aws-");
  return new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
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

function ninetyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().split("T")[0];
}

function safeStrDate(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val.split("T")[0];
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? "" : val.toISOString().split("T")[0];
  }
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? String(val).split("T")[0] : d.toISOString().split("T")[0];
  } catch {
    return String(val).split("T")[0];
  }
}

function safeIsoDate(d: any): string {
  if (!d) return "";
  try {
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? "" : parsed.toISOString();
  } catch {
    return "";
  }
}

function toNum(val: any): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function toNairaVal(amtKobo: any): number {
  return Math.abs(toNum(amtKobo)) / 100;
}

export async function GET(req: Request) {
  const pool = getPool();
  try {
    const authRes = await requireAuth(req);
    const userId = authRes.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const MONTH_START = monthStart();
    const PRIOR_MONTH_START = priorMonthStart();
    const THIRTY_DAYS_AGO = thirtyDaysAgo();
    const NINETY_DAYS_AGO = ninetyDaysAgo();

    // ── Direct PostgreSQL queries in parallel ────────────────
    const [entriesRes, goalsRes, integrationsRes, userRes] = await Promise.all([
      pool.query(
        `SELECT id, entry_type, amount, description, category, entry_date, source, metadata, created_at
         FROM databank_entries
         WHERE user_id = $1
         ORDER BY entry_date DESC, created_at DESC;`,
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
        `SELECT id, full_name, email, currency, plan, primary_goal, spending_exclusions
         FROM users
         WHERE id = $1 LIMIT 1;`,
        [userId]
      ),
    ]);

    const userRow = userRes.rows[0] || {};
    const rawExclusions = userRow.spending_exclusions || {};
    const excludedCategories: string[] = Array.isArray(rawExclusions.categories)
      ? rawExclusions.categories.map((c: string) => String(c).toLowerCase().trim()).filter(Boolean)
      : [];
    const excludedPlatforms: string[] = Array.isArray(rawExclusions.platforms)
      ? rawExclusions.platforms.map((p: string) => String(p).toLowerCase().trim()).filter(Boolean)
      : [];
    const excludedKeywords: string[] = Array.isArray(rawExclusions.keywords)
      ? rawExclusions.keywords.map((k: string) => String(k).toLowerCase().trim()).filter(Boolean)
      : [];
    const excludedTypes: string[] = Array.isArray(rawExclusions.types)
      ? rawExclusions.types.map((t: string) => String(t).toLowerCase().trim()).filter(Boolean)
      : [];

    const isExcluded = (e: any) => {
      const cat = String(e.category || "").toLowerCase().trim();
      const type = String(e.entry_type || "").toLowerCase().trim();
      const desc = String(e.description || "").toLowerCase();
      const bank = String(e.metadata?.bank || e.metadata?.provider || e.metadata?.platform || e.source || "").toLowerCase().trim();

      if (excludedCategories.includes(cat)) return true;
      if (excludedPlatforms.includes(bank)) return true;
      if (excludedTypes.includes(type)) return true;
      for (const kw of excludedKeywords) {
        if (kw && (desc.includes(kw) || bank.includes(kw) || cat.includes(kw))) {
          return true;
        }
      }
      return false;
    };

    const rawEntries: any[] = entriesRes.rows ?? [];
    const allEntries: any[] = rawEntries.map((e) => ({
      ...e,
      entry_date: safeStrDate(e.entry_date),
      created_at: safeIsoDate(e.created_at),
      amount: toNum(e.amount),
    }));

    const entries = allEntries.filter((e) => !isExcluded(e));

    const goals: any[] = goalsRes.rows ?? [];
    const integrations = integrationsRes.rows ?? [];
    const currency = userRes.rows[0]?.currency ?? "NGN";

    // ── Period filtering ─────────────────────────────────────
    const thisMonth = entries.filter((e) => e.entry_date >= MONTH_START);
    const priorMonth = entries.filter((e) => e.entry_date >= PRIOR_MONTH_START && e.entry_date < MONTH_START);
    const recent30 = entries.filter((e) => e.entry_date >= THIRTY_DAYS_AGO);
    const recent90 = entries.filter((e) => e.entry_date >= NINETY_DAYS_AGO);

    // ── Accurate Inflows & Outflows ──────────────────────────
    // Separate by entry_type; amount sign is strictly normalized to absolute kobo
    const incomeEntries = entries.filter((e) => e.entry_type === "income");
    const expenseEntries = entries.filter((e) => e.entry_type === "expense" || e.entry_type === "subscription");

    const thisMonthIncome = thisMonth
      .filter((e) => e.entry_type === "income")
      .reduce((s, e) => s + Math.abs(e.amount), 0);
    const thisMonthExpenses = thisMonth
      .filter((e) => e.entry_type === "expense" || e.entry_type === "subscription")
      .reduce((s, e) => s + Math.abs(e.amount), 0);

    const hasThisMonthData = thisMonthIncome > 0 || thisMonthExpenses > 0;

    // Fallback: If current calendar month is empty, use rolling 30/90 days or all-time average
    const targetIncomeEntries = hasThisMonthData
      ? thisMonth.filter((e) => e.entry_type === "income")
      : recent30.filter((e) => e.entry_type === "income").length > 0
        ? recent30.filter((e) => e.entry_type === "income")
        : incomeEntries;

    const targetExpenseEntries = hasThisMonthData
      ? thisMonth.filter((e) => e.entry_type === "expense" || e.entry_type === "subscription")
      : recent30.filter((e) => e.entry_type === "expense" || e.entry_type === "subscription").length > 0
        ? recent30.filter((e) => e.entry_type === "expense" || e.entry_type === "subscription")
        : expenseEntries;

    const totalIncome = hasThisMonthData
      ? thisMonthIncome
      : targetIncomeEntries.reduce((s, e) => s + Math.abs(e.amount), 0);

    const totalExpenses = hasThisMonthData
      ? thisMonthExpenses
      : targetExpenseEntries.reduce((s, e) => s + Math.abs(e.amount), 0);

    const savingsRate = totalIncome > 0
      ? Math.max(0, Math.min(1, Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) / 100))
      : 0;

    const largestCredit = targetIncomeEntries.reduce<typeof targetIncomeEntries[0] | null>(
      (max, e) => (!max || Math.abs(e.amount) > Math.abs(max.amount) ? e : max),
      null
    );
    const largestDebit = targetExpenseEntries.reduce<typeof targetExpenseEntries[0] | null>(
      (max, e) => (!max || Math.abs(e.amount) > Math.abs(max.amount) ? e : max),
      null
    );

    // ── Category Breakdown ───────────────────────────────────
    function categoryTotals(list: typeof entries): Record<string, number> {
      const map: Record<string, number> = {};
      list
        .filter((e) => (e.entry_type === "expense" || e.entry_type === "subscription") && e.category)
        .forEach((e) => {
          const cat = String(e.category || "Other").trim();
          map[cat] = (map[cat] ?? 0) + Math.abs(e.amount);
        });
      return map;
    }

    const thisCats = categoryTotals(thisMonth);
    const priorCats = categoryTotals(priorMonth);
    const allCats = categoryTotals(recent90.length > 0 ? recent90 : entries);

    // Use active month categories if present, otherwise use 90-day / all-time categories
    const activeCats = Object.keys(thisCats).length > 0 ? thisCats : allCats;
    const totalCategorySpend = Object.values(activeCats).reduce((s, v) => s + v, 0);

    const topCategories = Object.entries(activeCats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([category, total]) => {
        const prior = priorCats[category] ?? 0;
        const trend: "up" | "down" | "stable" =
          prior === 0
            ? "stable"
            : total > prior * 1.05
              ? "up"
              : total < prior * 0.95
                ? "down"
                : "stable";
        return {
          category,
          total, // in kobo
          percentage: totalCategorySpend > 0 ? Math.round((total / totalCategorySpend) * 100) : 0,
          trend,
        };
      });

    // ── Subscriptions ────────────────────────────────────────
    const subscriptions = entries
      .filter((e) => e.entry_type === "subscription")
      .map((e) => ({
        name: e.description || "Subscription",
        amount: Math.abs(e.amount),
        frequency: "monthly" as const,
        lastCharged: e.entry_date,
        source: (e.source ?? "manual") as "gmail" | "upload" | "manual",
      }));

    // ── Recent transactions (most recent 30) ─────────────────
    const recentTransactions = entries.slice(0, 30).map((e) => ({
      id: e.id,
      description: e.description || "Transaction",
      amount: Math.abs(e.amount), // in kobo
      type: e.entry_type === "income" ? ("income" as const) : ("expense" as const),
      category: e.category ?? "Uncategorized",
      date: e.entry_date,
      source: (e as any).metadata?.created_by_ai ? "ai" : (e.source ?? "manual"),
    }));

    // ── Active goals ─────────────────────────────────────────
    const activeGoals = goals.map((g) => ({
      title: g.title,
      targetAmount: toNum(g.target_amount),
      currentAmount: toNum(g.current_amount),
      targetDate: g.target_date || "",
      progressPercent:
        toNum(g.target_amount) > 0
          ? Math.min(100, Math.round((toNum(g.current_amount) / toNum(g.target_amount)) * 100))
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
    const totalIncomeAllTime = incomeEntries.reduce((s, e) => s + Math.abs(e.amount), 0);
    const totalExpensesAllTime = expenseEntries.reduce((s, e) => s + Math.abs(e.amount), 0);
    const netSavingsAllTime = totalIncomeAllTime - totalExpensesAllTime;

    const totalAssets = entries
      .filter((e) => e.entry_type === "asset")
      .reduce((s, e) => s + Math.abs(e.amount), 0);
    const totalDebt = entries
      .filter((e) => e.entry_type === "debt")
      .reduce((s, e) => s + Math.abs(e.amount), 0);

    // Group entries by bank to find the latest alert balance for each
    const bankBalances: Record<string, { balance: number; date: string; createdAt: string }> = {};
    const sortedEntriesForBalances = [...entries].sort((a, b) => {
      const d = (b.entry_date ?? "").localeCompare(a.entry_date ?? "");
      if (d !== 0) return d;
      return (b.created_at ?? "").localeCompare(a.created_at ?? "");
    });

    for (const entry of sortedEntriesForBalances) {
      const meta = (entry.metadata as any) || {};
      const bankKey = meta.bank || meta.provider || "Other";
      const balance = meta.account_balance;
      if (typeof balance === "number" && balance > 0 && !bankBalances[bankKey]) {
        bankBalances[bankKey] = {
          balance, // in kobo
          date: entry.entry_date ?? "",
          createdAt: entry.created_at ?? "",
        };
      }
    }

    const totalBankBalance = Object.values(bankBalances).reduce((sum, b) => sum + b.balance, 0);
    const cashSavingsVal = totalBankBalance > 0 ? totalBankBalance : Math.max(0, netSavingsAllTime);

    const netWorth = cashSavingsVal + totalAssets - totalDebt;
    const savingsBalance = cashSavingsVal + totalAssets;

    const rawAssets = entries.filter((e) => e.entry_type === "asset");
    let assetsList = rawAssets.map((e) => ({
      name: e.description || "Asset",
      value: Math.round(Math.abs(e.amount) / 100),
      pct: Math.round((Math.abs(e.amount) / Math.max(1, savingsBalance)) * 100),
    }));

    if (cashSavingsVal > 0) {
      if (totalBankBalance > 0) {
        for (const [bank, info] of Object.entries(bankBalances)) {
          assetsList.unshift({
            name: `${bank} Account`,
            value: Math.round(info.balance / 100),
            pct: Math.round((info.balance / Math.max(1, savingsBalance)) * 100),
          });
        }
      } else {
        assetsList.unshift({
          name: "Cash Savings",
          value: Math.round(cashSavingsVal / 100),
          pct: Math.round((cashSavingsVal / Math.max(1, savingsBalance)) * 100),
        });
      }
    } else if (assetsList.length === 0 && savingsBalance > 0) {
      assetsList = [
        {
          name: "Cash Savings",
          value: Math.round(savingsBalance / 100),
          pct: 100,
        },
      ];
    }

    const rawLiabilities = entries.filter((e) => e.entry_type === "debt");
    const liabilitiesList = rawLiabilities.map((e) => ({
      name: e.description || "Liability",
      value: Math.round(Math.abs(e.amount) / 100),
      pct: Math.round((Math.abs(e.amount) / Math.max(1, totalDebt)) * 100),
    }));

    // ── Last 12 months time-series data ───────────────────────
    const monthlyData: Record<
      string,
      { month: string; key: string; income: number; spent: number; saved: number; networth: number }
    > = {};
    const monthsList: { key: string; label: string }[] = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short" });
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthsList.push({ key, label });
      monthlyData[key] = {
        month: label,
        key,
        income: 0,
        spent: 0,
        saved: 0,
        networth: 0,
      };
    }

    // Sort entries chronologically to compute running monthly totals
    const sortedEntries = [...entries].sort((a, b) => {
      const d = (a.entry_date ?? "").localeCompare(b.entry_date ?? "");
      if (d !== 0) return d;
      return (a.created_at ?? "").localeCompare(b.created_at ?? "");
    });

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
        if (monthlyData[yearMonth]) {
          monthlyData[yearMonth].income += amtNaira / 1000;
        }
      } else if (e.entry_type === "expense" || e.entry_type === "subscription") {
        runningExpense += amtNaira * 100;
        if (monthlyData[yearMonth]) {
          monthlyData[yearMonth].spent += amtNaira / 1000;
        }
      } else if (e.entry_type === "asset") {
        runningAssets += amtNaira * 100;
      } else if (e.entry_type === "debt") {
        runningDebt += amtNaira * 100;
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

    // ── Monthly category trends ───────────────────────────────
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split("T")[0];

    const sixMonthEntries = entries.filter(
      (e) =>
        e.entry_date &&
        e.entry_date >= sixMonthsAgoStr &&
        (e.entry_type === "expense" || e.entry_type === "subscription")
    );
    const uniqueCategories = Array.from(
      new Set(sixMonthEntries.map((e) => e.category).filter(Boolean))
    ) as string[];

    const trendMonths = monthsList.slice(-6); // last 6 months
    const catTrendRows = uniqueCategories.map((cat) => {
      const vals = trendMonths.map((m) => {
        const monthSpent = entries
          .filter(
            (e) =>
              (e.entry_type === "expense" || e.entry_type === "subscription") &&
              e.category === cat &&
              e.entry_date &&
              e.entry_date.substring(0, 7) === m.key
          )
          .reduce((s, e) => s + Math.abs(e.amount), 0);
        return Math.round((monthSpent / 100000) * 10) / 10; // in thousands of Naira
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
      else if (catLower.includes("utility") || catLower.includes("power") || catLower.includes("electricity"))
        icon = "⚡";
      else if (catLower.includes("salary") || catLower.includes("income")) icon = "💰";

      return {
        cat: `${icon} ${cat}`,
        vals,
        trend: trendText,
        trendDir: trendDir as "up" | "down" | "flat",
      };
    });

    // ── Extract real bank accounts from Gmail alert balances ──
    type BankTxn = {
      description: string;
      amount: number; // Naira
      type: "income" | "expense";
      category: string;
      date: string;
      source: string;
      balanceAfter: number | null;
      balanceFromAlert: boolean;
      emailSubject?: string;
      createdAt?: string;
    };

    type BankAcc = {
      bankName: string;
      accountNumber: string;
      balance: number;
      source: string;
      lastUpdated: string;
      hasExplicitBalance: boolean;
      transactions: BankTxn[];
    };
    const bankMap: Record<string, BankAcc> = {};

    function resolveBankName(e: (typeof entries)[number]): string {
      const meta = (e.metadata ?? {}) as Record<string, unknown>;
      if (typeof meta.bank === "string" && meta.bank.trim()) return meta.bank.trim();

      const provider = typeof meta.provider === "string" ? meta.provider.toLowerCase() : "";
      const providerLabels: Record<string, string> = {
        opay: "OPay",
        kuda: "Kuda Bank",
        palmpay: "PalmPay",
        moniepoint: "Moniepoint",
        gtbank: "GTBank",
        zenith: "Zenith Bank",
        access: "Access Bank",
        uba: "UBA",
        firstbank: "First Bank",
        stanbic: "Stanbic IBTC",
        fidelity: "Fidelity Bank",
        union: "Union Bank",
        wema: "Wema Bank",
        providus: "Providus Bank",
        carbon: "Carbon",
        flutterwave: "Flutterwave",
        paystack: "Paystack",
      };
      if (provider && providerLabels[provider]) return providerLabels[provider];

      const haystack = [
        e.description,
        e.category,
        typeof meta.email_from === "string" ? meta.email_from : "",
        typeof meta.email_subject === "string" ? meta.email_subject : "",
      ]
        .join(" ")
        .toLowerCase();

      if (/gtbank|gtb|guaranty\s*trust/.test(haystack)) return "GTBank";
      if (/zenith/.test(haystack)) return "Zenith Bank";
      if (/kuda/.test(haystack)) return "Kuda Bank";
      if (/access\s*bank|accessbank/.test(haystack)) return "Access Bank";
      if (/first\s*bank|firstbank/.test(haystack)) return "First Bank";
      if (/\buba\b|united\s*bank\s*for\s*africa/.test(haystack)) return "UBA";
      if (/stanbic/.test(haystack)) return "Stanbic IBTC";
      if (/\bopay(?:web)?\b/.test(haystack)) return "OPay";
      if (/palmpay/.test(haystack)) return "PalmPay";
      if (/moniepoint/.test(haystack)) return "Moniepoint";
      if (/fidelity/.test(haystack)) return "Fidelity Bank";
      if (/wema/.test(haystack)) return "Wema Bank";
      if (e.source === "gmail") return "Gmail Synced Account";
      if (e.source === "upload") return "Uploaded Statement Account";
      return "";
    }

    entries.forEach((e) => {
      if (
        e.entry_type !== "income" &&
        e.entry_type !== "expense" &&
        e.entry_type !== "subscription"
      ) {
        return;
      }

      const bankName = resolveBankName(e);
      if (!bankName) return;

      const meta = (e.metadata ?? {}) as Record<string, unknown>;
      const metaBalanceRaw = meta.account_balance;
      const metaBalance =
        typeof metaBalanceRaw === "number"
          ? metaBalanceRaw
          : typeof metaBalanceRaw === "string" && metaBalanceRaw.trim()
            ? Number(metaBalanceRaw)
            : null;
      const hasAlertBalance =
        metaBalance !== null && !Number.isNaN(metaBalance) && metaBalance > 0;

      if (!bankMap[bankName]) {
        bankMap[bankName] = {
          bankName,
          accountNumber: "•••• Main",
          balance: 0,
          source:
            e.source === "gmail"
              ? "Gmail Alert"
              : e.source === "upload"
                ? "Statement Upload"
                : "DataBank",
          lastUpdated: safeIsoDate(e.created_at || e.entry_date),
          hasExplicitBalance: false,
          transactions: [],
        };
      }

      const acc = bankMap[bankName];
      const entryTs = new Date(e.created_at || e.entry_date || 0).getTime();
      const accTs = new Date(acc.lastUpdated || 0).getTime();
      const amountNaira = toNairaVal(e.amount);
      const txnType: "income" | "expense" =
        e.entry_type === "income" ? "income" : "expense";

      acc.transactions.push({
        description: e.description || "Transaction",
        amount: amountNaira,
        type: txnType,
        category: e.category || "Uncategorized",
        date: e.entry_date ?? "",
        createdAt: e.created_at,
        source: e.source ?? "manual",
        balanceAfter: hasAlertBalance ? toNairaVal(metaBalance as number) : null,
        balanceFromAlert: hasAlertBalance,
        emailSubject:
          typeof meta.email_subject === "string" ? meta.email_subject : undefined,
      });

      if (hasAlertBalance) {
        if (!acc.hasExplicitBalance || entryTs >= accTs) {
          acc.balance = toNairaVal(metaBalance as number);
          acc.hasExplicitBalance = true;
          acc.lastUpdated = safeIsoDate(e.created_at || e.entry_date);
        }
      } else if (!acc.hasExplicitBalance) {
        if (txnType === "income") acc.balance += amountNaira;
        else acc.balance -= amountNaira;
        if (entryTs >= accTs) {
          acc.lastUpdated = safeIsoDate(e.created_at || e.entry_date);
        }
      }
    });

    function reconstructBalances(
      txns: BankTxn[],
      accountBalance: number,
      hasExplicit: boolean
    ): BankTxn[] {
      if (txns.length === 0) return txns;

      const sorted = [...txns].sort((a, b) => {
        const d = (a.date || "").localeCompare(b.date || "");
        if (d !== 0) return d;
        return (a.createdAt || "").localeCompare(b.createdAt || "");
      });

      let running: number | null = null;
      for (const t of sorted) {
        if (t.balanceFromAlert && t.balanceAfter !== null) {
          running = t.balanceAfter;
          continue;
        }
        if (running !== null) {
          running = t.type === "income" ? running + t.amount : running - t.amount;
          t.balanceAfter = Math.round(running * 100) / 100;
          t.balanceFromAlert = false;
        }
      }

      const newestKnown =
        [...sorted].reverse().find((t) => t.balanceAfter !== null)?.balanceAfter ??
        (hasExplicit ? accountBalance : null);

      if (newestKnown !== null) {
        let back = newestKnown;
        for (let i = sorted.length - 1; i >= 0; i--) {
          const t = sorted[i];
          if (t.balanceAfter !== null) {
            back = t.balanceAfter;
            continue;
          }
          t.balanceAfter = Math.round(back * 100) / 100;
          t.balanceFromAlert = false;
          back = t.type === "income" ? back - t.amount : back + t.amount;
        }
      } else {
        let r = 0;
        for (const t of sorted) {
          r = t.type === "income" ? r + t.amount : r - t.amount;
          if (t.balanceAfter === null) {
            t.balanceAfter = Math.round(r * 100) / 100;
            t.balanceFromAlert = false;
          } else {
            r = t.balanceAfter;
          }
        }
      }

      return sorted.reverse();
    }

    const parsedBankAccounts = Object.values(bankMap).map(
      ({ hasExplicitBalance, transactions, ...rest }) => ({
        ...rest,
        transactionCount: transactions.length,
        transactions: reconstructBalances(transactions, rest.balance, hasExplicitBalance),
      })
    );

    // ── Deep Institutional Financial Intelligence ──────────
    const userProfile = {
      id: userId,
      fullName: userRow.full_name || (userRow.email ? userRow.email.split("@")[0] : "User"),
      email: userRow.email || "",
      currency,
      plan: userRow.plan || "free",
      operatingHub: parsedBankAccounts.length > 0 ? parsedBankAccounts[0].bankName : "Primary Account",
      accountNumber: "•••• Main",
    };

    // 1. Analyze Inflows & Inflow Sources
    let salaryTotal = 0;
    let salaryCount = 0;
    let refundTotal = 0;
    let refundCount = 0;
    let merchantTotal = 0;
    let merchantCount = 0;
    let otherIncomeTotal = 0;
    let otherIncomeCount = 0;

    const salaryEntries = incomeEntries.filter((e) => {
      const desc = String(e.description || "").toLowerCase();
      const cat = String(e.category || "").toLowerCase();
      return cat.includes("salary") || desc.includes("jobberman");
    });

    incomeEntries.forEach((e) => {
      const desc = String(e.description || "").toLowerCase();
      const cat = String(e.category || "").toLowerCase();
      const amt = Math.abs(e.amount) / 100;
      if (cat.includes("salary") || desc.includes("jobberman")) {
        salaryTotal += amt;
        salaryCount++;
      } else if (cat.includes("refund") || desc.includes("taxtech") || desc.includes("paystack")) {
        refundTotal += amt;
        refundCount++;
      } else if (desc.includes("demerge") || desc.includes("merchant")) {
        merchantTotal += amt;
        merchantCount++;
      } else {
        otherIncomeTotal += amt;
        otherIncomeCount++;
      }
    });

    const totalInflowNaira = salaryTotal + refundTotal + merchantTotal + otherIncomeTotal;
    const sortedSalary = [...salaryEntries].sort((a, b) => (b.entry_date ?? "").localeCompare(a.entry_date ?? ""));
    const latestSalaryAmt = sortedSalary[0] ? Math.abs(sortedSalary[0].amount) / 100 : (salaryTotal > 0 ? salaryTotal : 0);
    const priorSalaryAmt = sortedSalary[1] ? Math.abs(sortedSalary[1].amount) / 100 : (sortedSalary.length === 1 ? latestSalaryAmt : 0);
    const salaryGrowthPct = priorSalaryAmt > 0 ? Math.round(((latestSalaryAmt - priorSalaryAmt) / priorSalaryAmt) * 100) : 0;

    // Detect employer name from salary entry description
    let detectedEmployer = "Employer / Payroll";
    if (sortedSalary[0]?.description) {
      const desc = sortedSalary[0].description;
      if (/jobberman/i.test(desc)) detectedEmployer = "Jobberman Limited";
      else {
        const m = desc.match(/(?:from|by|salary\s+from)\s+([A-Za-z0-9\s.,-]+?)(?:\s+via|\s+to|\s+bank|$)/i);
        if (m && m[1]) detectedEmployer = m[1].trim();
        else detectedEmployer = desc.slice(0, 30).trim();
      }
    }

    // Dynamic retention velocity: calculate outflows within 7, 14, 30 days of latest salary
    let retentionDay7 = 45;
    let retentionDay14 = 30;
    let retentionDay30 = 15;
    if (sortedSalary[0]?.entry_date && latestSalaryAmt > 0) {
      const salDate = new Date(sortedSalary[0].entry_date).getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      const outflow7 = expenseEntries
        .filter((e) => {
          if (!e.entry_date) return false;
          const t = new Date(e.entry_date).getTime();
          return t >= salDate && t <= salDate + 7 * dayMs;
        })
        .reduce((s, e) => s + Math.abs(e.amount) / 100, 0);

      const outflow14 = expenseEntries
        .filter((e) => {
          if (!e.entry_date) return false;
          const t = new Date(e.entry_date).getTime();
          return t >= salDate && t <= salDate + 14 * dayMs;
        })
        .reduce((s, e) => s + Math.abs(e.amount) / 100, 0);

      const outflow30 = expenseEntries
        .filter((e) => {
          if (!e.entry_date) return false;
          const t = new Date(e.entry_date).getTime();
          return t >= salDate && t <= salDate + 30 * dayMs;
        })
        .reduce((s, e) => s + Math.abs(e.amount) / 100, 0);

      retentionDay7 = Math.max(5, Math.min(100, Math.round(((latestSalaryAmt - outflow7) / latestSalaryAmt) * 100)));
      retentionDay14 = Math.max(3, Math.min(100, Math.round(((latestSalaryAmt - outflow14) / latestSalaryAmt) * 100)));
      retentionDay30 = Math.max(0, Math.min(100, Math.round(((latestSalaryAmt - outflow30) / latestSalaryAmt) * 100)));
    }

    // Dynamic Inflow Channels
    const dynamicInflowChannels = [];
    if (salaryTotal > 0) {
      dynamicInflowChannels.push({
        name: `${detectedEmployer} (Salary)`,
        total: Math.round(salaryTotal * 100) / 100,
        count: salaryCount,
        pct: totalInflowNaira > 0 ? Math.round((salaryTotal / totalInflowNaira) * 100) : 0,
        icon: "💼",
        description: "Regular monthly payroll credits via operating hub",
      });
    }
    if (refundTotal > 0) {
      dynamicInflowChannels.push({
        name: "Taxtech & Paystack (Reversals & Refunds)",
        total: Math.round(refundTotal * 100) / 100,
        count: refundCount,
        pct: totalInflowNaira > 0 ? Math.round((refundTotal / totalInflowNaira) * 100) : 0,
        icon: "🔄",
        description: "Debit reversals and chargeback settlements",
      });
    }
    if (merchantTotal > 0) {
      dynamicInflowChannels.push({
        name: "Merchant Settlements & Payouts",
        total: Math.round(merchantTotal * 100) / 100,
        count: merchantCount,
        pct: totalInflowNaira > 0 ? Math.round((merchantTotal / totalInflowNaira) * 100) : 0,
        icon: "📦",
        description: "Order fulfillment and merchant payouts",
      });
    }
    if (otherIncomeTotal > 0) {
      dynamicInflowChannels.push({
        name: "Direct P2P Credits & Inbound Transfers",
        total: Math.round(otherIncomeTotal * 100) / 100,
        count: otherIncomeCount,
        pct: totalInflowNaira > 0 ? Math.round((otherIncomeTotal / totalInflowNaira) * 100) : 0,
        icon: "⚡",
        description: "Direct bank credits and peer transfers",
      });
    }

    // 2. Analyze Transfer Outflows, P2P Beneficiaries & POS Agents
    const recipientsMap: Record<string, { total: number; count: number; lastDate: string; isPos: boolean; relationship: string }> = {};
    const posAgentsMap: Record<string, { total: number; count: number; lastDate: string }> = {};
    let totalTransferOutflows = 0;
    let totalPosOutflows = 0;
    let totalInternalSweeps = 0;
    let essentialSpendTotal = 0;

    expenseEntries.forEach((e) => {
      const desc = String(e.description || "");
      const cat = String(e.category || "").toLowerCase();
      const amt = Math.abs(e.amount) / 100;
      const date = e.entry_date || "";

      // Essential spending detection
      if (
        cat.includes("food") ||
        cat.includes("grocer") ||
        cat.includes("util") ||
        cat.includes("power") ||
        cat.includes("electr") ||
        cat.includes("health") ||
        cat.includes("transp") ||
        cat.includes("fuel")
      ) {
        essentialSpendTotal += amt;
      }

      if (cat.includes("transfer") || desc.toLowerCase().includes("transfer to")) {
        totalTransferOutflows += amt;
        const match = desc.match(/Transfer to\s+([^,]+?)(?:\s+Bank|\s+Merchant|$)/i);
        let rawName = match ? match[1].trim() : desc.replace(/^Transfer to\s*/i, "").trim();
        if (!rawName) rawName = "Interbank Recipient";

        if (rawName.toUpperCase().includes("POS") || desc.toUpperCase().includes("POS")) {
          const cleanPos = rawName.replace(/^POS\s+Transfer-?\s*/i, "").replace(/Bank$/i, "").trim();
          posAgentsMap[cleanPos] = {
            total: (posAgentsMap[cleanPos]?.total || 0) + amt,
            count: (posAgentsMap[cleanPos]?.count || 0) + 1,
            lastDate: date > (posAgentsMap[cleanPos]?.lastDate || "") ? date : posAgentsMap[cleanPos]?.lastDate || date,
          };
          totalPosOutflows += amt;
        } else {
          const cleanName = rawName.replace(/Bank$/i, "").trim();
          let relationship = "P2P Transfer";
          const cleanNameLower = cleanName.toLowerCase();
          const userFirstName = userRow.full_name ? userRow.full_name.toLowerCase().split(" ")[0] : "";
          const userLastName = userRow.full_name ? userRow.full_name.toLowerCase().split(" ").pop() : "";
          const userEmailPrefix = userRow.email ? userRow.email.split("@")[0].toLowerCase() : "";

          const isSweep =
            (userFirstName.length > 2 && cleanNameLower.includes(userFirstName)) ||
            (userLastName && userLastName.length > 2 && cleanNameLower.includes(userLastName)) ||
            (userEmailPrefix.length > 2 && cleanNameLower.includes(userEmailPrefix));

          if (isSweep) {
            relationship = "Internal Liquidity Sweep";
            totalInternalSweeps += amt;
          } else if (cleanName.toLowerCase().includes("remita") || cleanName.toLowerCase().includes("paystack")) {
            relationship = "Digital Checkout Gateway";
          }
          recipientsMap[cleanName] = {
            total: (recipientsMap[cleanName]?.total || 0) + amt,
            count: (recipientsMap[cleanName]?.count || 0) + 1,
            lastDate: date > (recipientsMap[cleanName]?.lastDate || "") ? date : recipientsMap[cleanName]?.lastDate || date,
            isPos: false,
            relationship,
          };
        }
      }
    });

    const topBeneficiaries = Object.entries(recipientsMap)
      .map(([name, data]) => ({
        name,
        total: Math.round(data.total * 100) / 100,
        count: data.count,
        lastDate: data.lastDate,
        relationship: data.relationship,
        pctOfTransfers: totalTransferOutflows > 0 ? Math.round((data.total / totalTransferOutflows) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const posAgentsList = Object.entries(posAgentsMap)
      .map(([name, data]) => ({
        agentName: name,
        total: Math.round(data.total * 100) / 100,
        count: data.count,
        lastDate: data.lastDate,
        estimatedFee: data.count * 150, // standard ₦150 agent fee per POS cashout
      }))
      .sort((a, b) => b.total - a.total);

    // 3. Liquid Runway & Burn Calculations
    const activeMonthKeys = new Set(
      entries.map((e) => (e.entry_date ? e.entry_date.substring(0, 7) : null)).filter(Boolean)
    );
    const numActiveMonths = Math.max(1, activeMonthKeys.size);
    const totalExpenseAllTimeNaira = totalExpensesAllTime / 100;
    const avgMonthlyBurnNaira = Math.round(totalExpenseAllTimeNaira / numActiveMonths) || 1;
    const dailyBurnNaira = Math.max(1, Math.round(avgMonthlyBurnNaira / 30.4));
    const liquidReservesNaira = Math.round((cashSavingsVal > 0 ? cashSavingsVal : savingsBalance) / 100);
    const runwayDays = dailyBurnNaira > 0 ? Math.round(liquidReservesNaira / dailyBurnNaira) : 0;
    const runwayMonths = avgMonthlyBurnNaira > 0 ? Math.round((liquidReservesNaira / avgMonthlyBurnNaira) * 10) / 10 : 0;

    const totalPosTxns = posAgentsList.reduce((s, a) => s + a.count, 0);
    const totalPosFees = posAgentsList.reduce((s, a) => s + a.estimatedFee, 0);

    // Multi-horizon predictive calculations
    const monthlyInflowRunrate = Math.round(totalInflowNaira / numActiveMonths);
    const net30 = monthlyInflowRunrate - avgMonthlyBurnNaira;

    const totalTrackedExpenses = Math.max(1, totalExpenseAllTimeNaira);
    const pureP2P = Math.max(0, totalTransferOutflows - totalInternalSweeps - totalPosOutflows);

    // 4. Institutional Metrics Aggregate Object
    const institutionalMetrics = {
      liquidRunway: {
        totalLiquidNaira: liquidReservesNaira,
        monthlyBurnNaira: avgMonthlyBurnNaira,
        dailyBurnNaira,
        runwayDays,
        runwayMonths,
        status: runwayMonths >= 24 ? "Exceptional (2+ Years Capital Runway)" : runwayMonths >= 12 ? "Strong (1+ Year Capital Runway)" : runwayMonths >= 6 ? "Adequate Capital Runway" : "Active Watch",
      },
      salaryIntelligence: {
        employer: detectedEmployer,
        latestSalary: latestSalaryAmt,
        latestDate: sortedSalary[0]?.entry_date || "",
        priorSalary: priorSalaryAmt,
        priorDate: sortedSalary[1]?.entry_date || "",
        salaryGrowthPct: salaryGrowthPct !== 0 ? `${salaryGrowthPct > 0 ? "+" : ""}${salaryGrowthPct}%` : "0%",
        cadence: "Month-End",
        predictabilityScore: salaryCount >= 2 ? 98 : salaryCount === 1 ? 85 : 50,
        retentionVelocity: {
          day7: retentionDay7,
          day14: retentionDay14,
          day30: retentionDay30,
        },
        summary: salaryCount > 0
          ? `Verified recurring payroll credits from ${detectedEmployer}. Day-7 retention rate is ${retentionDay7}%, indicating rapid initial liquidity redistribution following deposit.`
          : "No payroll salary entries detected in current window.",
      },
      inflowChannels: dynamicInflowChannels,
      topBeneficiaries,
      posAgentIntelligence: {
        totalPosVolume: Math.round(totalPosOutflows * 100) / 100,
        totalTransactions: totalPosTxns,
        estimatedSurchargeTax: totalPosFees,
        topAgents: posAgentsList,
        leakageTip: totalPosFees > 0
          ? `Physical cash-outs through POS terminals incurred ~₦${totalPosFees.toLocaleString()} in surcharge fees. Using direct digital transfers saves 100% of these terminal charges.`
          : "No physical POS cash-out surcharges detected in transaction history.",
      },
      multiHorizonProjections: {
        d30: {
          projectedIncome: monthlyInflowRunrate,
          projectedExpense: avgMonthlyBurnNaira,
          netAccumulation: net30,
          verdict: net30 >= 0
            ? `Positive monthly accumulation (₦${net30.toLocaleString()}) supported by regular inbound cashflow.`
            : `Projected monthly deficit of ₦${Math.abs(net30).toLocaleString()} based on trailing burn rate.`,
        },
        d60: {
          projectedIncome: monthlyInflowRunrate * 2,
          projectedExpense: avgMonthlyBurnNaira * 2,
          netAccumulation: net30 * 2,
          verdict: net30 >= 0
            ? `Two-month surplus trajectory of ₦${(net30 * 2).toLocaleString()} strengthens liquid reserves.`
            : `Trailing burn indicates ₦${Math.abs(net30 * 2).toLocaleString()} net outflow across 60 days.`,
        },
        d90: {
          projectedIncome: monthlyInflowRunrate * 3,
          projectedExpense: avgMonthlyBurnNaira * 3,
          netAccumulation: net30 * 3,
          verdict: net30 >= 0
            ? `Quarterly capital expansion estimated at +₦${(net30 * 3).toLocaleString()}.`
            : `90-day capital depletion projected at -₦${Math.abs(net30 * 3).toLocaleString()}.`,
        },
      },
      discretionaryVsEssential: {
        essential: {
          amount: Math.round(essentialSpendTotal),
          pct: Math.round((essentialSpendTotal / totalTrackedExpenses) * 100),
          label: "Living, Food & Utilities",
        },
        p2pTransfers: {
          amount: Math.round(pureP2P),
          pct: Math.round((pureP2P / totalTrackedExpenses) * 100),
          label: "P2P Transfers & Counterparties",
        },
        internalSweeps: {
          amount: Math.round(totalInternalSweeps),
          pct: Math.round((totalInternalSweeps / totalTrackedExpenses) * 100),
          label: "Internal Reserve Sweeps",
        },
        posCashouts: {
          amount: Math.round(totalPosOutflows),
          pct: Math.round((totalPosOutflows / totalTrackedExpenses) * 100),
          label: "Physical POS Cash-Outs",
        },
      },
    };

    return NextResponse.json({
      currency,
      userProfile,
      institutionalMetrics,
      netWorth,
      savingsBalance,
      parsedBankAccounts,
      chartData,
      catTrendRows,
      entries: entries.map((e) => ({
        id: e.id,
        description: e.description || "Transaction",
        amount: Math.abs(e.amount),
        entry_type: e.entry_type,
        category: e.category || "Uncategorized",
        entry_date: e.entry_date,
        source: e.source,
      })),
      monthlySummary: {
        totalIncome,
        totalExpenses,
        savingsRate,
        largestCredit: largestCredit
          ? {
              amount: Math.abs(largestCredit.amount),
              description: largestCredit.description,
              date: largestCredit.entry_date,
            }
          : null,
        largestDebit: largestDebit
          ? {
              amount: Math.abs(largestDebit.amount),
              description: largestDebit.description,
              date: largestDebit.entry_date,
            }
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
      exclusions: {
        categories: rawExclusions.categories || [],
        keywords: rawExclusions.keywords || [],
        types: rawExclusions.types || [],
        totalExcludedCount: allEntries.length - entries.length,
      },
    });
  } catch (err: any) {
    console.error("[databank/context] Error generating context:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load databank context" },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}
