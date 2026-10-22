import { NextRequest, NextResponse } from "next/server";
import { partnerServiceClient } from "@/lib/partner-service-client";
import { getPartnerStaffSession } from "@/lib/partner-auth";

export async function GET(req: NextRequest) {
  const staff = await getPartnerStaffSession(req);
  if (!staff) {
    return NextResponse.json({ error: "Forbidden: Partner staff access required" }, { status: 403 });
  }

  try {
    const data = await partnerServiceClient.getAnalyticsRules(staff.partnerOrgId);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[GET /api/partner/analytics-rules]", err);
    return NextResponse.json({ error: err.message || "Failed to fetch analytics rules" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const staff = await getPartnerStaffSession(req);
  if (!staff) {
    return NextResponse.json({ error: "Forbidden: Partner staff access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { ruleName, formula, icon } = body;
    if (!ruleName || !formula) {
      return NextResponse.json({ error: "Rule name and formula are required" }, { status: 400 });
    }

    const data = await partnerServiceClient.createAnalyticsRule({
      partnerOrgId: staff.partnerOrgId,
      ruleName,
      formula,
      icon,
    });
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[POST /api/partner/analytics-rules]", err);
    return NextResponse.json({ error: err.message || "Failed to create analytics rule" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const staff = await getPartnerStaffSession(req);
  if (!staff) {
    return NextResponse.json({ error: "Forbidden: Partner staff access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { ruleId, isEnabled } = body;
    if (!ruleId || typeof isEnabled !== "boolean") {
      return NextResponse.json({ error: "ruleId and isEnabled are required" }, { status: 400 });
    }

    const data = await partnerServiceClient.toggleAnalyticsRule(ruleId, isEnabled);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[PATCH /api/partner/analytics-rules]", err);
    return NextResponse.json({ error: err.message || "Failed to toggle analytics rule" }, { status: 500 });
  }
}
