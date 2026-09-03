import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { fetchRealtimeAnalytics, fetchHistoricalAnalytics } from "@/lib/google-analytics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.is_admin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "report";
    const daysParam = parseInt(searchParams.get("days") || "7", 10);
    const days = isNaN(daysParam) ? 7 : daysParam;

    if (mode === "realtime") {
      const realtimeData = await fetchRealtimeAnalytics();
      return NextResponse.json({ success: true, mode: "realtime", data: realtimeData });
    }

    const reportData = await fetchHistoricalAnalytics(days);
    return NextResponse.json({ success: true, mode: "report", data: reportData });
  } catch (err: any) {
    console.error("[/api/admin/analytics] Error:", err?.message || err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to fetch live Google Analytics data",
        configured: false,
      },
      { status: 500 }
    );
  }
}
