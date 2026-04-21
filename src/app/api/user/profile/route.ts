import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

export async function GET() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from("users")
    .select("currency, full_name, email")
    .eq("id", userId)
    .single();

  if (dbError || !data) return NextResponse.json({ currency: "NGN", full_name: null, email: null });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const body = (await req.json()) as { currency?: string };

  if (body.currency && !SUPPORTED_CURRENCIES.includes(body.currency)) {
    return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.currency) updates.currency = body.currency;

  const { error: dbError } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
