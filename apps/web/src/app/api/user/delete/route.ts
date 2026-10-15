import { NextResponse } from "next/server";

export async function DELETE() {
  // TODO: Delete user account, all data, and cancel active subscriptions via Supabase + Paystack
  await new Promise((r) => setTimeout(r, 800));
  return NextResponse.json({ ok: true, message: "Account deletion initiated. You will receive a confirmation email." });
}
