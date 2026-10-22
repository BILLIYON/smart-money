import { NextRequest, NextResponse } from "next/server";
import { partnerServiceClient } from "@/lib/partner-service-client";
import { getPartnerStaffSession } from "@/lib/partner-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const staff = await getPartnerStaffSession(req);
  if (!staff) {
    return NextResponse.json({ error: "Forbidden: Partner staff access required" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { isIncluded } = body;
    if (typeof isIncluded !== "boolean") {
      return NextResponse.json({ error: "isIncluded boolean is required" }, { status: 400 });
    }

    const data = await partnerServiceClient.toggleAnalyticsCategory(id, isIncluded);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[PATCH /api/partner/analytics-categories/:id]", err);
    return NextResponse.json({ error: err.message || "Failed to update category toggle" }, { status: 500 });
  }
}
