import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { partnerServiceClient } from "@/lib/partner-service-client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const { status } = body;

    if (!status || !["acted", "dismissed", "active"].includes(status)) {
      return NextResponse.json({ error: "Invalid status ('acted', 'dismissed', 'active')" }, { status: 400 });
    }

    const result = await partnerServiceClient.updateOpportunityStatus(id, status);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[PATCH /api/opportunities/[id]]", err);
    return NextResponse.json({ error: err.message || "Failed to update opportunity" }, { status: 500 });
  }
}
