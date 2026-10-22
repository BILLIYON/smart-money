import { NextRequest, NextResponse } from "next/server";
import { partnerServiceClient } from "@/lib/partner-service-client";
import { getPartnerStaffSession } from "@/lib/partner-auth";

export async function GET(req: NextRequest) {
  const staff = await getPartnerStaffSession(req);
  if (!staff) {
    return NextResponse.json({ error: "Forbidden: Partner staff access required" }, { status: 403 });
  }

  try {
    const data = await partnerServiceClient.getStaff(staff.partnerOrgId);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[GET /api/partner/staff]", err);
    return NextResponse.json({ error: err.message || "Failed to fetch staff" }, { status: 500 });
  }
}
