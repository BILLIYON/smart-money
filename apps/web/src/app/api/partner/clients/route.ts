import { NextRequest, NextResponse } from "next/server";
import { requirePartnerStaff } from "@/lib/partner-auth";
import { partnerServiceClient } from "@/lib/partner-service-client";

export async function GET(req: NextRequest) {
  const { session, error } = await requirePartnerStaff(req);
  if (error) return error;

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || undefined;
  const status = url.searchParams.get("status") || undefined;

  try {
    const data = await partnerServiceClient.getClients({
      orgId: session.partnerOrgId,
      search,
      status,
    });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch clients" }, { status: 500 });
  }
}
