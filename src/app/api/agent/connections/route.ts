import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    {
      id: "conn-gtbank",
      emoji: "🏦",
      bg: "#E8F5E9",
      name: "GTBank",
      status: "Connected · Read + Execute",
      detail: "Acc: ••••4521 · Balance visible · Transfers enabled up to ₦50k/action",
    },
    {
      id: "conn-arm",
      emoji: "📈",
      bg: "#E3F2FD",
      name: "ARM Investment",
      status: "Connected · Execute enabled",
      detail: "MMF + Eurobond portfolio visible · Deposits enabled · Balance: ₦380,000",
    },
  ]);
}
