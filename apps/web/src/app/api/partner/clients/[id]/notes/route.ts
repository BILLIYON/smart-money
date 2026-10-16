import { NextRequest, NextResponse } from "next/server";
import { requirePartnerStaff } from "@/lib/partner-auth";
import { partnerServiceClient } from "@/lib/partner-service-client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requirePartnerStaff(req);
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const result = await partnerServiceClient.saveAdvisorNote(id, body.notes || "");
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update advisor note" }, { status: 500 });
  }
}
