import { NextRequest, NextResponse } from "next/server";
import { requirePartnerStaff } from "@/lib/partner-auth";
import { partnerServiceClient } from "@/lib/partner-service-client";

export async function GET(req: NextRequest) {
  const { session, error } = await requirePartnerStaff(req);
  if (error) return error;

  try {
    const data = await partnerServiceClient.getPartnerGoals(session.partnerOrgId);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch partner goals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requirePartnerStaff(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const { title, targetAmount, targetDate, advisorNote, userId } = body;

  if (!title || !targetAmount) {
    return NextResponse.json({ error: "Goal title and target amount are required" }, { status: 400 });
  }

  try {
    const data = await partnerServiceClient.createPartnerGoal({
      partnerOrgId: session.partnerOrgId,
      userId,
      title,
      targetAmount: Number(targetAmount),
      targetDate,
      advisorNote,
    });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create suggested goal" }, { status: 500 });
  }
}
