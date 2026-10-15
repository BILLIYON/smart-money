import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

export async function GET() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  try {
    const { data, error: dbError } = await supabase
      .from("user_buddies")
      .select("buddy_id, subscribed_at, active")
      .eq("user_id", userId)
      .eq("active", true);

    if (dbError) throw dbError;

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error("[GET /api/subscriptions] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to load subscriptions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  try {
    const { buddyId, gateway, reference } = (await req.json()) as {
      buddyId: string;
      gateway?: string;
      reference: string;
    };

    if (!buddyId || !reference) {
      return NextResponse.json({ error: "buddyId and reference are required" }, { status: 400 });
    }

    // 1. Payment Verification (Paystack or PayPal)
    const isMock = reference.startsWith("mock_");
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

    if (!isMock && gateway === "paystack" && paystackSecret) {
      console.log(`[POST /api/subscriptions] Verifying Paystack payment reference: ${reference}`);
      const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
        },
      });

      if (!paystackRes.ok) {
        throw new Error("Paystack verification request failed");
      }

      const verifyData = await paystackRes.json();
      if (!verifyData?.status || verifyData.data?.status !== "success") {
        return NextResponse.json({ error: "Paystack payment verification failed" }, { status: 400 });
      }
      console.log(`[POST /api/subscriptions] Paystack payment verified successfully`);
    } else if (!isMock && gateway === "paypal") {
      // In production, verify the PayPal capture ID using the PayPal REST SDK.
      // For now, since capture succeeded on the frontend, we log and proceed.
      console.log(`[POST /api/subscriptions] PayPal checkout payment reference logged: ${reference}`);
    } else {
      console.log(`[POST /api/subscriptions] Using mock/bypass verification for local/offline testing: reference=${reference}, gateway=${gateway}`);
    }

    // 2. Insert or update the user_buddies subscription row
    const { error: subError } = await supabase
      .from("user_buddies")
      .upsert(
        {
          user_id: userId,
          buddy_id: buddyId,
          active: true,
          subscribed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,buddy_id" }
      );

    if (subError) throw subError;

    // 3. Ensure a 1-to-1 chat session exists for the user & buddy
    const { data: existingSession, error: checkError } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("is_group", false)
      .contains("buddy_ids", [buddyId])
      .limit(1)
      .maybeSingle();

    if (checkError) throw checkError;

    let sessionId = existingSession?.id;

    if (!sessionId) {
      const { data: newSession, error: createError } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: userId,
          buddy_ids: [buddyId],
          is_group: false,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createError) throw createError;
      sessionId = newSession?.id;
    }

    return NextResponse.json({ ok: true, sessionId });
  } catch (err: any) {
    console.error("[POST /api/subscriptions] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to process subscription" }, { status: 500 });
  }
}
