import { createClient } from "@/lib/supabase/server";
import { syncGmailForUser } from "@/lib/gmail";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncGmailForUser(user.id);
    return Response.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return Response.json({ error: message }, { status: 500 });
  }
}

