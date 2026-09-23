import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { getMerchantRules, deleteMerchantRule, upsertMerchantRule } from "@/lib/merchant-rules";

export async function GET(req: Request) {
  try {
    const { userId, error } = await requireAuth();
    if (error || !userId) {
      return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rules = await getMerchantRules(userId);
    return NextResponse.json({ success: true, rules });
  } catch (err: any) {
    console.error("[iq/rules] GET Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch merchant rules" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, error } = await requireAuth();
    if (error || !userId) {
      return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { merchantName, category, intent } = await req.json();
    if (!merchantName || !category) {
      return NextResponse.json({ error: "merchantName and category are required" }, { status: 400 });
    }

    const rule = await upsertMerchantRule(userId, merchantName, category, intent);
    return NextResponse.json({ success: true, rule });
  } catch (err: any) {
    console.error("[iq/rules] POST Error:", err);
    return NextResponse.json({ error: err.message || "Failed to save merchant rule" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId, error } = await requireAuth();
    if (error || !userId) {
      return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const ruleId = url.searchParams.get("id");
    if (!ruleId) {
      return NextResponse.json({ error: "Rule id query param required" }, { status: 400 });
    }

    const deleted = await deleteMerchantRule(userId, ruleId);
    return NextResponse.json({ success: true, deleted });
  } catch (err: any) {
    console.error("[iq/rules] DELETE Error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete merchant rule" }, { status: 500 });
  }
}
