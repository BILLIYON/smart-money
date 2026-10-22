import { NextRequest, NextResponse } from "next/server";
import { requirePartnerStaff } from "@/lib/partner-auth";
import { partnerServiceClient } from "@/lib/partner-service-client";

export async function GET(req: NextRequest) {
  const { session, error } = await requirePartnerStaff(req);
  if (error) return error;

  try {
    const data = await partnerServiceClient.getOpportunities({ orgId: session.partnerOrgId });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch opportunities" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requirePartnerStaff(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const { title, category, reasoning, valueEstimate, windowLabel, targetUserId } = body;

  if (!title || !reasoning) {
    return NextResponse.json({ error: "Opportunity title and investment rationale are required" }, { status: 400 });
  }

  try {
    const data = await partnerServiceClient.createOpportunity({
      partnerOrgId: session.partnerOrgId,
      title,
      category,
      reasoning,
      valueEstimate,
      windowLabel,
      targetUserId,
    });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to dispatch opportunity" }, { status: 500 });
  }
}
