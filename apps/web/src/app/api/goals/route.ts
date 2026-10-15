import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

export async function GET() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { data, error: dbError } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (dbError) {
    console.error("[GET /api/goals]", dbError);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json() as {
    title: string;
    target_amount: number;   // kobo
    current_amount?: number; // kobo
    target_date?: string;    // ISO date
    buddy_id?: string;
  };

  const { title, target_amount, current_amount = 0, target_date, buddy_id } = body;

  if (!title || !target_amount) {
    return NextResponse.json(
      { error: "title and target_amount are required" },
      { status: 400 }
    );
  }

  const { data, error: dbError } = await supabase
    .from("goals")
    .insert({
      user_id: userId,
      buddy_id: buddy_id ?? null,
      title,
      target_amount,
      current_amount,
      target_date: target_date ?? null,
      status: "active",
    })
    .select()
    .single();

  if (dbError) {
    console.error("[POST /api/goals]", dbError);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
