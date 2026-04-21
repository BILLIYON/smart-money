import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    {
      id: "h-1",
      status: "done",
      title: "₦80,000 → Stanbic IBTC MMF",
      buddy: "Contrarian Investor",
      date: "Mar 3",
      outcome: "Yielding 15.8%",
    },
    {
      id: "h-2",
      status: "done",
      title: "₦95,000 → GTBank Credit Card (payoff)",
      buddy: "Contrarian Investor",
      date: "Mar 1",
      outcome: "Debt eliminated",
    },
    {
      id: "h-3",
      status: "done",
      title: "Spotify subscription cancelled",
      buddy: "The Frugalist",
      date: "Feb 28",
      outcome: "Saves ₦2,700/mo",
    },
    {
      id: "h-4",
      status: "declined",
      title: "₦150,000 → Cowrywise T-bill",
      buddy: "Contrarian Investor",
      date: "Feb 26",
      outcome: "Decided to keep liquid",
    },
  ]);
}
