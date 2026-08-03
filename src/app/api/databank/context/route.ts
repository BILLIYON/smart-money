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

  const MONTH_START = monthStart();
  const PRIOR_MONTH_START = priorMonthStart();
  const THIRTY_DAYS_AGO = thirtyDaysAgo();

  // ── All queries in parallel ──────────────────────────────
  const [entriesRes, goalsRes, integrationsRes, userRes] = await Promise.all([
    supabase
      .from("databank_entries")
      .select("entry_type, amount, description, category, entry_date, source, metadata")
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

  const entries = entriesRes.data ?? [];
  const goals = goalsRes.data ?? [];
  const integrations = integrationsRes.data ?? [];
  const currency = userRes.data?.currency ?? "NGN";

  // ── Helpers ──────────────────────────────────────────────
  const thisMonth = entries.filter((e) => e.entry_date >= MONTH_START);
  const priorMonth = entries.filter((e) => e.entry_date >= PRIOR_MONTH_START && e.entry_date < MONTH_START);
  const recent30 = entries.filter((e) => e.entry_date >= THIRTY_DAYS_AGO);

  // ── Monthly summary ──────────────────────────────────────
  const incomeEntries = thisMonth.filter((e) => e.entry_type === "income");
  const expenseEntries = thisMonth.filter((e) => e.entry_type === "expense");

  const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = Math.abs(expenseEntries.reduce((s, e) => s + e.amount, 0));
  const savingsRate = totalIncome > 0
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

  const thisCats = categoryTotals(thisMonth);
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
      name: e.description,
      amount: e.amount,
      frequency: "monthly" as const,
      lastCharged: e.entry_date,
      source: (e.source ?? "manual") as "gmail" | "upload" | "manual",
    }));

  // ── Recent transactions (last 30 days, max 30) ───────────
  const recentTransactions = recent30.slice(0, 30).map((e) => ({
    description: e.description,
    amount: e.amount,
    type: e.entry_type as "income" | "expense",
    category: e.category ?? "Uncategorized",
    date: e.entry_date,
    source: (e as any).metadata?.created_by_ai ? "ai" : (e.source ?? "manual"),
  }));

  // ── Active goals ─────────────────────────────────────────
  const activeGoals = goals.map((g) => ({
    title: g.title,
    targetAmount: g.target_amount,
    currentAmount: g.current_amount,
    targetDate: g.target_date,
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

  // Group entries by bank/provider to find the most recent balance for each
  const bankBalances: Record<string, { balance: number; date: string }> = {};
  const sortedEntriesForBalances = [...entries].sort((a, b) => {
    return (b.entry_date ?? "").localeCompare(a.entry_date ?? "");
  });

  for (const entry of sortedEntriesForBalances) {
    const bankKey = (entry.metadata as any)?.bank || (entry.metadata as any)?.provider || "Other";
    const balance = (entry.metadata as any)?.account_balance;
    if (typeof balance === "number" && balance > 0 && !bankBalances[bankKey]) {
      bankBalances[bankKey] = {
        balance,
        date: entry.entry_date ?? ""
      };
    }
  }

  const totalBankBalance = Object.values(bankBalances).reduce((sum, b) => sum + b.balance, 0);
  const cashSavingsVal = totalBankBalance > 0 ? totalBankBalance : Math.max(0, netSavingsAllTime);

  const netWorth = cashSavingsVal + totalAssets - totalDebt;
  const savingsBalance = cashSavingsVal + totalAssets;

  const rawAssets = entries.filter((e) => e.entry_type === "asset");
  let assetsList = rawAssets.map((e) => ({
    name: e.description,
    value: Math.round(e.amount / 100),
    pct: Math.round((e.amount / Math.max(1, savingsBalance)) * 100),
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
    return Math.abs(amt) / 100;
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

  // ── Extract real bank accounts from Gmail alert balances ──
  type BankTxn = {
    description: string;
    amount: number; // Naira
    type: "income" | "expense";
    category: string;
    date: string;
    source: string;
    /** Balance after this transaction (Naira). From bank alert when available. */
    balanceAfter: number | null;
    /** true = balance came from the bank alert email; false = reconstructed */
    balanceFromAlert: boolean;
    emailSubject?: string;
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

  // Query orders entry_date desc — first explicit balance per bank is newest.
  entries.forEach((e) => {
    // Only surface cash-flow entries on bank cards (not assets/debts as txns)
    if (e.entry_type !== "income" && e.entry_type !== "expense" && e.entry_type !== "subscription") {
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
        source: e.source === "gmail" ? "Gmail Alert" : e.source === "upload" ? "Statement Upload" : "DataBank",
        lastUpdated: e.entry_date ? new Date(e.entry_date).toISOString() : "",
        hasExplicitBalance: false,
        transactions: [],
      };
    }

    const acc = bankMap[bankName];
    const entryTs = e.entry_date ? new Date(e.entry_date).getTime() : 0;
    const accTs = acc.lastUpdated ? new Date(acc.lastUpdated).getTime() : 0;
    const amountNaira = toNairaVal(e.amount);
    const txnType: "income" | "expense" =
      e.entry_type === "income" ? "income" : "expense";

    acc.transactions.push({
      description: e.description || "Transaction",
      amount: amountNaira,
      type: txnType,
      category: e.category || "Uncategorized",
      date: e.entry_date ?? "",
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
        if (e.entry_date) acc.lastUpdated = new Date(e.entry_date).toISOString();
      }
    } else if (!acc.hasExplicitBalance) {
      if (txnType === "income") acc.balance += amountNaira;
      else acc.balance -= amountNaira;
      if (e.entry_date && entryTs >= accTs) {
        acc.lastUpdated = new Date(e.entry_date).toISOString();
      }
    } else if (e.entry_date && entryTs > accTs) {
      acc.lastUpdated = new Date(e.entry_date).toISOString();
    }
  });

  /** Fill gaps in balanceAfter using alert anchors + running cash flow. */
  function reconstructBalances(txns: BankTxn[], accountBalance: number, hasExplicit: boolean): BankTxn[] {
    if (txns.length === 0) return txns;

    // Oldest → newest for forward reconstruction
    const sorted = [...txns].sort((a, b) => {
      const d = (a.date || "").localeCompare(b.date || "");
      if (d !== 0) return d;
      // Stable secondary: income before expense on same day is arbitrary; keep order
      return 0;
    });

    // Forward pass: propagate from known alert balances
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

    // If we still have leading gaps (no early anchor), work backwards from
    // the account's current balance (or the newest known balanceAfter).
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
        // balance after this txn is unknown; we know balance after a later txn.
        // Working backwards: undoing this txn from the next known balance is wrong
        // here — we need balance AFTER this txn = balance BEFORE the next one.
        // If next known is at index > i, back already holds balance after a later txn.
        // Before that later chain, after THIS txn:
        // We set balanceAfter for this txn by undoing subsequent txns... simpler:
        // balance before txn i+1 equals balance after txn i.
        // When moving back across txn i+1 that we already processed:
        // Actually when balanceAfter is null and we're going newest→oldest:
        // After setting from a known point, undoing the CURRENT txn gives prior balance,
        // which is balanceAfter of the previous (older) txn.
        t.balanceAfter = Math.round(back * 100) / 100;
        t.balanceFromAlert = false;
        // Undo this transaction to get balance before it (= after previous)
        back = t.type === "income" ? back - t.amount : back + t.amount;
      }
    } else {
      // Pure reconstruction from zero starting point
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

    // Return newest first for the UI
    return sorted.reverse();
  }

  const parsedBankAccounts = Object.values(bankMap).map(({ hasExplicitBalance, transactions, ...rest }) => ({
    ...rest,
    transactionCount: transactions.length,
    transactions: reconstructBalances(transactions, rest.balance, hasExplicitBalance),
  }));

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
