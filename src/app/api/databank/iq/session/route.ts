import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { generateIQSession } from "@/lib/databank-iq-generator";
import { applyMerchantRules } from "@/lib/merchant-rules";

export async function GET(req: Request) {
  try {
    const { userId, error } = await requireAuth();
    if (error || !userId) {
      return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-apply any existing merchant rules first before generating quiz session
    await applyMerchantRules(userId).catch((err) =>
      console.warn("[iq/session] applyMerchantRules error:", err)
    );

    const sessionData = await generateIQSession(userId);

    return NextResponse.json({
      success: true,
      session: sessionData,
    });
  } catch (err: any) {
    console.error("[iq/session] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate DataBank IQ session" },
      { status: 500 }
    );
  }
}
