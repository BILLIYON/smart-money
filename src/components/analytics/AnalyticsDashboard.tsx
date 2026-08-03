"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useChatStore } from "@/store/chatStore";
import { useDatabankStore } from "@/store/databankStore";

// Demo data removed

const TIMEFRAMES = ["1M", "3M", "6M", "12M"] as const;

// Demo trend data removed

// ── Small helpers ────────────────────────────────────────
function Kpi({ label, value, delta, deltaDir }: { label: string; value: string; delta: string; deltaDir?: "up" | "down" | "neutral" }) {
  const color = deltaDir === "up" ? "var(--green2)" : deltaDir === "down" ? "#E24B4A" : "var(--muted)";
  return (
    <div className="rounded-[14px] p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-1" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="text-[22px] font-semibold mb-1" style={{ color: "var(--text)", fontFamily: "var(--font-dm-serif)" }}>{value}</div>
      <div className="text-[11px] font-medium" style={{ color }}>{delta}</div>
    </div>
  );
}

function ChartCard({
  title, sub, action, onAction, children,
}: {
  title: string;
  sub?: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>{title}</div>
          {sub && <div className="text-[11px] mt-[2px]" style={{ color: "var(--muted)" }}>{sub}</div>}
        </div>
        {action && (
          onAction
            ? (
              <button
                onClick={onAction}
                className="text-[11px] font-medium cursor-pointer transition-opacity duration-150 hover:opacity-70"
                style={{ color: "var(--green)", background: "none", border: "none", padding: 0 }}
              >
                {action}
              </button>
            ) : (
              <span className="text-[11px] font-medium" style={{ color: "var(--green)" }}>{action}</span>
            )
        )}
      </div>
      {children}
    </div>
  );
}

// Health score SVG ring
function HealthRing({ score }: { score: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="9" />
      <circle cx="45" cy="45" r={r} fill="none" stroke="var(--green)" strokeWidth="9"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset="0"
        transform="rotate(-90 45 45)" strokeLinecap="round" />
    </svg>
  );
}

// Small ring for budget metrics
function SmallRing({ pct, color }: { pct: number; color: string }) {
  const r = 23;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="58" height="58" viewBox="0 0 58 58">
      <circle cx="29" cy="29" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
      <circle cx="29" cy="29" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset="0"
        transform="rotate(-90 29 29)" strokeLinecap="round" />
      <text x="29" y="34" textAnchor="middle" fontSize="11" fontWeight="700" fill={color} fontFamily="sans-serif">{pct}%</text>
    </svg>
  );
}

