"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useChatStore } from "@/store/chatStore";

// ── 12-month time-series data (Apr 2025 – Mar 2026) ─────
const ALL_INCOME_SPEND = [
  { month: "Apr", income: 420, spent: 398, saved: 22 },
  { month: "May", income: 420, spent: 385, saved: 35 },
  { month: "Jun", income: 420, spent: 390, saved: 30 },
  { month: "Jul", income: 450, spent: 405, saved: 45 },
  { month: "Aug", income: 450, spent: 395, saved: 55 },
  { month: "Sep", income: 450, spent: 388, saved: 62 },
  { month: "Oct", income: 450, spent: 378, saved: 72 },
  { month: "Nov", income: 450, spent: 360, saved: 90 },
  { month: "Dec", income: 450, spent: 369, saved: 81 },
  { month: "Jan", income: 450, spent: 320, saved: 130 },
  { month: "Feb", income: 450, spent: 333, saved: 117 },
  { month: "Mar", income: 450, spent: 175, saved: 275 },
];

const ALL_CASHFLOW = [
  { month: "Apr", in: 420, out: 398 },
  { month: "May", in: 420, out: 385 },
  { month: "Jun", in: 420, out: 390 },
  { month: "Jul", in: 450, out: 405 },
  { month: "Aug", in: 450, out: 395 },
  { month: "Sep", in: 450, out: 388 },
  { month: "Oct", in: 450, out: 378 },
  { month: "Nov", in: 450, out: 360 },
  { month: "Dec", in: 450, out: 369 },
  { month: "Jan", in: 450, out: 320 },
  { month: "Feb", in: 450, out: 333 },
  { month: "Mar", in: 450, out: 175 },
];

const ALL_NETWORTH = [
  { month: "Apr", nw: 185 },
  { month: "May", nw: 220 },
  { month: "Jun", nw: 255 },
  { month: "Jul", nw: 300 },
  { month: "Aug", nw: 360 },
  { month: "Sep", nw: 470 },
  { month: "Oct", nw: 560 },
  { month: "Nov", nw: 640 },
  { month: "Dec", nw: 700 },
  { month: "Jan", nw: 780 },
  { month: "Feb", nw: 900 },
  { month: "Mar", nw: 1070 },
];

// ── Category trend data (6 months available) ────────────
const TREND_MONTHS_6M = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"] as const;

const CAT_TREND_ROWS = [
  { cat: "🍔 Food & Dining", vals: [67, 68, 70, 73, 74, 82], trend: "↑ +12%", trendDir: "up"   as const },
  { cat: "🔄 Subscriptions", vals: [34, 34, 34, 34, 34, 34], trend: "→ 0%",  trendDir: "flat"  as const },
  { cat: "🚗 Transport",     vals: [33, 32, 30, 31, 30, 28], trend: "↓ -8%", trendDir: "down"  as const },
  { cat: "🛍️ Shopping",      vals: [8,  9,  12, 11, 15, 19], trend: "↑ +22%", trendDir: "up"   as const },
  { cat: "⚡ Utilities",     vals: [14, 13, 14, 13, 13, 12], trend: "↓ -3%", trendDir: "down"  as const },
];

// ── Static data (not time-filtered) ─────────────────────
const categoryData = [
  { name: "Food & Dining", value: 82, pct: 47, color: "var(--green)", change: "+12%", changeDir: "up" },
  { name: "Subscriptions", value: 34, pct: 19, color: "var(--gold)", change: "—", changeDir: "neutral" },
  { name: "Transport", value: 28, pct: 16, color: "#4A90D9", change: "-8%", changeDir: "down" },
  { name: "Shopping", value: 19, pct: 11, color: "#9B59B6", change: "+22%", changeDir: "up" },
  { name: "Other", value: 12, pct: 7, color: "var(--muted)", change: "-3%", changeDir: "down" },
];

const portfolioData = [
  { name: "MMF (ARM)", value: 188, color: "#4A90D9", pct: 31 },
  { name: "Treasury Bills", value: 152, color: "#00C48C", pct: 25 },
  { name: "Emergency Fund", value: 180, color: "#F5A623", pct: 30 },
  { name: "NGX Equities", value: 85, color: "#9B59B6", pct: 14 },
];

