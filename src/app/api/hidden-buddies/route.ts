import { NextResponse } from "next/server";
import { getHiddenBuddyIds } from "@/lib/db";

export async function GET() {
  const ids = await getHiddenBuddyIds();
  return NextResponse.json(ids);
}
