import { NextRequest, NextResponse } from "next/server";
import { requirePartnerStaff } from "@/lib/partner-auth";
import { partnerServiceClient } from "@/lib/partner-service-client";

export async function GET(req: NextRequest) {
  const { session, error } = await requirePartnerStaff(req);
  if (error) return error;

  try {
    const data = await partnerServiceClient.getOverview(session.partnerOrgId);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch overview metrics" }, { status: 500 });
  }
}
