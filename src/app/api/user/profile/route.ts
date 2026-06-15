import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

export async function GET() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from("users")
    .select("currency, full_name, email, primary_goal, risk_tolerance, income_range, plan")
    .eq("id", userId)
    .single();

  if (dbError || !data) {
    return NextResponse.json({
      currency: "NGN",
      full_name: null,
      email: null,
      primary_goal: null,
      risk_tolerance: null,
      income_range: null,
      plan: "free"
    });
  }
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const body = (await req.json()) as {
    currency?: string;
    full_name?: string;
    email?: string;
    primary_goal?: string;
    risk_tolerance?: string;
    income_range?: string;
  };

  if (body.currency && !SUPPORTED_CURRENCIES.includes(body.currency)) {
    return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.currency) updates.currency = body.currency;
  if (body.full_name !== undefined) updates.full_name = body.full_name;
  if (body.email !== undefined) updates.email = body.email;
  if (body.primary_goal !== undefined) updates.primary_goal = body.primary_goal;
  if (body.risk_tolerance !== undefined) updates.risk_tolerance = body.risk_tolerance;
  if (body.income_range !== undefined) updates.income_range = body.income_range;

  const { error: dbError } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
