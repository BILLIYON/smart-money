import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

export async function GET() {
  const { supabase, userId, error } = await requireAuth();
  if (error || !userId) {
    return NextResponse.json([]);
  }

  try {
    const [integrationsRes, uploadsRes] = await Promise.all([
      supabase.from("user_integrations").select("provider, last_synced_at").eq("user_id", userId),
      supabase.from("databank_entries").select("id").eq("user_id", userId).eq("source", "upload").limit(1),
    ]);

    const integrations = integrationsRes.data ?? [];
    const hasUploads = (uploadsRes.data ?? []).length > 0;

    const list = [];

    const gmail = integrations.find((i) => i.provider === "gmail");
    if (gmail) {
      list.push({
        id: "conn-gmail",
        emoji: "✉️",
        bg: "rgba(0,196,140,0.12)",
        name: "Gmail Bank Alerts",
        status: "Auto-Synced · Read Enabled",
        detail: "Extracting transaction alerts dynamically into DataBank",
      });
    }

    if (hasUploads) {
      list.push({
        id: "conn-upload",
        emoji: "📄",
        bg: "rgba(74,144,217,0.12)",
        name: "Uploaded Bank Statement",
        status: "Parsed & Active",
        detail: "Bank statement transaction records connected to your Agent",
      });
    }

    return NextResponse.json(list);
  } catch (err) {
    console.error("[api/agent/connections] Error fetching connections:", err);
    return NextResponse.json([]);
  }
}
