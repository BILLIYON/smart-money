import { NextRequest, NextResponse } from "next/server";
import { partnerServiceClient } from "@/lib/partner-service-client";
import { getPartnerStaffSession } from "@/lib/partner-auth";

export async function GET(req: NextRequest) {
  const staff = await getPartnerStaffSession(req);
  if (!staff) {
    return NextResponse.json({ error: "Forbidden: Partner staff access required" }, { status: 403 });
  }

  try {
    const data = await partnerServiceClient.getFeatures(staff.partnerOrgId);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[GET /api/partner/features]", err);
    return NextResponse.json({ error: err.message || "Failed to fetch feature toggles" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const staff = await getPartnerStaffSession(req);
  if (!staff) {
    return NextResponse.json({ error: "Forbidden: Partner staff access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { key, isEnabled } = body;
    if (!key || typeof isEnabled !== "boolean") {
      return NextResponse.json({ error: "Feature key and isEnabled boolean are required" }, { status: 400 });
    }

    const data = await partnerServiceClient.toggleFeature(key, isEnabled, staff.partnerOrgId);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[PATCH /api/partner/features]", err);
    return NextResponse.json({ error: err.message || "Failed to update feature toggle" }, { status: 500 });
  }
}
