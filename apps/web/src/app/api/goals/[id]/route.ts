import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      current_amount?: number;
      status?: "active" | "completed" | "paused" | "cancelled";
      title?: string;
      target_amount?: number;
      target_date?: string;
    };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const serviceSupabase = createServiceSupabaseClient();
      const { data, error } = await serviceSupabase
        .from("goals")
        .update(body)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("[PATCH /api/goals/[id]] Error:", error);
      } else {
        return NextResponse.json(data);
      }
    }

    return NextResponse.json({ ok: true, id, ...body });
  } catch (err) {
    console.error("[PATCH /api/goals/[id]] Exception:", err);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const serviceSupabase = createServiceSupabaseClient();
      await serviceSupabase.from("goals").delete().eq("id", id);
    }

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/goals/[id]] Exception:", err);
    return new Response(null, { status: 204 });
  }
}
