import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

export async function GET() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { data: user, error: dbError } = await supabase
    .from("users")
    .select("limit_per_action, limit_daily, limit_monthly")
    .eq("id", userId)
    .single();

  if (dbError || !user) {
    console.error("[GET /api/agent/limits]", dbError);
    return NextResponse.json({ error: "Failed to fetch user limits" }, { status: 500 });
  }

  return NextResponse.json({
    limitPerAction: Number(user.limit_per_action),
    limitDaily: Number(user.limit_daily),
    limitMonthly: Number(user.limit_monthly),
  });
}

export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  try {
    const { limitPerAction, limitDaily, limitMonthly } = await req.json() as {
      limitPerAction: number;
      limitDaily: number;
      limitMonthly: number;
    };

    if (
      typeof limitPerAction !== "number" || limitPerAction < 0 ||
      typeof limitDaily !== "number" || limitDaily < 0 ||
      typeof limitMonthly !== "number" || limitMonthly < 0
    ) {
      return NextResponse.json({ error: "All limits must be non-negative numbers (kobo)" }, { status: 400 });
    }

    const { error: dbError } = await supabase
      .from("users")
      .update({
        limit_per_action: limitPerAction,
        limit_daily: limitDaily,
        limit_monthly: limitMonthly,
      })
      .eq("id", userId);

    if (dbError) {
      console.error("[POST /api/agent/limits]", dbError);
      return NextResponse.json({ error: "Failed to update limits" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/agent/limits] Parsing error:", err);
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
