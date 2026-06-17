import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "unauth" }, { status: 401 });
  }

  // Get stored access token
  const { data } = await supabase
    .from("user_integrations")
    .select("access_token")
    .eq("user_id", user.id)
    .eq("provider", "gmail")
    .single();

  // Tell Google to revoke — best-effort, don't block on failure
  if (data?.access_token) {
    try {
      await oauth2Client.revokeToken(decrypt(data.access_token));
    } catch (err) {
      console.warn("[gmail/revoke] Google revocation failed (continuing):", err);
    }
  }

  // Remove integration record
  await supabase
    .from("user_integrations")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", "gmail");

  // Remove all gmail-sourced databank entries
  await supabase
    .from("databank_entries")
    .delete()
    .eq("user_id", user.id)
    .eq("source", "gmail");

  return Response.json({ success: true });
}

