import { NextResponse } from "next/server";

export async function DELETE() {
  // TODO: Delete all DataBank records for the authenticated user from Supabase
  await new Promise((r) => setTimeout(r, 600));
  return NextResponse.json({ ok: true, message: "All DataBank data permanently deleted." });
}
