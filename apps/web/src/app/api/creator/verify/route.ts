import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { fullName, nin } = body as { fullName?: string; nin?: string };

  if (!fullName || fullName.trim().length < 3) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  }
  if (!nin || nin.replace(/\D/g, "").length < 10) {
    return NextResponse.json(
      { error: "A valid BVN or NIN (11 digits) is required" },
      { status: 400 }
    );
  }

  // Mask the NIN for storage: show first 3 and last 2 chars only
  const raw = nin.replace(/\D/g, "");
  const maskedNin = raw.slice(0, 3) + "*".repeat(raw.length - 5) + raw.slice(-2);

  const { error: updateErr } = await supabase
    .from("users")
    .update({
      is_verified: true,
      verified_at: new Date().toISOString(),
      verification_name: fullName.trim(),
      verification_nin: maskedNin,
    })
    .eq("id", userId);

  if (updateErr) {
    console.error("[POST /api/creator/verify]", updateErr.message);
    return NextResponse.json({ error: "Verification failed, please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, verified: true });
}
