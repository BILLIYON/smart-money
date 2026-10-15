import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase-server";
import { Pool } from "pg";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

export async function GET() {
  const pool = getPool();
  try {
    const { userId, error } = await requireAuth();
    if (error || !userId) {
      return error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch user verification status
    const userRes = await pool.query(
      `SELECT is_verified, full_name, is_admin FROM users WHERE id = $1 LIMIT 1;`,
      [userId]
    );
    const verified = Boolean(userRes.rows[0]?.is_verified);

    // 2. Fetch the creator's own buddies
    const buddiesRes = await pool.query(
      `SELECT id, name, tag, avatar_bg, avatar_content, ai_model, category, rating, review_count, 
              price_monthly, price_monthly_ngn, creator_share_pct, status, rejection_reason, created_at
       FROM buddies
       WHERE creator_id = $1
       ORDER BY created_at DESC;`,
      [userId]
    );

    const buddies = buddiesRes.rows || [];
    const buddyIds = buddies.map((b) => b.id);

    let subscriberMap: Record<string, number> = {};
    let newSubscribersThisMonth = 0;
    let avgSessionMinutes = 0;
    let avgSessionDelta = 0;

    if (buddyIds.length > 0) {
      // 3. Subscriber counts per buddy from user_buddies
      try {
        const subRes = await pool.query(
          `SELECT buddy_id, count(*) as count
           FROM user_buddies
           WHERE buddy_id = ANY($1::varchar[]) AND active = true
           GROUP BY buddy_id;`,
          [buddyIds]
        );
        for (const r of subRes.rows) {
          subscriberMap[r.buddy_id] = parseInt(r.count, 10) || 0;
        }

        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const newSubRes = await pool.query(
          `SELECT count(*) as count
           FROM user_buddies
           WHERE buddy_id = ANY($1::varchar[]) AND created_at >= $2;`,
          [buddyIds, monthStart]
        );
        newSubscribersThisMonth = parseInt(newSubRes.rows[0]?.count, 10) || 0;
      } catch (subErr) {
        console.warn("[/api/creator] user_buddies count warn:", subErr);
      }

      // 4. Session estimation
      try {
        const sessRes = await pool.query(
          `SELECT count(*) as count
           FROM chat_sessions
           WHERE buddy_id = ANY($1::varchar[]);`,
          [buddyIds]
        );
        const sessCount = parseInt(sessRes.rows[0]?.count, 10) || 0;
        avgSessionMinutes = sessCount > 0 ? 8 : 0;
        avgSessionDelta = sessCount;
      } catch (sessErr) {
        console.warn("[/api/creator] chat_sessions count warn:", sessErr);
      }
    }

    // 5. Compute earnings
    let grossKobo = 0;
    let sharePercent = 70;
    for (const b of buddies) {
      const isLive = b.status === "live" || b.status === "approved";
      if (isLive) {
        const subs = subscriberMap[b.id] ?? 0;
        const priceMo = Number(b.price_monthly_ngn || b.price_monthly || 0); // Kobo or Naira depending on field
        const share = Number(b.creator_share_pct || 70);
        grossKobo += subs * priceMo;
        sharePercent = share;
      }
    }

    const earningsNgn = Math.round((grossKobo * sharePercent) / 100 / 100);
    const grossNgn = Math.round(grossKobo / 100);
    const totalSubscribers = Object.values(subscriberMap).reduce((a, b) => a + b, 0);

    const ratedBuddies = buddies.filter((b) => Number(b.rating) > 0);
    const avgRating =
      ratedBuddies.length > 0
        ? Math.round(
            (ratedBuddies.reduce((a, b) => a + Number(b.rating), 0) / ratedBuddies.length) * 10
          ) / 10
        : 0;

    // 6. Format buddy rows for the UI
    const formattedBuddies = buddies.map((b) => {
      const subs = subscriberMap[b.id] ?? 0;
      const priceVal = Number(b.price_monthly_ngn || b.price_monthly || 0);
      // If stored in Kobo vs Naira:
      const priceNgn = priceVal > 1000 ? Math.round(priceVal / 100) : priceVal;
      const share = Number(b.creator_share_pct || 70);
      const revNgn = Math.round((subs * priceNgn * share) / 100);

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
        rating: Number(b.rating) > 0 ? Number(b.rating) : null,
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
  } catch (err: any) {
    console.error("[GET /api/creator] Error:", err);
    return NextResponse.json(
      {
        earnings: 0,
        gross: 0,
        sharePercent: 70,
        totalSubscribers: 0,
        newSubscribersThisMonth: 0,
        avgRating: 0,
        avgSessionMinutes: 0,
        avgSessionDelta: 0,
        verified: false,
        buddies: [],
        error: err.message,
      },
      { status: 200 }
    );
  } finally {
    await pool.end();
  }
}
