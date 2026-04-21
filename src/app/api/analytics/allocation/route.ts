import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

type AllocationItem = {
  label: string;
  icon: string;
  pct: number;
  amountKobo: number;
  amountFormatted: string;
  color: string;
  reason: string;
};

type AllocationResponse = {
  totalKobo: number;
  totalFormatted: string;
  allocations: AllocationItem[];
  buddyTake: string;
  buddyId: string;
  buddyName: string;
};

function formatNaira(kobo: number): string {
  const naira = Math.floor(kobo / 100);
  return `₦${naira.toLocaleString("en-NG")}`;
}

/**
 * GET /api/analytics/allocation?amount=<kobo>
 * Returns a rule-based salary allocation plan for the given amount.
 * Called by the SalaryMomentOverlay immediately on credit detection.
 */
export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const url = new URL(req.url);
  const amountKobo = parseInt(url.searchParams.get("amount") ?? "0", 10);

  if (amountKobo <= 0) {
    return NextResponse.json({ error: "amount must be a positive number in kobo" }, { status: 400 });
  }

  // ── Rule-based allocation ─────────────────────────────────
  // Tuned for Nigerian salary earners: prioritise yield over idle savings.
  const RULES: { label: string; icon: string; pct: number; color: string; reason: string }[] = [
    {
      label: "T-Bills / Money Market",
      icon: "📈",
      pct: 35,
      color: "#00C48C",
      reason: "Park the bulk where it earns 18-22% p.a. — better than any savings rate.",
    },
    {
      label: "Savings Buffer",
      icon: "💰",
      pct: 25,
      color: "#F5A623",
      reason: "Liquid reserve for next 30 days. No investments until this is set.",
    },
    {
      label: "Emergency Fund",
      icon: "🛡️",
      pct: 20,
      color: "#4A90D9",
      reason: "Building your 3-month buffer. Non-negotiable until it hits ₦1.35M.",
    },
    {
      label: "Debt / Goals",
      icon: "🎯",
      pct: 15,
      color: "#9B59B6",
      reason: "Chip at any outstanding debt or advance an active goal — whichever yields more.",
    },
    {
      label: "Discretionary",
      icon: "🎉",
      pct: 5,
      color: "#E24B4A",
      reason: "This is guilt-free. Spend it without tracking — you earned it.",
    },
  ];

  const allocations: AllocationItem[] = RULES.map((r) => {
    const amountKoboItem = Math.floor(amountKobo * r.pct / 100);
    return {
      label: r.label,
      icon: r.icon,
      pct: r.pct,
      amountKobo: amountKoboItem,
      amountFormatted: formatNaira(amountKoboItem),
      color: r.color,
      reason: r.reason,
    };
  });

  const buddyTake =
    `${formatNaira(Math.floor(amountKobo * 35 / 100))} goes to work immediately in T-Bills. ` +
    `The rest covers your liquidity needs. ` +
    `This is a first pass — open chat and we'll fine-tune it around your debt and goals.`;

  const response: AllocationResponse = {
    totalKobo: amountKobo,
    totalFormatted: formatNaira(amountKobo),
    allocations,
    buddyTake,
    buddyId: "contrarian",
    buddyName: "The Contrarian Investor",
  };

  return NextResponse.json(response);
}
