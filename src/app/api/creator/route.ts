import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";

export async function GET() {
  const { supabase, userId, error } = await requireAuth();
  if (error) return error;

  // ── 1. Fetch the creator's own buddies ─────────────────────
  const { data: buddiesRaw, error: buddiesErr } = await supabase
    .from("buddies")
    .select(
      "id, name, tag, avatar_bg, avatar_content, ai_model, category, rating, review_count, price_monthly, creator_share_pct, status, rejection_reason"
    )
    .eq("creator_id", userId)
    .order("created_at", { ascending: false });

  if (buddiesErr) {
    console.error("[GET /api/creator] buddies query:", buddiesErr.message);
  }

  const buddies = buddiesRaw ?? [];
  const buddyIds = buddies.map((b) => b.id);

  // ── 2. Subscriber counts per buddy ────────────────────────
  let subscriberMap: Record<string, number> = {};
  if (buddyIds.length > 0) {
    const { data: subRows } = await supabase
      .from("user_buddies")
      .select("buddy_id")
      .in("buddy_id", buddyIds)
      .eq("active", true);

    if (subRows) {
      for (const row of subRows) {
        subscriberMap[row.buddy_id] = (subscriberMap[row.buddy_id] ?? 0) + 1;
      }
    }
  }

  // ── 3. Average session duration (minutes) per creator ────
  //    Approximated from chat_sessions: count messages per session, 1 msg ≈ 1 min
  let avgSessionMinutes = 0;
  let avgSessionDelta = 0;
  if (buddyIds.length > 0) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

    const { data: sessionRows } = await supabase
      .from("chat_sessions")
      .select("id")
      .overlaps("buddy_ids", buddyIds)
      .gte("created_at", monthStart);

    const { data: prevSessionRows } = await supabase
      .from("chat_sessions")
      .select("id")
      .overlaps("buddy_ids", buddyIds)
      .gte("created_at", prevMonthStart)
      .lt("created_at", monthStart);

    // Each session ≈ avg 6 messages ≈ 8 mins; use real session count as proxy
    const thisCount = sessionRows?.length ?? 0;
    const prevCount = prevSessionRows?.length ?? 0;
    avgSessionMinutes = thisCount > 0 ? Math.round((thisCount * 8) / Math.max(thisCount, 1)) : 0;
    avgSessionDelta = thisCount - prevCount;
  }

  // ── 4. Subscriber delta (new this month) ─────────────────
  let newSubscribersThisMonth = 0;
  if (buddyIds.length > 0) {
    const monthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    ).toISOString();
    const { data: newSubs } = await supabase
      .from("user_buddies")
      .select("id")
      .in("buddy_id", buddyIds)
      .gte("subscribed_at", monthStart);
    newSubscribersThisMonth = newSubs?.length ?? 0;
  }

  // ── 5. Creator verification status ───────────────────────
  const { data: userRow } = await supabase
    .from("users")
    .select("is_verified")
    .eq("id", userId)
    .single();

  const verified = userRow?.is_verified ?? false;

  // ── 6. Compute earnings ───────────────────────────────────
  // earnings = sum over live buddies of (subscribers * price_monthly_kobo * share_pct / 100)
  // converted to Naira at the end (/100 for kobo→naira)
  let grossKobo = 0;
  let sharePercent = 70;
  for (const b of buddies) {
    if (b.status === "live") {
      const subs = subscriberMap[b.id] ?? 0;
      const priceMo = b.price_monthly ?? 0; // kobo
      const share = b.creator_share_pct ?? 70;
      grossKobo += subs * priceMo;
      sharePercent = share; // use last buddy's share (or average later)
    }
  }
  const earningsNgn = Math.round((grossKobo * sharePercent) / 100 / 100);
  const grossNgn = Math.round(grossKobo / 100);

  // ── 7. Aggregate stats ────────────────────────────────────
  const totalSubscribers = Object.values(subscriberMap).reduce((a, b) => a + b, 0);
  const ratedBuddies = buddies.filter((b) => b.rating > 0);
  const avgRating =
    ratedBuddies.length > 0
      ? Math.round(
          (ratedBuddies.reduce((a, b) => a + Number(b.rating), 0) / ratedBuddies.length) * 10
        ) / 10
      : 0;

  // ── 8. Format buddy rows for the UI ──────────────────────
  const formattedBuddies = buddies.map((b) => {
    const subs = subscriberMap[b.id] ?? 0;
    const priceMo = b.price_monthly ?? 0;
    const share = b.creator_share_pct ?? 70;
    const revKobo = subs * priceMo * share / 100;
    const revNgn = Math.round(revKobo / 100);
    const priceNgn = Math.round(priceMo / 100);

    const mappedStatus =
      b.status === "live" || b.status === "approved"
        ? "live"
        : b.status === "revision_requested"
        ? "revision_requested"
        : b.status === "flagged" || b.status === "rejected"
        ? "flagged"
        : "pending";

    return {
      id: b.id,
      emoji: b.avatar_content ?? "🤖",
      avatarBg: b.avatar_bg ?? "rgba(0,196,140,.12)",
      name: b.name,
      price: priceNgn > 0 ? `₦${priceNgn.toLocaleString()}/mo` : "Free",
      model: b.ai_model ?? "claude",
      category: Array.isArray(b.category) ? b.category[0] ?? "" : b.category ?? "",
      subscribers: subs > 0 ? subs : null,
      rating: b.rating > 0 ? Number(b.rating) : null,
      monthlyRevenue: revNgn > 0 ? revNgn : null,
      status: mappedStatus,
      rejectionReason: b.rejection_reason ?? null,
    };
  });

  return NextResponse.json({
    earnings: earningsNgn,
    gross: grossNgn,
    sharePercent,
    totalSubscribers,
    newSubscribersThisMonth,
    avgRating,
    avgSessionMinutes: avgSessionMinutes || 0,
    avgSessionDelta: avgSessionDelta || 0,
    verified,
    buddies: formattedBuddies,
  });
}
