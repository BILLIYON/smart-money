/**
 * Static/mock data for the Opportunities tab (Goal Tracker screen) and
 * the partner-side "Send Opportunity" panel. Frontend-only — no backend
 * exists yet for opportunity records, signal-to-opportunity linking, or
 * partner-sent opportunities. Mirrors the same pattern as
 * src/components/partner/mockData.ts.
 */

export type OpportunityStatus = "active" | "acted" | "dismissed" | "missed";
export type OpportunitySource = "ai" | "partner";

export type Opportunity = {
  id: string;
  title: string;
  category: string;
  source: OpportunitySource;
  sourceName: string;
  sourceAvatar: string;
  sourceColor: string;
  reasoning: string;
  valueEstimate: string;
  status: OpportunityStatus;
  windowLabel: string;
};

export const OPPORTUNITIES: Opportunity[] = [
  {
    id: "op-1",
    title: "Move idle cash into a T-bill",
    category: "Rate Alert",
    source: "ai",
    sourceName: "The Contrarian Investor",
    sourceAvatar: "🎯",
    sourceColor: "#132952",
    reasoning:
      "T-bill yields are at 17%, the highest in six months, while your GTBank balance is earning 5.5%. Based on your DataBank, you have ₦180,000 sitting idle beyond your emergency fund target.",
    valueEstimate: "+₦20,700/yr vs current savings rate",
    status: "active",
    windowLabel: "Rate typically holds 2–3 weeks",
  },
  {
    id: "op-2",
    title: "Buy GTCO — trading below intrinsic value",
    category: "Investment",
    source: "partner",
    sourceName: "Stanbic Wealth Advisor",
    sourceAvatar: "🏛️",
    sourceColor: "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
    reasoning:
      "P/E of 3.2, dividend yield 8.4% — below the sector's 5-year average. You've discussed Nigerian bank exposure with your advisor in three sessions. This is within your stated equity tolerance.",
    valueEstimate: "8.4% dividend yield vs 5.5% savings rate",
    status: "active",
    windowLabel: "Price-dependent — reassess weekly",
  },
  {
    id: "op-3",
    title: "3-bedroom flat, Banana Island Road, Ikoyi",
    category: "Real Estate",
    source: "ai",
    sourceName: "Warren Buffett (Fan Sim)",
    sourceAvatar: "WB",
    sourceColor: "#2D5A2D",
    reasoning:
      "You told your buddy you wanted a property in Ikoyi with a ₦200M budget. This listing came in at ₦185M — 8% below 12-month comparable sales in the area. You didn't respond before it sold.",
    valueEstimate: "Was ₦15M under budget",
    status: "missed",
    windowLabel: "Listed Mar 12 · Sold Mar 19",
  },
  {
    id: "op-4",
    title: "Cancel unused Netflix subscription",
    category: "Spending",
    source: "ai",
    sourceName: "The Frugalist",
    sourceAvatar: "🌱",
    sourceColor: "#1A5E1A",
    reasoning: "No usage detected in 23 days based on your receipt data. Redirecting this to your emergency fund would close the gap faster.",
    valueEstimate: "+₦4,400/mo",
    status: "acted",
    windowLabel: "Acted on Mar 4",
  },
  {
    id: "op-5",
    title: "Crypto DCA window — BTC dip",
    category: "Investment",
    source: "ai",
    sourceName: "Grant Cardone (Fan Sim)",
    sourceAvatar: "GC",
    sourceColor: "#3A1060",
    reasoning: "BTC touched your stated DCA entry price. You've mentioned wanting crypto exposure but haven't set an allocation limit yet.",
    valueEstimate: "N/A — price-dependent",
    status: "dismissed",
    windowLabel: "Dismissed Feb 28 — \"not right now\"",
  },
];

export function opportunityStats(list: Opportunity[]) {
  const active = list.filter((o) => o.status === "active").length;
  const acted = list.filter((o) => o.status === "acted").length;
  const missed = list.filter((o) => o.status === "missed").length;
  return { active, acted, missed, total: list.length };
}

/* ── Partner-side "Send Opportunity" mock data ── */
export const OPPORTUNITIES_SENT = [
  { client: "Kunle Okafor", title: "Buy GTCO — trading below intrinsic value", status: "Active", sentAgo: "2 days ago" },
  { client: "Tunde Kamara", title: "3-month T-bill window", status: "Acted On", sentAgo: "1 week ago" },
  { client: "Biodun James", title: "REIT allocation opportunity", status: "Missed", sentAgo: "3 weeks ago" },
];