const portfolioGrowth = [
  { month: "Jan", value: 400 },
  { month: "Feb", value: 480 },
  { month: "Mar", value: 560 },
  { month: "Now", value: 605 },
];

const holdingsData = [
  { name: "ARM Money Market Fund", type: "Money Market · Liquid 48hrs", invested: "₦160,000", value: "₦188,000", returnN: "+₦28,000", returnPct: "+17.5%", yieldPa: "16.4%", trend: "up" },
  { name: "GTBank T-Bills", type: "Treasury Bills · 91-day", invested: "₦140,000", value: "₦152,000", returnN: "+₦12,000", returnPct: "+8.6%", yieldPa: "18.2%", trend: "up" },
  { name: "Emergency Fund (MMF)", type: "ARM MMF · Emergency Reserve", invested: "₦180,000", value: "₦180,000", returnN: "+₦0", returnPct: "0%", yieldPa: "16.4%", trend: "flat" },
  { name: "NGX Equities — GTCO", type: "Nigerian Stock Exchange", invested: "₦50,000", value: "₦85,000", returnN: "+₦35,000", returnPct: "+70%", yieldPa: "—", trend: "up" },
];

const transactions = [
  { icon: "🍔", bg: "#FEF9E7", name: "Chicken Republic", cat: "Food & Dining", date: "Mar 20", amt: "-₦4,800", type: "debit" },
  { icon: "💰", bg: "#E8F5E9", name: "March Salary", cat: "Income · GTBank", date: "Mar 19", amt: "+₦450,000", type: "credit" },
  { icon: "🚗", bg: "#E3F2FD", name: "Bolt Nigeria", cat: "Transport", date: "Mar 18", amt: "-₦2,200", type: "debit" },
  { icon: "🎬", bg: "#FCE4EC", name: "Netflix", cat: "Subscriptions", date: "Mar 15", amt: "-₦4,400", type: "debit" },
  { icon: "🍔", bg: "#FEF9E7", name: "Domino's Pizza", cat: "Food & Dining", date: "Mar 14", amt: "-₦8,600", type: "debit" },
  { icon: "🎵", bg: "#F3E5F5", name: "Spotify Premium", cat: "Subscriptions", date: "Mar 10", amt: "-₦2,700", type: "debit" },
  { icon: "🏦", bg: "#E8F5E9", name: "ARM MMF Transfer", cat: "Investment · Agent Action", date: "Mar 9", amt: "₦80,000", type: "invest" },
];

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

