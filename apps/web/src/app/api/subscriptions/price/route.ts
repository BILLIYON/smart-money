import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getBuddy } from "@/lib/buddies";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const buddyId = searchParams.get("buddyId");

    if (!buddyId) {
      return NextResponse.json({ error: "buddyId is required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: dbBuddy, error: dbError } = await supabase
      .from("buddies")
      .select("name, price_monthly")
      .eq("id", buddyId)
      .maybeSingle();

    if (dbError) throw dbError;

    // Get static buddy catalogue details for USD reference
    const staticBuddy = getBuddy(buddyId);
    let priceUsd = 5.0; // fallback default
    if (staticBuddy && staticBuddy.price.startsWith("$")) {
      const parsed = parseFloat(staticBuddy.price.replace(/[^0-9.]/g, ""));
      if (!isNaN(parsed)) {
        priceUsd = parsed;
      }
    } else if (dbBuddy && dbBuddy.price_monthly) {
      // Fallback: convert NGN kobo to USD ($1 = ₦1,500)
      priceUsd = Math.max(1, Math.round((dbBuddy.price_monthly / 100 / 1500) * 100) / 100);
    }

    const priceKobo = dbBuddy?.price_monthly ?? (priceUsd * 1500 * 100); // ₦1500 rate
    const priceNaira = priceKobo / 100;

    return NextResponse.json({
      buddyId,
      name: dbBuddy?.name || staticBuddy?.name || buddyId,
      priceKobo,
      priceNaira,
      priceUsd,
    });
  } catch (err: any) {
    console.error("[GET /api/subscriptions/price] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load pricing" }, { status: 500 });
  }
}
