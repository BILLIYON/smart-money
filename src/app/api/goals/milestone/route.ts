import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { goalId } = await req.json();
  // TODO: record milestone event, trigger buddy notification
  return NextResponse.json({ ok: true, goalId, celebratedAt: new Date().toISOString() });
}
