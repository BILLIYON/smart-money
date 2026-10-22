import { NextRequest, NextResponse } from "next/server";
import { partnerServiceClient } from "@/lib/partner-service-client";
import { getPartnerStaffSession } from "@/lib/partner-auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getPartnerStaffSession(req);
  if (!staff) {
    return NextResponse.json({ error: "Forbidden: Partner staff access required" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const { decision, note } = body;

    if (!decision || !["approve", "decline"].includes(decision)) {
      return NextResponse.json({ error: "Invalid decision ('approve' or 'decline' required)" }, { status: 400 });
    }

    const result = await partnerServiceClient.decideApproval(id, decision, note, staff.userId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[PATCH /api/partner/approvals/[id]]", err);
    return NextResponse.json({ error: err.message || "Failed to process decision" }, { status: 500 });
  }
}
