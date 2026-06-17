import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ chips: ["⚠️ No data connected"] });
  }

  const userId = user.id;


  const [uploadRes, gmailRes, signalRes] = await Promise.all([
    supabase
      .from("databank_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("source", "upload"),

    supabase
      .from("user_integrations")
      .select("provider")
      .eq("user_id", userId)
      .eq("provider", "gmail")
      .maybeSingle(),

    supabase
      .from("user_signal_sources")
      .select("source_id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const chips: string[] = [];
  if ((uploadRes.count ?? 0) > 0) chips.push("📊 Statement");
  if (gmailRes.data) chips.push("📧 Gmail");
  if ((signalRes.count ?? 0) > 0) chips.push("📰 Signals");

  if (chips.length === 0) {
    return NextResponse.json({ chips: ["⚠️ No data connected"] });
  }

  return NextResponse.json({ chips });
}
