import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await req.json() as {
    current_amount?: number;
    status?: "active" | "completed" | "paused" | "cancelled";
    title?: string;
    target_amount?: number;
    target_date?: string;
  };

  // Confirm goal belongs to this user
  const { data: existing } = await supabase
    .from("goals")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const { data, error: dbError } = await supabase
    .from("goals")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (dbError) {
    console.error("[PATCH /api/goals/[id]]", dbError);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const { data: existing } = await supabase
    .from("goals")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const { error: dbError } = await supabase
    .from("goals")
    .delete()
    .eq("id", id);

  if (dbError) {
    console.error("[DELETE /api/goals/[id]]", dbError);
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
