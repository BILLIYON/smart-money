// This route is called by Vercel Cron — not by users
import { syncGmailForUser } from "@/lib/gmail";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(req: Request) {
  // Verify this is called by Vercel Cron, not random requests
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get all users with Gmail connected
  const { data: integrations } = await supabase
    .from("user_integrations")
    .select("user_id")
    .eq("provider", "gmail");

  if (!integrations?.length) {
    return Response.json({ message: "No Gmail users to sync" });
  }

  // Sync each user — stagger to avoid Gmail rate limits
  let synced = 0;
  for (const { user_id } of integrations) {
    try {
      const result = await syncGmailForUser(user_id, true, undefined, true);
      synced += Array.isArray(result) ? result.length : 0;
    } catch (err) {
      console.error(`Gmail sync failed for ${user_id}:`, err);
    }
    // 500ms gap between users
    await new Promise((r) => setTimeout(r, 500));
  }

  return Response.json({ synced, users: integrations.length });
}
