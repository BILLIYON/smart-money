import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json() as {
    entry_type: "income" | "expense" | "subscription" | "asset" | "debt";
    amount: number;        // kobo
    description: string;
    date: string;          // ISO date
    category?: string;
  };

  const { entry_type, amount, description, date, category } = body;

  if (!entry_type || !amount || !description || !date) {
    return NextResponse.json(
      { error: "entry_type, amount, description, and date are required" },
      { status: 400 }
    );
  }

  const { data, error: dbError } = await supabase
    .from("databank_entries")
    .insert({
      user_id: userId,
      source: "manual",
      entry_type,
      amount,
      description,
      category: category ?? "other",
      entry_date: date,
    })
    .select("id")
    .single();

  if (dbError) {
    console.error("[/api/databank/manual]", dbError);
    return NextResponse.json({ error: "Failed to save entry" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