// ── Bank Balances Card ──────────────────────────────────────
function BankBalancesCard({ context }: { context: any }) {
  const [filter, setFilter] = useState<"all" | "gmail">("all");
  const [syncing, setSyncing] = useState(false);

  const rawAccounts: any[] = context?.parsedBankAccounts ?? [];
  const realBalance = context?.savingsBalance ? context.savingsBalance / 100 : 0;

  let accounts: any[] = [];
  if (rawAccounts.length > 0) {
    accounts = rawAccounts.map((acc, i) => {
      const colors = ["#FF6600", "#E21B23", "#8B5CF6", "#0284C7", "#10B981"];
      const bgColors = ["rgba(255, 102, 0, 0.12)", "rgba(226, 27, 35, 0.12)", "rgba(139, 92, 246, 0.12)", "rgba(2, 132, 199, 0.12)", "rgba(16, 185, 129, 0.12)"];
      const logos = ["🏦", "🔴", "🟣", "💎", "💰"];
      return {
        id: `acc-${i}`,
        bankName: acc.bankName,
        accountType: acc.accountType || "Savings / Wallet Account",
        accountNumber: acc.accountNumber || "•••• Main",
        balance: acc.balance,
        color: colors[i % colors.length],
        bgColor: bgColors[i % bgColors.length],
        logo: logos[i % logos.length],
        source: acc.source || "Gmail Alert",
        lastUpdated: acc.lastUpdated || "Recent",
      };
    });
  } else if (realBalance > 0) {
    accounts = [
      {
        id: "main-wallet",
        bankName: "Primary Bank & Wallet Account",
        accountType: "Connected DataBank Balance",
        accountNumber: "•••• Main",
        balance: realBalance,
        color: "var(--green)",
        bgColor: "rgba(0, 196, 140, 0.12)",
        logo: "🏦",
        source: "DataBank",
        lastUpdated: "Today",
      },
    ];
  }

  const totalLiquid = accounts.reduce((acc, a) => acc + a.balance, 0);

  const filteredAccounts = accounts.filter((a) => {
    if (filter === "gmail") return a.source.includes("Gmail");
    return true;
  });

  const [syncProgress, setSyncProgress] = useState<number | null>(null);

  const handleSyncGmail = async () => {
    setSyncing(true);
    setSyncProgress(0);
    try {
      const res = await fetch("/api/databank/gmail/sync", { method: "POST" });
      if (!res.body) {
        throw new Error("No response stream");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (typeof parsed.progress === "number") {
              setSyncProgress(parsed.progress);
            }
          } catch (e) {
            console.error("Failed to parse progress line:", e);
          }
        }
      }
      await useDatabankStore.getState().loadContext();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  return (
    <div className="rounded-[16px] p-5 flex flex-col gap-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      {/* Title & Badge */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[15px] font-semibold flex items-center gap-2" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
            🏦 Bank Accounts &amp; Balances Across All Your Banks
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
            Real-time balances calculated &amp; aggregated from your connected Gmail bank alerts &amp; DataBank sources
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium" style={{ background: "rgba(0,196,140,0.12)", color: "var(--green2)", border: "1px solid rgba(0,196,140,0.25)" }}>
            <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
            Gmail Auto-Synced
          </span>
          <button
            onClick={handleSyncGmail}
            disabled={syncing}
            className="px-3 py-1 rounded-[8px] text-[11px] font-semibold border transition-all duration-150 cursor-pointer"
            style={{ background: "var(--navy)", borderColor: "var(--border)", color: "#fff" }}
          >
            {syncing ? (syncProgress !== null ? `Syncing (${syncProgress}%)…` : "Syncing…") : "🔄 Sync Gmail Alerts"}
          </button>
        </div>
      </div>

      {/* Total Liquid Banner */}
      <div className="rounded-[14px] p-4 flex items-center justify-between flex-wrap gap-4" style={{ background: "linear-gradient(135deg, rgba(0,196,140,0.12), rgba(19,41,82,0.7))", border: "1px solid rgba(0,196,140,0.25)" }}>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.5px]" style={{ color: "rgba(255,255,255,0.6)" }}>Total Combined Liquid Balance (All Banks)</div>
          <div className="text-[26px] font-bold mt-0.5" style={{ color: "#fff", fontFamily: "var(--font-dm-serif)" }}>
            ₦{totalLiquid.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[12px]">
          <div className="text-right">
            <div className="font-semibold text-white">{accounts.length} Connected Bank Accounts</div>
            <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>Auto-extracted from Gmail Bank Alerts</div>
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      {accounts.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter("all")}
            className="px-3 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer"
            style={filter === "all" ? { background: "var(--green)", color: "#fff", borderColor: "var(--green)" } : { background: "var(--bg)", color: "var(--muted)", borderColor: "var(--border)" }}
          >
            All Accounts ({accounts.length})
          </button>
          <button
            onClick={() => setFilter("gmail")}
            className="px-3 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer"
            style={filter === "gmail" ? { background: "var(--green)", color: "#fff", borderColor: "var(--green)" } : { background: "var(--bg)", color: "var(--muted)", borderColor: "var(--border)" }}
          >
            Gmail Synced ({accounts.length})
          </button>
        </div>
      )}

      {/* Grid of Bank Accounts or Empty State */}
      {accounts.length === 0 ? (
        <div className="py-8 text-center" style={{ color: "var(--muted)" }}>
          <div className="text-[28px] mb-2">🏦</div>
          <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>0 Connected Bank Accounts</div>
          <div className="text-[11px] mt-1 mb-4">Sync your Gmail or upload a bank statement to automatically extract your bank balances!</div>
          <button
            onClick={handleSyncGmail}
            disabled={syncing}
            className="px-4 py-2 rounded-[10px] text-[12px] font-semibold text-white cursor-pointer transition-all duration-150"
            style={{ background: "var(--green)" }}
          >
            {syncing ? "Syncing..." : "Sync Gmail Bank Alerts ⚡"}
          </button>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
          {filteredAccounts.map((acc) => (
            <div
              key={acc.id}
              className="rounded-[14px] p-4 flex flex-col justify-between transition-all duration-200"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[18px] flex-shrink-0" style={{ background: acc.bgColor, color: acc.color, border: `1px solid ${acc.color}30` }}>
                    {acc.logo}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{acc.bankName}</div>
                    <div className="text-[10px]" style={{ color: "var(--muted)" }}>{acc.accountType} · {acc.accountNumber}</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.4px]" style={{ color: "var(--muted)" }}>Account Balance</div>
                <div className="text-[18px] font-bold mt-0.5" style={{ color: "var(--text)", fontFamily: "var(--font-dm-serif)" }}>
                  ₦{acc.balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t text-[10px]" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
                  <span>Source: {acc.source}</span>
                  <span>{acc.lastUpdated}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────
export function AnalyticsDashboard() {
  const router = useRouter();
  const { preFillInput } = useChatStore();
  const { context, loadContext } = useDatabankStore();

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const goToChat = useCallback((question: string) => {
    preFillInput(question);
    router.push("/chat");
  }, [preFillInput, router]);

  const [timeframe, setTimeframe] = useState("3M");
  const [ivsView, setIvsView] = useState<"stacked" | "line" | "area">("stacked");
  const [catView, setCatView] = useState<"donut" | "bars">("donut");
  const [txnFilter, setTxnFilter] = useState("All Categories");

  // Expandable sections states
  const [expandTrends, setExpandTrends] = useState(false);
  const [expandTxns, setExpandTxns] = useState(false);
  const [expandHoldings, setExpandHoldings] = useState(false);

  // Helper function to clamp values
  const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

  const hasRealData = !!context;

  const latestDate = context?.recentTransactions && context.recentTransactions.length > 0 
    ? new Date(context.recentTransactions[0].date)
    : new Date();
  const monthYearStr = latestDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const visibleCount = timeframe === "1M" ? 1 : timeframe === "3M" ? 3 : timeframe === "6M" ? 6 : 12;

  // Resolved arrays
  let incomeVsSpendData: any[] = [];
  let cashflowData: any[] = [];
  let networthData: any[] = [];
  let trendMonthsList: string[] = [];
  let catTrendRows: any[] = [];
  
  let categoryData: any[] = [];
  let portfolioData: any[] = [];
  let portfolioGrowth: any[] = [];
  
  let holdingsData: {
    name: string;
    type: string;
    invested: string;
    value: string;
    returnN: string;
    returnPct: string;
    yieldPa: string;
    trend: "up" | "down" | "flat";
  }[] = [];
  
  let budgetMetrics: any[] = [];

  let healthScoreDescription = "Your databank is completely empty. Sync your Gmail, upload a statement, or add manual entries to begin.";

  let transactions: any[] = [];

  let healthScore = 0;
  let healthScoreHeadline = "No Data Found.";
  let healthScoreBuddyTake = "Please add transactions to the databank to generate your AI-powered financial insights.";
  let insights: any[] = [];

  let totalIncomeKpi = "₦0";
  let totalIncomeKpiDelta = "No data";
  let totalIncomeKpiDeltaDir: "up" | "down" | "neutral" = "neutral";
  
  let totalExpensesKpi = "₦0";
  let totalExpensesKpiDelta = "No data";
  let totalExpensesKpiDeltaDir: "up" | "down" | "neutral" = "neutral";

  let savingsRateKpi = "0%";
  let savingsRateKpiDelta = "No data";
  let savingsRateKpiDeltaDir: "up" | "down" | "neutral" = "neutral";

  let netWorthKpi = "₦0";
  let netWorthKpiDelta = "No data";
  let netWorthKpiDeltaDir: "up" | "down" | "neutral" = "neutral";

  let totalAssetKpiValue = "₦0";
  let totalDebtKpiValue = "₦0";

  let assetsList: any[] = [];
  let liabilitiesList: any[] = [];

  let portfolioKpiValue = "₦0";
  let portfolioKpiDelta = "No data";
  let portfolioKpiDeltaDir: "up" | "down" | "neutral" = "neutral";

  let totalInvestedKpiValue = "₦0";
  let totalInvestedKpiDelta = "No data";

  let totalReturnKpiValue = "₦0";
  let totalReturnKpiDelta = "No data";
  let totalReturnKpiDeltaDir: "up" | "down" | "neutral" = "neutral";

  let avgYieldKpiValue = "0%";
  let avgYieldKpiDelta = "No data";
  let avgYieldKpiDeltaDir: "up" | "down" | "neutral" = "neutral";

  if (hasRealData && context) {
    const rawChartData = context.chartData;
    incomeVsSpendData = rawChartData.slice(-visibleCount);
    cashflowData = rawChartData.slice(-visibleCount).map(d => ({ month: d.month, in: d.income, out: d.spent }));
    networthData = rawChartData.slice(-visibleCount).map(d => ({ month: d.month, nw: d.networth }));
    
    trendMonthsList = rawChartData.slice(-Math.min(visibleCount, 6)).map(d => d.month);
    catTrendRows = context.catTrendRows ?? [];
    
    categoryData = context.topCategories.map(c => {
      let color = "#E24B4A";
      const catLower = c.category.toLowerCase();
      if (catLower.includes("food") || catLower.includes("dining")) color = "var(--green)";
      else if (catLower.includes("sub")) color = "var(--gold)";
      else if (catLower.includes("transport") || catLower.includes("ride")) color = "#4A90D9";
      else if (catLower.includes("shop")) color = "#9B59B6";
      else color = "var(--muted)";

      return {
        name: c.category,
        value: Math.round(c.total / 100000),
        pct: c.percentage,
        color,
        change: c.trend === "up" ? "+10%" : c.trend === "down" ? "-10%" : "—",
        changeDir: c.trend === "stable" ? "neutral" as const : c.trend as "up" | "down"
      };
    });

    const savedKobo = context.savingsBalance;
    const debtKobo = context.netWorth < 0 ? Math.abs(context.netWorth) : 0;
    
    portfolioData = context.assetsList.map((a, idx) => {
      const colors = ["var(--green)", "#4A90D9", "#F5A623", "#9B59B6", "#E24B4A", "var(--gold)"];
      return {
        name: a.name,
        value: a.value,
        pct: a.pct,
        color: colors[idx % colors.length]
      };
    });
    
    portfolioGrowth = rawChartData.map(d => ({ month: d.month, value: d.networth }));
    
    holdingsData = context.assetsList.map((a) => ({
      name: a.name,
      type: a.name.toLowerCase().includes("cash") ? "Cash & Liquid MMF" : "Investment / Physical Asset",
      invested: `₦${a.value.toLocaleString()}`,
      value: `₦${a.value.toLocaleString()}`,
      returnN: "+₦0",
      returnPct: "—",
      yieldPa: "—",
      trend: "flat" as const
    }));

    const sr = context.monthlySummary.savingsRate;
    const ti = context.monthlySummary.totalIncome;
    const te = context.monthlySummary.totalExpenses;
    const sb = context.savingsBalance;
    const totalDebtNaira = context.liabilitiesList.reduce((sum, l) => sum + l.value, 0);
    const incomeNaira = ti / 100;
    const expenseNaira = te / 100;
    const savingsNaira = sb / 100;

    const savingsRulePct = clamp(Math.round((sr / 0.2) * 100), 0, 100);
    const dtiPct = incomeNaira > 0 ? clamp(Math.round((totalDebtNaira / incomeNaira) * 100), 0, 100) : 0;
    
    const efMonths = expenseNaira > 0 ? (savingsNaira / expenseNaira) : 6;
    const efPct = clamp(Math.round((efMonths / 6) * 100), 0, 100);
    
    const nonCashAssetsNaira = context.assetsList
      .filter(a => !a.name.toLowerCase().includes("cash") && !a.name.toLowerCase().includes("savings"))
      .reduce((sum, a) => sum + a.value, 0);
    const investRatePct = savingsNaira > 0 ? clamp(Math.round((nonCashAssetsNaira / savingsNaira) * 100), 0, 100) : 0;

    budgetMetrics = [
      { label: "50/30/20 Rule", pct: savingsRulePct, color: "var(--green)" },
      { label: "Debt-to-Income", pct: dtiPct, color: dtiPct > 35 ? "#E24B4A" : "#F5A623" },
      { label: "Emergency Fund", pct: efPct, color: "#4A90D9" },
      { label: "Investment Rate", pct: investRatePct, color: "#9B59B6" },
    ];

    const largestSpendText = context.monthlySummary.largestDebit 
      ? `your largest single expense was ₦${Math.round(Math.abs(context.monthlySummary.largestDebit.amount) / 100).toLocaleString()} for "${context.monthlySummary.largestDebit.description}"`
      : "we don't see any large single expenses yet";
      
    healthScoreDescription = `Your savings rate is at ${Math.round(context.monthlySummary.savingsRate * 100)}% this month. Based on your parsed DataBank, ${largestSpendText}. Start a chat below with your buddy to get personalized recommendations.`;
    if (debtKobo > 0) {
      holdingsData.push({
        name: "Outstanding Liabilities",
        type: "Debt / Credit",
        invested: `₦${Math.round(debtKobo / 100).toLocaleString()}`,
        value: `₦${Math.round(debtKobo / 100).toLocaleString()}`,
        returnN: "—",
        returnPct: "—",
        yieldPa: "—",
        trend: "down" as const
      });
    }

    transactions = context.recentTransactions.map(t => {
      let icon = "⚡";
      let bg = "#ECEFF1";
      const catLower = t.category.toLowerCase();
      if (catLower.includes("food") || catLower.includes("dining")) {
        icon = "🍔"; bg = "#FEF9E7";
      } else if (catLower.includes("income") || catLower.includes("salary")) {
        icon = "💰"; bg = "#E8F5E9";
      } else if (catLower.includes("transport") || catLower.includes("ride")) {
        icon = "🚗"; bg = "#E3F2FD";
      } else if (catLower.includes("sub")) {
        icon = "🎬"; bg = "#FCE4EC";
      } else if (catLower.includes("shop")) {
        icon = "🛍️"; bg = "#F3E5F5";
      }

      const dateObj = new Date(t.date);
      const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const amtStr = `${t.type === "income" ? "+" : "-"}₦${Math.round(Math.abs(t.amount) / 100).toLocaleString()}`;

      return {
        icon,
        bg,
        name: t.description,
        cat: t.category,
        date: dateStr,
        amt: amtStr,
        type: t.type === "income" ? "credit" as const : "debit" as const,
        source: t.source,
      };
    });

    const srScore = clamp(Math.round(context.monthlySummary.savingsRate * 280), 0, 100);
    const goalProgress = context.activeGoals.length > 0
      ? Math.round(context.activeGoals.reduce((s, g) => s + g.progressPercent, 0) / context.activeGoals.length)
      : 50;
    
    healthScore = Math.round(srScore * 0.45 + goalProgress * 0.35 + 20);
    healthScoreHeadline = healthScore >= 80 ? "Excellent — you're building real wealth"
      : healthScore >= 65 ? "Strong — keep the momentum going"
      : healthScore >= 50 ? "Good foundation — a few key moves will accelerate this"
      : "Work in progress — focus on the fundamentals";
      
    healthScoreBuddyTake = `You’re doing the fundamentals right — savings rate is at ${Math.round(context.monthlySummary.savingsRate * 100)}%. Discussions with your buddy will help you fine-tune allocations.`;

    insights = [
      {
        icon: "💰",
        label: "Savings Rate",
        value: `${Math.round(context.monthlySummary.savingsRate * 100)}%`,
        delta: context.monthlySummary.savingsRate >= 0.25 ? "↑ Exceeding target" : "Watch your expenses",
        type: context.monthlySummary.savingsRate >= 0.2 ? "positive" as const : "warning" as const,
        question: `My savings rate is ${Math.round(context.monthlySummary.savingsRate * 100)}%. How can I optimize it further?`
      }
    ];

    if (context.monthlySummary.largestDebit) {
      const ld = context.monthlySummary.largestDebit;
      insights.push({
        icon: "🍔",
        label: "Largest Spend",
        value: `₦${Math.round(ld.amount / 100).toLocaleString()}`,
        delta: `${ld.description}`,
        type: "warning" as const,
        question: `My largest single expense was ₦${Math.round(ld.amount / 100).toLocaleString()} for ${ld.description}. How can I plan better for this?`
      });
    }

    if (context.activeGoals.length > 0) {
      const g = context.activeGoals[0];
      insights.push({
        icon: "🎯",
        label: "Primary Goal",
        value: `${g.progressPercent}%`,
        delta: `${g.title}`,
        type: "positive" as const,
        question: `I've made ${g.progressPercent}% progress on my goal: ${g.title}. What should be my next milestone?`
      });
    } else {
      insights.push({
        icon: "✨",
        label: "Goals",
        value: "0 active",
        delta: "Set a goal to target savings",
        type: "warning" as const,
        question: "I want to set a new financial goal to track. What goal would you suggest for my income?"
      });
    }

    totalIncomeKpi = `₦${Math.round(context.monthlySummary.totalIncome / 100000)}k`;
    totalIncomeKpiDelta = "This month's income";
    totalIncomeKpiDeltaDir = "neutral" as const;

    totalExpensesKpi = `₦${Math.round(context.monthlySummary.totalExpenses / 100000)}k`;
    totalExpensesKpiDelta = "This month's expenses";
    totalExpensesKpiDeltaDir = "neutral" as const;

    savingsRateKpi = `${Math.round(context.monthlySummary.savingsRate * 100)}%`;
    savingsRateKpiDelta = context.monthlySummary.savingsRate >= 0.2 ? "↑ Healthy rate" : "Focus on saving";
    savingsRateKpiDeltaDir = context.monthlySummary.savingsRate >= 0.2 ? "up" as const : "down" as const;

    const nwVal = Math.round(context.netWorth / 100000);
    netWorthKpi = context.netWorth >= 100000000
      ? `₦${(context.netWorth / 100000000).toFixed(2)}M`
      : nwVal < 0
        ? `-₦${Math.abs(nwVal).toLocaleString()}k`
        : `₦${nwVal.toLocaleString()}k`;
    netWorthKpiDelta = "Current cash net worth";
    netWorthKpiDeltaDir = context.netWorth >= 0 ? "up" as const : "down" as const;

    totalAssetKpiValue = `₦${Math.round(context.savingsBalance / 100).toLocaleString()}`;
    totalDebtKpiValue = `₦${Math.round(debtKobo / 100).toLocaleString()}`;

    assetsList = context.assetsList.map(a => ({
      name: a.name,
      value: `₦${a.value.toLocaleString()}`,
      pct: a.pct
    }));

    liabilitiesList = context.liabilitiesList.map(l => ({
      name: l.name,
      value: `₦${l.value.toLocaleString()}`,
      pct: l.pct
    }));

    portfolioKpiValue = `₦${Math.round(savedKobo / 100000)}k`;
    portfolioKpiDelta = "Total cash savings";
    portfolioKpiDeltaDir = "neutral" as const;

    totalInvestedKpiValue = `₦${Math.round(savedKobo / 100000)}k`;
    totalInvestedKpiDelta = "In DataBank";

    totalReturnKpiValue = "—";
    totalReturnKpiDelta = "";
    totalReturnKpiDeltaDir = "neutral" as const;

    avgYieldKpiValue = "—";
    avgYieldKpiDelta = "";
    avgYieldKpiDeltaDir = "neutral" as const;
  }

  // Category trend table: cap at 6 available months
  const catVisibleCount  = Math.min(visibleCount, 6);
  const catVisibleMonths = trendMonthsList.slice(-catVisibleCount);

  const filteredTxns = txnFilter === "All Categories"
    ? transactions
    : transactions.filter((t) => t.cat.startsWith(txnFilter));

  const visibleTrendRows = expandTrends ? catTrendRows : catTrendRows.slice(0, 3);
  const visibleTxns = expandTxns ? filteredTxns : filteredTxns.slice(0, 3);
  const visibleHoldings = expandHoldings ? holdingsData : holdingsData.slice(0, 3);

  return (
    <div className="flex flex-col gap-6 text-[13px] leading-relaxed" style={{ color: "var(--text)" }}>
      {/* Header + timeframe */}
      <div className="flex items-start justify-between mb-2 flex-wrap gap-3">
        <div>
          <div className="text-[20px] font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
            Spending <em style={{ fontFamily: "var(--font-dm-serif)", fontStyle: "italic", color: "var(--green)" }}>Analytics</em>
          </div>
          <div className="text-[12px] mt-1" style={{ color: "var(--muted)" }}>All figures from your connected DataBank sources</div>
        </div>
        <div className="flex gap-1 rounded-[10px] p-1" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className="px-3 py-[6px] rounded-[8px] text-[11px] font-semibold transition-all duration-150"
              style={{
                background: timeframe === tf ? "var(--green)" : "transparent",
                color: timeframe === tf ? "#fff" : "var(--muted)",
                border: "none",
                cursor: "pointer",
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 mb-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        <Kpi label="Avg Monthly Income" value={totalIncomeKpi} delta={totalIncomeKpiDelta} deltaDir={totalIncomeKpiDeltaDir} />
        <Kpi label="Avg Monthly Spend" value={totalExpensesKpi} delta={totalExpensesKpiDelta} deltaDir={totalExpensesKpiDeltaDir} />
        <Kpi label="Savings Rate" value={savingsRateKpi} delta={savingsRateKpiDelta} deltaDir={savingsRateKpiDeltaDir} />
        <Kpi label="Net Worth" value={netWorthKpi} delta={netWorthKpiDelta} deltaDir={netWorthKpiDeltaDir} />
      </div>

      {/* ── CARD 1: FINANCIAL HEALTH SCORE OVERVIEW ── */}
      <div className="rounded-[16px] p-5 flex flex-col gap-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="text-[15px] font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
          🎯 Financial Health Score Overview
        </div>

        {/* Financial Health Score Gradient */}
        <div className="rounded-[16px] p-6" style={{ background: "linear-gradient(135deg,var(--navy2),var(--navy))", color: "#fff" }}>
          <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
            <div className="flex-1 min-w-[240px]">
              <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2" style={{ color: "rgba(255,255,255,.5)" }}>Financial Health · {monthYearStr}</div>
              <div className="text-[20px] font-semibold mb-2" style={{ fontFamily: "var(--font-dm-serif)", lineHeight: 1.3, whiteSpace: "pre-line" }}>
                {healthScoreHeadline}
              </div>
              <div className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,.7)" }}>
                {healthScoreDescription}
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="relative">
                <HealthRing score={healthScore} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[22px] font-bold" style={{ fontFamily: "var(--font-dm-serif)" }}>{healthScore}</div>
                  <div className="text-[10px]" style={{ color: "rgba(255,255,255,.55)" }}>/100</div>
                </div>
              </div>
              <div className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,.5)" }}>Health Score</div>
            </div>
          </div>

          {/* Insight tiles */}
          <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
            {insights.map((item) => (
              <div
                key={item.label}
                onClick={() => goToChat(item.question)}
                className="rounded-[12px] p-3 cursor-pointer transition-all duration-150"
                style={{
                  background: item.type === "positive" ? "rgba(0,196,140,.15)"
                    : item.type === "warning" ? "rgba(245,166,35,.15)"
                    : "rgba(226,75,74,.15)",
                  border: `1px solid ${item.type === "positive" ? "rgba(0,196,140,.25)"
                    : item.type === "warning" ? "rgba(245,166,35,.25)"
                    : "rgba(226,75,74,.25)"}`,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "0.8"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
              >
                <div className="text-[16px] mb-1">{item.icon}</div>
                <div className="text-[10px] font-semibold uppercase tracking-[.4px] mb-1" style={{ color: "rgba(255,255,255,.55)" }}>{item.label}</div>
                <div className="text-[16px] font-semibold" style={{ fontFamily: "var(--font-dm-serif)" }}>{item.value}</div>
                <div className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,.5)" }}>{item.delta}</div>
              </div>
            ))}
          </div>

          {/* Buddy take */}
          <div className="flex items-start gap-3 p-4 rounded-[12px] mb-4" style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)" }}>
            <div className="flex items-center justify-center rounded-[10px] text-[16px] flex-shrink-0" style={{ width: 36, height: 36, background: "rgba(255,255,255,.12)" }}>🎯</div>
            <div>
              <div className="text-[12px] italic mb-1" style={{ color: "rgba(255,255,255,.8)", lineHeight: 1.6 }}>
                &ldquo;{healthScoreBuddyTake}&rdquo;
              </div>
              <div className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,.45)" }}>Based on your DataBank</div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => goToChat(`I just reviewed my financial health score of ${healthScore}. Let's talk about how to improve it.`)}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold transition-all duration-150 cursor-pointer"
              style={{ background: "var(--green)", color: "#fff", border: "none" }}
            >
              Discuss With My Buddy →
            </button>
            <button
              onClick={() => goToChat("How can I optimize my budget to build wealth faster?")}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-medium border cursor-pointer"
              style={{ color: "rgba(255,255,255,.75)", borderColor: "rgba(255,255,255,.2)", background: "transparent" }}
            >
              ⚡ Optimize Budget Now
            </button>
          </div>
        </div>
      </div>

      {/* ── CARD: ACCOUNT BALANCES ACROSS ALL YOUR BANKS (GMAIL SYNCED) ── */}
      <BankBalancesCard context={context} />

      {/* ── CARD 2: SPENDING BREAKDOWN & TRENDS ── */}
      <div className="rounded-[16px] p-5 flex flex-col gap-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="text-[15px] font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
          💸 Spending Breakdown & Cash Flow
        </div>

        {/* Income vs. Spending */}
        <ChartCard title="Income vs. Spending" sub={`Last ${visibleCount > 6 ? "12" : visibleCount} month${visibleCount > 1 ? "s" : ""}`}>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {[
              { id: "stacked", label: "📊 Stacked" },
              { id: "line",    label: "📈 Line" },
              { id: "area",    label: "🏔 Area" },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setIvsView(v.id as typeof ivsView)}
                className="px-3 py-[5px] rounded-[7px] text-[11px] font-medium border transition-all duration-150"
                style={{
                  background: ivsView === v.id ? "var(--green)" : "transparent",
                  color: ivsView === v.id ? "#fff" : "var(--muted)",
                  borderColor: ivsView === v.id ? "var(--green)" : "var(--border)",
                  cursor: "pointer",
                }}
              >
                {v.label}
              </button>
            ))}
            <button
              onClick={() => goToChat("Looking at my income vs spending over the last 6 months, what pattern do you see and what should I change?")}
              className="text-[11px] font-medium cursor-pointer ml-auto transition-opacity duration-150 hover:opacity-70"
              style={{ color: "var(--green)", background: "none", border: "none", padding: 0 }}
            >
              Ask buddy →
            </button>
          </div>

          {ivsView === "stacked" && (
            <div>
              {incomeVsSpendData.length === 0 || incomeVsSpendData.every((d) => d.income === 0 && d.spent === 0) ? (
                <div className="py-8 text-center" style={{ color: "var(--muted)" }}>
                  <div className="text-[24px] mb-2">📊</div>
                  <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>No Transaction History</div>
                  <div className="text-[11px] mt-1">Sync your Gmail or upload a bank statement on the DataBank page to populate your spending breakdown!</div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {incomeVsSpendData.map((d) => {
                    const maxVal = Math.max(d.income, d.spent, 1);
                    const spentPct = Math.min(100, Math.round((d.spent / maxVal) * 100));
                    const incomePct = Math.min(100, Math.round((d.income / maxVal) * 100));

                    return (
                      <div key={d.month} className="flex items-center gap-3">
                        <div className="text-right text-[11px] flex-shrink-0 font-semibold" style={{ width: 32, color: "var(--muted)" }}>
                          {d.month}
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          {/* Spending Bar */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 rounded-[4px] overflow-hidden" style={{ height: 10, background: "var(--bg)" }}>
                              <div style={{ width: `${Math.max(d.spent > 0 ? 6 : 0, spentPct)}%`, height: "100%", background: "#E24B4A", borderRadius: 4 }} />
                            </div>
                            <span className="text-[10px] font-semibold text-rose-500" style={{ width: 60 }}>
                              -₦{d.spent >= 1 ? `${d.spent.toFixed(1)}k` : `${Math.round(d.spent * 1000).toLocaleString()}`}
                            </span>
                          </div>
                          {/* Income Bar */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 rounded-[4px] overflow-hidden" style={{ height: 10, background: "var(--bg)" }}>
                              <div style={{ width: `${Math.max(d.income > 0 ? 6 : 0, incomePct)}%`, height: "100%", background: "var(--green)", borderRadius: 4 }} />
                            </div>
                            <span className="text-[10px] font-semibold" style={{ color: "var(--green)", width: 60 }}>
                              +₦{d.income >= 1 ? `${d.income.toFixed(1)}k` : `${Math.round(d.income * 1000).toLocaleString()}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--muted)" }}>
                  <div style={{ width: 16, height: 10, borderRadius: 3, background: "#E24B4A" }} />
                  Spent Outflow
                </div>
                <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--muted)" }}>
                  <div style={{ width: 16, height: 10, borderRadius: 3, background: "var(--green)" }} />
                  Income Inflow
                </div>
              </div>
            </div>
          )}

          {ivsView === "line" && (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={incomeVsSpendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${v}k`} />
                <Tooltip formatter={(v) => `₦${v}k`} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="income" stroke="var(--green)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--green)", stroke: "var(--card)", strokeWidth: 2 }} name="Income" />
                <Line type="monotone" dataKey="spent" stroke="#E24B4A" strokeWidth={2.5} dot={{ r: 4, fill: "#E24B4A", stroke: "var(--card)", strokeWidth: 2 }} name="Spending" />
              </LineChart>
            </ResponsiveContainer>
          )}

          {ivsView === "area" && (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={incomeVsSpendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--green)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--green)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E24B4A" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#E24B4A" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${v}k`} />
                <Tooltip formatter={(v) => `₦${v}k`} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="income" stroke="var(--green)" strokeWidth={2.5} fill="url(#incomeGrad)" name="Income" />
                <Area type="monotone" dataKey="spent" stroke="#E24B4A" strokeWidth={2.5} fill="url(#spentGrad)" name="Spending" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 2-Column charts: category allocation + budget health metrics */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {/* Spending by Category */}
          <ChartCard
            title="Spending by Category"
            sub="Allocation Snapshot"
            action="Ask buddy →"
            onAction={() => goToChat("Break down my spending categories and tell me which one I should cut first.")}
          >
            <div className="flex items-center gap-2 mb-4">
              {[{ id: "donut", label: "🍩 Donut" }, { id: "bars", label: "📊 Bars" }].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setCatView(v.id as typeof catView)}
                  className="px-3 py-[5px] rounded-[7px] text-[11px] font-medium border transition-all duration-150"
                  style={{
                    background: catView === v.id ? "var(--green)" : "transparent",
                    color: catView === v.id ? "#fff" : "var(--muted)",
                    borderColor: catView === v.id ? "var(--green)" : "var(--border)",
                    cursor: "pointer",
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {catView === "donut" && (
              <div className="flex items-center gap-4 flex-wrap">
                <div style={{ width: 130, height: 130, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" innerRadius={38} outerRadius={60} paddingAngle={1} startAngle={90} endAngle={-270}>
                        {categoryData.map((entry, i) => (
                          <Cell key={i} fill={entry.color.startsWith("var(") ? (entry.color === "var(--green)" ? "#00C48C" : entry.color === "var(--gold)" ? "#F5A623" : "#6B7A99") : entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 flex-1 animate-fadeIn">
                  {categoryData.map((cat) => (
                    <div key={cat.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color.startsWith("var(") ? (cat.color === "var(--green)" ? "#00C48C" : cat.color === "var(--gold)" ? "#F5A623" : "#6B7A99") : cat.color }} />
                      <div className="flex-1 text-[11px]" style={{ color: "var(--text)" }}>{cat.name}</div>
                      <div className="text-[10px] font-semibold" style={{ color: "var(--muted)" }}>{cat.pct}%</div>
                      <div className="text-[11px] font-semibold" style={{ color: "var(--text)" }}>₦{cat.value}k</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {catView === "bars" && (
              <div className="flex flex-col gap-2">
                {categoryData.map((cat, i) => {
                  const barColor = cat.color.startsWith("var(") ? (cat.color === "var(--green)" ? "#00C48C" : cat.color === "var(--gold)" ? "#F5A623" : "#6B7A99") : cat.color;
                  const changeColor = cat.changeDir === "up" ? "#E24B4A" : cat.changeDir === "down" ? "var(--green2)" : "var(--muted)";
                  return (
                    <div key={cat.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: barColor }} />
                      <div className="text-[11px] flex-shrink-0" style={{ color: "var(--text)", width: 100 }}>{cat.name}</div>
                      <div className="flex-1 h-[8px] rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: barColor }}
                          initial={{ width: 0 }}
                          animate={{ width: `${cat.pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.06 }}
                        />
                      </div>
                      <div className="text-[11px] font-semibold flex-shrink-0" style={{ color: "var(--text)", width: 36, textAlign: "right" }}>₦{cat.value}k</div>
                      <div className="text-[10px] font-semibold flex-shrink-0" style={{ color: changeColor, width: 36, textAlign: "right" }}>{cat.change}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>

          {/* Budget Health Metrics */}
          <ChartCard title="Budget Health Metrics" action="Ask buddy →" onAction={() => goToChat("Review my budget health metrics and tell me which one needs the most attention.")}>
            <div className="flex flex-col gap-3">
              {/* Savings rate highlight */}
              <div className="flex items-center justify-between rounded-[10px] p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[.5px] mb-1" style={{ color: "var(--muted)" }}>Savings Rate</div>
                  <div className="text-[26px] font-semibold" style={{ color: "var(--green2)", fontFamily: "var(--font-dm-serif)" }}>{savingsRateKpi}</div>
                  <div className="text-[11px]" style={{ color: "var(--muted)" }}>Target: 50% · {parseFloat(savingsRateKpi) >= 50 ? "✓ Exceeding" : "Focus on saving"}</div>
                </div>
                <SmallRing pct={parseFloat(savingsRateKpi) || 0} color="var(--green)" />
              </div>

              {/* Budget bars */}
              {budgetMetrics.map((row, i) => {
                const fg = row.color.startsWith("var(") ? (row.color === "var(--green)" ? "#00C48C" : row.color) : row.color;
                return (
                  <div key={row.label} className="flex items-center gap-3">
                    <div className="text-[12px] flex-shrink-0" style={{ color: "var(--text)", width: 120 }}>{row.label}</div>
                    <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: fg }}
                        initial={{ width: 0 }}
                        animate={{ width: `${row.pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.07 }}
                      />
                    </div>
                    <div className="text-[12px] font-semibold flex-shrink-0" style={{ color: fg, width: 34, textAlign: "right" }}>{row.pct}%</div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        </div>

        {/* Active Financial Goals & Targets Card */}
        <ChartCard
          title="🎯 Active Financial Goals & Targets"
          sub="Set automatically by AI Buddy or added manually"
          action="Set goal in Chat →"
          onAction={() => goToChat("I want to set a new financial goal to track.")}
        >
          {context?.activeGoals && context.activeGoals.length > 0 ? (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {context.activeGoals.map((goal, i) => (
                <div
                  key={`${goal.title}-${i}`}
                  className="rounded-[12px] p-4 flex flex-col justify-between"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-[13px] font-bold truncate" style={{ color: "var(--text)" }}>{goal.title}</span>
                      <span className="text-[10px] font-semibold px-2 py-[2px] rounded-full flex-shrink-0" style={{ background: "rgba(0,196,140,0.12)", color: "var(--green2)" }}>
                        {goal.progressPercent}% Target
                      </span>
                    </div>
                    <div className="text-[11px] mb-3" style={{ color: "var(--muted)" }}>
                      Saved ₦{Math.round(goal.currentAmount / 100).toLocaleString()} of ₦{Math.round(goal.targetAmount / 100).toLocaleString()}
                      {goal.targetDate ? ` · Target: ${goal.targetDate}` : ""}
                    </div>
                  </div>
                  <div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--card)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, goal.progressPercent)}%`, background: "var(--green)" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 text-center rounded-[12px]" style={{ background: "var(--bg)", border: "1px dashed var(--border)" }}>
              <div className="text-[22px] mb-1">🎯</div>
              <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>No Active Goals Created Yet</div>
              <div className="text-[11px] max-w-sm mx-auto mt-1" style={{ color: "var(--muted)" }}>
                Ask your AI Buddy in chat (e.g. &quot;Set an emergency fund goal of ₦500,000&quot;) to auto-create and track goals here!
              </div>
            </div>
          )}
        </ChartCard>

        {/* Monthly Category Trends Table (Expandable) */}
        <ChartCard
          title="Monthly Category Trends"
          sub={`${catVisibleCount}-month comparison · Colour = direction of change`}
          action="Ask buddy →"
          onAction={() => goToChat("Break down my spending categories and tell me which one I should cut first.")}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", borderBottomStyle: "solid", borderBottomWidth: 1, borderBottomColor: "var(--border)" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px" }}>Category</th>
                  {catVisibleMonths.map((m) => (
                    <th key={m} style={{ padding: "8px 12px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px" }}>{m}</th>
                  ))}
                  <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px" }}>Trend</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px" }}>{catVisibleCount}M Total</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px" }}></th>
                </tr>
              </thead>
              <tbody>
                {visibleTrendRows.map((row) => {
                  const trendColor = row.trendDir === "up" ? "#E24B4A" : row.trendDir === "down" ? "var(--green2)" : "var(--muted)";
                  const total = catVisibleMonths.reduce((s, m) => {
                    const idx = trendMonthsList.indexOf(m);
                    return s + (idx !== -1 ? (row.vals[idx] ?? 0) : 0);
                  }, 0);
                  return (
                    <tr key={row.cat} style={{ borderBottom: "1px solid var(--border)", borderBottomStyle: "solid", borderBottomWidth: 1, borderBottomColor: "var(--border)" }}>
                      <td style={{ padding: "11px 12px", fontSize: 13, color: "var(--text)" }}>{row.cat}</td>
                      {catVisibleMonths.map((m) => {
                        const idx = trendMonthsList.indexOf(m);
                        const val = idx !== -1 ? (row.vals[idx] ?? 0) : 0;
                        return <td key={m} style={{ padding: "11px 8px", textAlign: "right", fontSize: 13 }}>₦{val}k</td>;
                      })}
                      <td style={{ padding: "11px 8px", textAlign: "right", fontSize: 13, fontWeight: 600, color: trendColor }}>{row.trend}</td>
                      <td style={{ padding: "11px 8px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>₦{total}k</td>
                      <td style={{ padding: "11px 8px" }}>
                        <button
                          onClick={() => goToChat(`${row.cat.replace(/^\S+\s/, "")} spending is ${row.trend}. What should I do?`)}
                          className="cursor-pointer text-[13px] transition-opacity duration-150 hover:opacity-60"
                          style={{ background: "none", border: "none", padding: 0 }}
                        >
                          💬
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {catTrendRows.length > 3 && (
            <div className="flex justify-center mt-3">
              <button
                onClick={() => setExpandTrends(!expandTrends)}
                className="px-4 py-2 rounded-[8px] text-[11px] font-semibold border transition-all duration-150 hover:opacity-80"
                style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)", cursor: "pointer" }}
              >
                {expandTrends ? "View Less" : `View More (${catTrendRows.length - 3} more)`}
              </button>
            </div>
          )}
        </ChartCard>

        {/* Recent Transactions List (Expandable) */}
        <ChartCard title="Recent Transactions">
          <div className="flex items-center gap-2 mb-4">
            <select
              value={txnFilter}
              onChange={(e) => setTxnFilter(e.target.value)}
              className="px-3 py-[7px] rounded-[8px] text-[11px] outline-none"
              style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "var(--bg)", fontFamily: "var(--font-sora)" }}
            >
              <option>All Categories</option>
              <option>Food &amp; Dining</option>
              <option>Subscriptions</option>
              <option>Transport</option>
              <option>Shopping</option>
            </select>
          </div>
          <div className="flex flex-col">
            {visibleTxns.map((txn, index) => (
              <div key={`${txn.name}-${txn.date}-${txn.amt}-${index}`} className="flex items-center gap-3 py-3" style={{ borderBottom: "1px solid var(--border)", borderBottomStyle: "solid", borderBottomWidth: 1, borderBottomColor: "var(--border)" }}>
                <div className="flex items-center justify-center rounded-[8px] text-[14px] flex-shrink-0" style={{ width: 36, height: 36, background: txn.bg }}>{txn.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-medium truncate" style={{ color: "var(--text)" }}>{txn.name}</div>
                    {txn.source === "ai" ? (
                      <span className="text-[9px] font-bold px-1.5 py-[1px] rounded flex-shrink-0" style={{ background: "rgba(139,92,246,0.15)", color: "#a855f7", border: "1px solid rgba(139,92,246,0.3)" }}>
                        🤖 AI Logged
                      </span>
                    ) : txn.source === "gmail" ? (
                      <span className="text-[9px] font-semibold px-1.5 py-[1px] rounded flex-shrink-0" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }}>
                        📧 Gmail
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--muted)" }}>{txn.cat}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[11px]" style={{ color: "var(--muted)" }}>{txn.date}</div>
                  <div className="text-[13px] font-semibold" style={{ color: txn.type === "credit" ? "var(--green2)" : txn.type === "invest" ? "#4A90D9" : "#E24B4A" }}>{txn.amt}</div>
                </div>
              </div>
            ))}
          </div>
          {filteredTxns.length > 3 && (
            <div className="flex justify-center mt-3">
              <button
                onClick={() => setExpandTxns(!expandTxns)}
                className="px-4 py-2 rounded-[8px] text-[11px] font-semibold border transition-all duration-150 hover:opacity-80"
                style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)", cursor: "pointer" }}
              >
                {expandTxns ? "View Less" : `View More (${filteredTxns.length - 3} more)`}
              </button>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── CARD 3: INVESTMENTS PORTFOLIO & NET WORTH ── */}
      <div className="rounded-[16px] p-5 flex flex-col gap-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="text-[15px] font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
          📈 Investments Portfolio & Net Worth
        </div>

        {/* Portfolio KPIs */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
          <Kpi label="Portfolio Value" value={portfolioKpiValue} delta={portfolioKpiDelta} deltaDir={portfolioKpiDeltaDir} />
          <Kpi label="Total Invested" value={totalInvestedKpiValue} delta={totalInvestedKpiDelta} deltaDir="neutral" />
          <Kpi label="Total Return" value={totalReturnKpiValue} delta={totalReturnKpiDelta} deltaDir={totalReturnKpiDeltaDir} />
          <Kpi label="Avg Yield p.a." value={avgYieldKpiValue} delta={avgYieldKpiDelta} deltaDir={avgYieldKpiDeltaDir} />
        </div>

        {/* Portfolio Allocation & Growth */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {/* Portfolio Allocation Donut */}
          <ChartCard
            title="Portfolio Allocation"
            sub="Asset allocation details"
            action="Ask buddy →"
            onAction={() => goToChat("Am I invested in the right mix of assets?")}
          >
            <div className="flex items-center gap-4 flex-wrap">
              <div style={{ width: 130, height: 130, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={portfolioData} dataKey="value" innerRadius={38} outerRadius={60} paddingAngle={1} startAngle={90} endAngle={-270}>
                      {portfolioData.map((entry, i) => (
                        <Cell key={i} fill={entry.color.startsWith("#") ? entry.color : entry.color === "var(--green)" ? "#00C48C" : entry.color === "var(--gold)" ? "#F5A623" : "#6B7A99"} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 flex-1 animate-fadeIn">
                {portfolioData.map((item) => {
                  const c = item.color.startsWith("#") ? item.color : item.color === "var(--green)" ? "#00C48C" : item.color === "var(--gold)" ? "#F5A623" : "#6B7A99";
                  return (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
                      <div className="flex-1 text-[11px]" style={{ color: "var(--text)" }}>{item.name}</div>
                      <div className="text-[10px]" style={{ color: "var(--muted)" }}>{item.pct}%</div>
                      <div className="text-[11px] font-semibold" style={{ color: "var(--text)" }}>₦{item.value}k</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ChartCard>

          {/* Portfolio Growth Chart */}
          <ChartCard title="Portfolio Growth" sub="Cumulative net worth projection">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={portfolioGrowth} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${v}k`} />
                <Tooltip formatter={(v) => `₦${v}k`} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="value" stroke="var(--green)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--green)", stroke: "var(--card)", strokeWidth: 2 }} name="Value" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Investment Holdings Table (Expandable) */}
        <ChartCard title="Current Holdings" action="Export Holdings (CSV)">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", borderBottomStyle: "solid", borderBottomWidth: 1, borderBottomColor: "var(--border)" }}>
                  {["Asset", "Invested", "Value Now", "Return ₦", "Return %", "Yield p.a."].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: h === "Asset" ? "left" : "right", fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleHoldings.map((h) => (
                  <tr key={h.name} style={{ borderBottom: "1px solid var(--border)", borderBottomStyle: "solid", borderBottomWidth: 1, borderBottomColor: "var(--border)" }}>
                    <td style={{ padding: "11px 12px" }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{h.name}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{h.type}</div>
                    </td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontSize: 13, color: "var(--text)" }}>{h.invested}</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{h.value}</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: h.returnN.startsWith("+") ? "var(--green2)" : "var(--muted)" }}>{h.returnN}</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontSize: 13, fontWeight: 600, color: h.returnPct.startsWith("+") ? "var(--green2)" : "var(--muted)" }}>{h.returnPct}</td>
                    <td style={{ padding: "11px 12px", textAlign: "right", fontSize: 13, color: "var(--muted)" }}>{h.yieldPa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {holdingsData.length > 3 && (
            <div className="flex justify-center mt-3">
              <button
                onClick={() => setExpandHoldings(!expandHoldings)}
                className="px-4 py-2 rounded-[8px] text-[11px] font-semibold border transition-all duration-150 hover:opacity-80"
                style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)", cursor: "pointer" }}
              >
                {expandHoldings ? "View Less" : `View More (${holdingsData.length - 3} more)`}
              </button>
            </div>
          )}
        </ChartCard>

        {/* Net Worth Growth Section */}
        <ChartCard
          title="Net Worth Growth"
          sub={`${networthData[0]?.month ?? "Oct"} – ${networthData[networthData.length - 1]?.month ?? "Now"}`}
          action="Ask buddy →"
          onAction={() => goToChat(`My net worth hit ${netWorthKpi}. What's my next milestone and how do I get there?`)}
        >
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={networthData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00C48C" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#00C48C" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${v}k`} domain={["auto", "auto"]} />
              <Tooltip formatter={(v) => `₦${v}k`} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="nw" stroke="var(--green)" strokeWidth={2.5} fill="url(#nwGrad)" dot={{ r: 4, fill: "var(--green)", stroke: "var(--card)", strokeWidth: 2 }} name="Net Worth" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Assets vs. Liabilities */}
        <ChartCard title="Assets vs. Liabilities" sub="Snapshot details">
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-3" style={{ color: "var(--green2)" }}>Assets · {totalAssetKpiValue}</div>
              <div className="flex flex-col gap-2">
                {assetsList.map((a, i) => (
                  <div key={a.name} className="flex items-center gap-2">
                    <div className="text-[12px] flex-shrink-0 font-medium" style={{ color: "var(--text)", width: 130 }}>{a.name}</div>
                    <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "var(--green)" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${a.pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.07 }}
                      />
                    </div>
                    <div className="text-[11px] font-semibold flex-shrink-0" style={{ color: "var(--text)", width: 70, textAlign: "right" }}>{a.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-3" style={{ color: "#E24B4A" }}>Liabilities · {totalDebtKpiValue}</div>
              <div className="flex flex-col gap-2">
                {liabilitiesList.map((l, i) => (
                  <div key={l.name} className="flex items-center gap-2">
                    <div className="text-[12px] flex-shrink-0 font-medium" style={{ color: "var(--text)", width: 130 }}>{l.name}</div>
                    <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "#E24B4A" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${l.pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.07 }}
                      />
                    </div>
                    <div className="text-[11px] font-semibold flex-shrink-0" style={{ color: "#E24B4A", width: 70, textAlign: "right" }}>{l.value}</div>
                  </div>
                ))}
                {liabilitiesList.length === 0 && (
                  <div className="text-[12px]" style={{ color: "var(--muted)" }}>No active debts/liabilities listed.</div>
                )}
              </div>
              <div className="mt-4 p-3 rounded-[10px] text-[12px]" style={{ background: "rgba(226,75,74,.06)", border: "1px solid rgba(226,75,74,.15)", color: "var(--muted)", lineHeight: 1.6 }}>
                💡 {hasRealData 
                  ? "Optimize your debt payoff plan by discussing strategies directly with your buddy."
                  : "Eliminating this ₦95k debt at 24% APR saves ₦22,800/yr — equivalent to a guaranteed 24% return."
                }
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
