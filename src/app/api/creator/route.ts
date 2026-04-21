import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    earnings: 186000,
    gross: 265714,
    sharePercent: 70,
    totalSubscribers: 124,
    newSubscribersThisMonth: 18,
    avgRating: 4.8,
    avgSessionMinutes: 8.2,
    avgSessionDelta: 1.4,
    verified: false, // withdraw locked until verified
    buddies: [
      {
        id: "buddy-aggressive",
        emoji: "🎯",
        avatarBg: "rgba(245,166,35,.15)",
        name: "The Aggressive Investor",
        price: "₦1,500/mo",
        model: "GPT-4",
        category: "Investing",
        subscribers: 98,
        rating: 4.9,
        monthlyRevenue: 102900,
        status: "live",
      },
      {
        id: "buddy-steady",
        emoji: "⚖️",
        avatarBg: "rgba(0,196,140,.12)",
        name: "The Steady Builder",
        price: "₦800/mo",
        model: "Claude",
        category: "Balanced",
        subscribers: 26,
        rating: 4.6,
        monthlyRevenue: 14560,
        status: "live",
      },
      {
        id: "buddy-cfo",
        emoji: "🚧",
        avatarBg: "var(--bg)",
        name: "The Entrepreneur's CFO",
        price: "₦2,000/mo",
        model: "Gemini",
        category: "Business",
        subscribers: null,
        rating: null,
        monthlyRevenue: null,
        status: "review",
      },
    ],
  });
}