// ── Main component ───────────────────────────────────────
export function AnalyticsDashboard() {
  const router = useRouter();
  const { preFillInput } = useChatStore();

  const [timeframe, setTimeframe] = useState("3M");
  const [ivsView, setIvsView] = useState<"stacked" | "line" | "area">("stacked");
  const [catView, setCatView] = useState<"donut" | "bars">("donut");
  const [txnFilter, setTxnFilter] = useState("All Categories");

  // Expandable sections states
  const [expandTrends, setExpandTrends] = useState(false);
  const [expandTxns, setExpandTxns] = useState(false);
  const [expandHoldings, setExpandHoldings] = useState(false);

  // ── Timeframe → slice count ──────────────────────────
  const visibleCount = timeframe === "1M" ? 1 : timeframe === "3M" ? 3 : timeframe === "6M" ? 6 : 12;

  // ── Sliced chart data ────────────────────────────────
  const incomeVsSpendData = ALL_INCOME_SPEND.slice(-visibleCount);
  const cashflowData      = ALL_CASHFLOW.slice(-visibleCount);
  const networthData      = ALL_NETWORTH.slice(-visibleCount);

  // Category trend table: cap at 6 available months
  const catVisibleCount  = Math.min(visibleCount, 6);
  const catVisibleMonths = TREND_MONTHS_6M.slice(-catVisibleCount);

  // ── Chat navigation helper ───────────────────────────
  const goToChat = useCallback((question: string) => {
    preFillInput(question);
    router.push("/chat");
  }, [preFillInput, router]);

  const TIMEFRAMES = ["1M", "3M", "6M", "1Y", "All"];

  const filteredTxns = txnFilter === "All Categories"
    ? transactions
    : transactions.filter((t) => t.cat.startsWith(txnFilter));

  const visibleTrendRows = expandTrends ? CAT_TREND_ROWS : CAT_TREND_ROWS.slice(0, 3);
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
        <Kpi label="Avg Monthly Income" value="₦450k" delta="↑ Stable · 3 months" deltaDir="up" />
        <Kpi label="Avg Monthly Spend" value="₦166k" delta="↑ +₦8k vs prev period" deltaDir="up" />
        <Kpi label="Savings Rate" value="61%" delta="↑ +9pts vs prev period" deltaDir="up" />
        <Kpi label="Net Worth" value="₦1.07M" delta="↑ +₦285k this period" deltaDir="up" />
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
              <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2" style={{ color: "rgba(255,255,255,.5)" }}>Financial Health · March 2026</div>
              <div className="text-[20px] font-semibold mb-2" style={{ fontFamily: "var(--font-dm-serif)", lineHeight: 1.3 }}>
                You're in strong shape, Tunde.<br />Your savings rate is 3× the national average.
              </div>
              <div className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,.7)" }}>
                You saved ₦275,000 this month — more than most Nigerians earn. But your food spending rose 12% and you're paying ₦22,800/year in unnecessary credit card interest. Two things to fix.
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="relative">
                <HealthRing score={78} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[22px] font-bold" style={{ fontFamily: "var(--font-dm-serif)" }}>78</div>
                  <div className="text-[10px]" style={{ color: "rgba(255,255,255,.55)" }}>/100</div>
                </div>
              </div>
              <div className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,.5)" }}>Health Score</div>
            </div>
          </div>

          {/* Insight tiles */}
          <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
            {([
              {
                icon: "💰", label: "Savings Rate", value: "61%", delta: "↑ +9pts vs last month", type: "positive",
                question: "My savings rate is 61% this month. How do I keep this up and what should I do with the extra savings?",
              },
              {
                icon: "📈", label: "Net Worth Growth", value: "+₦285k", delta: "↑ +36% in 3 months", type: "positive",
                question: "My net worth grew ₦285k in 3 months. How do I accelerate this?",
              },
              {
                icon: "🍔", label: "Food Spending", value: "₦82k", delta: "↑ +12% vs Feb · Watch this", type: "warning",
                question: "My food spending rose 12% last month. Help me bring it down without misery.",
              },
              {
                icon: "💳", label: "Credit Card Debt", value: "₦95k", delta: "24% APR · Costs ₦22.8k/yr", type: "alert",
                question: "I have ₦95k in credit card debt at 24% APR. What's the fastest way to clear this?",
              },
            ] as const).map((item) => (
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
                &ldquo;You&rsquo;re doing the fundamentals right — savings rate climbing, investments growing. Two moves will take your score from 78 to 90: eliminate the credit card this month, and put a hard cap on food delivery. Those two changes are worth ₦60,000 a year back in your pocket.&rdquo;
              </div>
              <div className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,.45)" }}>The Contrarian Investor · Based on your DataBank</div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => goToChat("I just reviewed my financial health score. Let's talk about how to improve it from 78 to 90.")}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold transition-all duration-150 cursor-pointer"
              style={{ background: "var(--green)", color: "#fff", border: "none" }}
            >
              Discuss With My Buddy →
            </button>
            <button
              onClick={() => goToChat("I want to discuss how to pay off my ₦95k credit card debt and save ₦22.8k/yr.")}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-medium border cursor-pointer"
              style={{ color: "rgba(255,255,255,.75)", borderColor: "rgba(255,255,255,.2)", background: "transparent" }}
            >
              ⚡ Pay Off Credit Card Now
            </button>
          </div>
        </div>
      </div>

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
              <div className="flex flex-col gap-[10px]">
                {incomeVsSpendData.map((d) => {
                  const isCurrent = d.month === "Mar";
                  const spentPct = Math.round((d.spent / d.income) * 100);
                  const savedPct = 100 - spentPct;
                  return (
                    <div key={d.month} className="flex items-center gap-3">
                      <div className="text-right text-[11px] flex-shrink-0 font-semibold" style={{ width: 28, color: isCurrent ? "var(--green)" : "var(--muted)", fontWeight: isCurrent ? 700 : 400 }}>{d.month}</div>
                      <div
                        className="flex-1 flex overflow-hidden rounded-[6px]"
                        style={{
                          height: 28,
                          background: "var(--bg)",
                          outline: isCurrent ? "2px solid rgba(0,196,140,.3)" : "none",
                          outlineOffset: 1,
                        }}
                      >
                        <div className="flex items-center" style={{ width: `${spentPct}%`, background: "rgba(0,196,140,.2)", paddingLeft: 8 }}>
                          <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: "var(--green2)" }}>₦{d.spent}k</span>
                        </div>
                        <div className="flex items-center justify-center" style={{ width: `${savedPct}%`, background: "var(--green)", borderRadius: "0 6px 6px 0" }}>
                          <span className="text-[10px] font-bold text-white whitespace-nowrap">₦{d.saved}k{isCurrent ? " ↑" : ""}</span>
                        </div>
                      </div>
                      <div className="text-right text-[11px] font-semibold flex-shrink-0" style={{ width: 40, color: isCurrent ? "var(--green)" : "var(--text)" }}>₦{d.income}k</div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--muted)" }}>
                  <div style={{ width: 16, height: 10, borderRadius: 3, background: "rgba(0,196,140,.2)" }} />
                  Spent
                </div>
                <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--muted)" }}>
                  <div style={{ width: 16, height: 10, borderRadius: 3, background: "var(--green)" }} />
                  Saved
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
            sub="Mar 2026 · ₦175,200"
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
                <div className="flex flex-col gap-2 flex-1">
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
                  <div className="text-[26px] font-semibold" style={{ color: "var(--green2)", fontFamily: "var(--font-dm-serif)" }}>61%</div>
                  <div className="text-[11px]" style={{ color: "var(--muted)" }}>Target: 50% · ✓ Exceeding</div>
                </div>
                <SmallRing pct={61} color="var(--green)" />
              </div>

              {/* Budget bars */}
              {[
                { label: "50/30/20 Rule", pct: 80, color: "var(--green)" },
                { label: "Debt-to-Income", pct: 21, color: "#F5A623" },
                { label: "Emergency Fund", pct: 53, color: "#4A90D9" },
                { label: "Investment Rate", pct: 38, color: "#9B59B6" },
              ].map((row, i) => {
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
                  const visibleIdxs = catVisibleMonths.map((m) => TREND_MONTHS_6M.indexOf(m));
                  const total = visibleIdxs.reduce((s, i) => s + row.vals[i], 0);
                  return (
                    <tr key={row.cat} style={{ borderBottom: "1px solid var(--border)", borderBottomStyle: "solid", borderBottomWidth: 1, borderBottomColor: "var(--border)" }}>
                      <td style={{ padding: "11px 12px", fontSize: 13, color: "var(--text)" }}>{row.cat}</td>
                      {visibleIdxs.map((idx) => (
                        <td key={idx} style={{ padding: "11px 8px", textAlign: "right", fontSize: 13 }}>₦{row.vals[idx]}k</td>
                      ))}
                      <td style={{ padding: "11px 8px", textAlign: "right", fontSize: 13, fontWeight: 600, color: trendColor }}>{row.trend}</td>
                      <td style={{ padding: "11px 8px", textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>₦{total}k</td>
                      <td style={{ padding: "11px 8px" }}>
                        <button
                          onClick={() => goToChat(`${row.cat.replace(/^\S+\s/, "")} spending is {row.trend}. What should I do?`)}
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
          {CAT_TREND_ROWS.length > 3 && (
            <div className="flex justify-center mt-3">
              <button
                onClick={() => setExpandTrends(!expandTrends)}
                className="px-4 py-2 rounded-[8px] text-[11px] font-semibold border transition-all duration-150 hover:opacity-80"
                style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)", cursor: "pointer" }}
              >
                {expandTrends ? "View Less" : `View More (${CAT_TREND_ROWS.length - 3} more)`}
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
            {visibleTxns.map((txn) => (
              <div key={txn.name + txn.date} className="flex items-center gap-3 py-3" style={{ borderBottom: "1px solid var(--border)", borderBottomStyle: "solid", borderBottomWidth: 1, borderBottomColor: "var(--border)" }}>
                <div className="flex items-center justify-center rounded-[8px] text-[14px] flex-shrink-0" style={{ width: 36, height: 36, background: txn.bg }}>{txn.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{txn.name}</div>
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
          <Kpi label="Portfolio Value" value="₦605k" delta="↑ +₦38k this month" deltaDir="up" />
          <Kpi label="Total Invested" value="₦530k" delta="Across 4 instruments" deltaDir="neutral" />
          <Kpi label="Total Return" value="+₦75k" delta="↑ +14.2% overall" deltaDir="up" />
          <Kpi label="Avg Yield p.a." value="15.8%" delta="↑ vs 5.5% savings rate" deltaDir="up" />
        </div>

        {/* Portfolio Allocation & Growth */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {/* Portfolio Allocation Donut */}
          <ChartCard
            title="Portfolio Allocation"
            sub="₦605,000 total"
            action="Ask buddy →"
            onAction={() => goToChat("My portfolio grew to ₦605k. Am I invested in the right mix?")}
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
              <div className="flex flex-col gap-2 flex-1">
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

          {/* Portfolio Growth */}
          <ChartCard
            title="Portfolio Growth"
            sub="Jan – Mar 2026"
            action="Ask buddy →"
            onAction={() => goToChat("My portfolio grew to ₦605k. Am I invested in the right mix?")}
          >
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={portfolioGrowth} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4A90D9" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#4A90D9" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${v}k`} domain={[300, 700]} />
                <Tooltip formatter={(v) => `₦${v}k`} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="value" stroke="#4A90D9" strokeWidth={2.5} fill="url(#portGrad)" dot={{ r: 4, fill: "#4A90D9", stroke: "var(--card)", strokeWidth: 2 }} name="Portfolio" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Holdings & Returns Table (Expandable) */}
        <ChartCard
          title="Holdings & Returns"
          action="Ask buddy →"
          onAction={() => goToChat("My portfolio grew to ₦605k. Am I invested in the right mix?")}
        >
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
          sub={`${networthData[0]?.month ?? "Oct"} – Mar 2026`}
          action="Ask buddy →"
          onAction={() => goToChat("My net worth hit ₦1.07M. What's my next milestone and how do I get there?")}
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
        <ChartCard title="Assets vs. Liabilities" sub="March 2026 snapshot">
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-3" style={{ color: "var(--green2)" }}>Assets · ₦1,165,000</div>
              <div className="flex flex-col gap-2">
                {[
                  { name: "ARM MMF", value: "₦188,000", pct: 16 },
                  { name: "Treasury Bills", value: "₦152,000", pct: 13 },
                  { name: "Emergency Fund", value: "₦180,000", pct: 15 },
                  { name: "NGX Equities", value: "₦85,000", pct: 7 },
                  { name: "GTBank Savings", value: "₦560,000", pct: 48 },
                ].map((a, i) => (
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
              <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-3" style={{ color: "#E24B4A" }}>Liabilities · ₦95,000</div>
              <div className="flex flex-col gap-2">
                {[{ name: "GTBank Credit Card", value: "₦95,000", pct: 100 }].map((l, i) => (
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
              </div>
              <div className="mt-4 p-3 rounded-[10px] text-[12px]" style={{ background: "rgba(226,75,74,.06)", border: "1px solid rgba(226,75,74,.15)", color: "var(--muted)", lineHeight: 1.6 }}>
                💡 Eliminating this ₦95k debt at 24% APR saves ₦22,800/yr — equivalent to a guaranteed 24% return.
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
