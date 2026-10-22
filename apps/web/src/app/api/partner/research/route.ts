import { NextRequest, NextResponse } from "next/server";
import { partnerServiceClient } from "@/lib/partner-service-client";
import { getPartnerStaffSession } from "@/lib/partner-auth";

export async function POST(req: NextRequest) {
  const staff = await getPartnerStaffSession(req);
  if (!staff) {
    return NextResponse.json({ error: "Forbidden: Partner staff access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { prompt, model } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const result = await partnerServiceClient.runResearch({
      prompt,
      model,
      partnerOrgId: staff.partnerOrgId,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[POST /api/partner/research]", err);
    return NextResponse.json({ error: err.message || "Failed to execute research" }, { status: 500 });
  }
}
