import { NextRequest, NextResponse } from "next/server";
import { partnerServiceClient } from "@/lib/partner-service-client";
import { getPartnerStaffSession } from "@/lib/partner-auth";

export async function PATCH(req: NextRequest) {
  const staff = await getPartnerStaffSession(req);
  if (!staff) {
    return NextResponse.json({ error: "Forbidden: Partner staff access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { ruleId, isEnabled } = body;

    if (!ruleId) {
      return NextResponse.json({ error: "ruleId is required" }, { status: 400 });
    }

    const result = await partnerServiceClient.toggleEscalationRule(ruleId, Boolean(isEnabled));
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[PATCH /api/partner/buddies/escalation]", err);
    return NextResponse.json({ error: err.message || "Failed to update escalation rule" }, { status: 500 });
  }
}
