"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCategoryStyle, type Buddy } from "@/lib/buddies";
import { useBuddyStore } from "@/store/buddyStore";
import { PaymentModal } from "@/components/buddy/PaymentModal";
import { createClient } from "@/lib/supabase/client";
import { isImageAvatar } from "@/lib/utils";

function ModelDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-[6px] h-[6px] rounded-full flex-shrink-0"
      style={{ background: color }}
    />
  );
}

function SubscriptionPanel({ buddy }: { buddy: Buddy }) {
  const { name, price, priceNote, badge, badgeType, isFanSim, includes } = buddy;
  const router = useRouter();
  const subscribedBuddies = useBuddyStore((s) => s.subscribedBuddies);
  const loadSubscribedBuddies = useBuddyStore((s) => s.loadSubscribedBuddies);

  const [showPayment, setShowPayment] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadSubscribedBuddies();
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, [loadSubscribedBuddies]);

  const isSubscribed = badgeType === "free" || subscribedBuddies.some((b) => b.id === buddy.id);

  const handleSubscribeClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (isSubscribed) return;
    e.preventDefault();
    setShowPayment(true);
  };

  const handlePaymentSuccess = (sessionId: string) => {
    setShowPayment(false);
    router.push(`/chat?buddy=${buddy.id}`);
  };

  return (
    <>
      <div
        className="mb-1"
        style={{ fontFamily: "var(--font-dm-serif)", fontSize: "32px", color: "var(--green)" }}
      >
        {price}
      </div>
      <div className="text-[12px] leading-[1.5] mb-5" style={{ color: "var(--muted)" }}>
        {priceNote}
      </div>

      <Link
        href={isSubscribed && user ? `/chat?buddy=${buddy.id}` : "#"}
        onClick={handleSubscribeClick}
        className="block w-full py-[11px] rounded-[10px] text-[14px] font-semibold text-white text-center transition-colors duration-200 mb-3"
        style={{ background: "var(--navy)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--green)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--navy)"; }}
      >
        {isSubscribed
          ? (badgeType === "free" ? "Start Chatting — Free" : "Start Chatting")
          : `Subscribe & Chat · ${badge}`}
      </Link>

      {showPayment && (
        <PaymentModal
          buddy={buddy}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}

      {isFanSim && (
        <div
          className="text-[10px] leading-snug mt-4 px-[10px] py-[8px] rounded-[8px] border"
          style={{ color: "var(--muted)", background: "var(--bg)", borderColor: "var(--border)" }}
        >
          🔒 Fan-created simulation. Not affiliated with or endorsed by {name}.
        </div>
      )}

      <div
        className="flex flex-col gap-[7px] mt-4 pt-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {includes.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text)" }}>
            <span style={{ color: "var(--green)", fontWeight: 700, fontSize: "11px" }}>✓</span>
            {item}
          </div>
        ))}
      </div>
    </>
  );
}

export function BuddyProfile({ buddy }: { buddy: Buddy }) {
  const {
    name, tag,
    bannerColor, avatarBg, avatarContent, avatarIsSerif,
    model, modelColor, rating, reviewCount,
    isFanSim, disclaimer, philosophy, samples, reviews, categories,
  } = buddy;

  return (
    <div className="px-5 py-6 md:px-8 max-w-[1200px] mx-auto">
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[13px] transition-colors duration-200"
          style={{ color: "var(--muted)" }}
        >
          ← Back to Marketplace
        </Link>
      </div>

      {/* Two-column layout on md+ */}
      <div
        className="grid gap-6 items-start"
        style={{ gridTemplateColumns: "1fr" }}
      >
        {/* Desktop: side-by-side */}
        <div className="hidden md:grid md:gap-6 md:items-start" style={{ gridTemplateColumns: "1fr 300px" }}>
          {/* ── Hero card ── */}
          <div
            className="rounded-[16px] border overflow-hidden"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            {/* Banner */}
            <div className="h-[100px] relative" style={{ background: bannerColor }}>
              {/* Avatar */}
              <div
                className="absolute bottom-[-24px] left-7 w-[64px] h-[64px] rounded-[16px] border-[3px] flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{
                  background: avatarBg,
                  borderColor: "var(--card)",
                  fontSize: avatarIsSerif ? "22px" : "28px",
                  ...(avatarIsSerif
                    ? { fontFamily: "var(--font-dm-serif)", color: "rgba(255,255,255,.9)" }
                    : {}),
                }}
              >
                {isImageAvatar(avatarContent) ? (
                  <img src={avatarContent} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  avatarContent
                )}
              </div>
            </div>

            <div className="px-7 pt-9 pb-6">
              {/* Name */}
              <div
                className="flex items-center flex-wrap gap-2 mb-[6px]"
                style={{ fontFamily: "var(--font-dm-serif)", fontSize: "24px", color: "var(--text)" }}
              >
                {name}
                {isFanSim && (
                  <span
                    className="inline-flex items-center px-2 py-[2px] rounded-full text-[9px] font-semibold uppercase tracking-[.5px] border"
                    style={{
                      background: "rgba(245,166,35,.1)",
                      borderColor: "rgba(245,166,35,.25)",
                      color: "#C47F00",
                      fontFamily: "var(--font-sora)",
                    }}
                  >
                    Fan Sim
                  </span>
                )}
              </div>

              {/* Tags row */}
              <div className="flex gap-2 flex-wrap mb-4">
                <span className="px-3 py-[4px] rounded-full text-[11px] font-medium" style={{ background: "var(--bg)", color: "var(--muted)" }}>
                  {tag}
                </span>
                <span className="flex items-center gap-[5px] px-3 py-[4px] rounded-full text-[11px]" style={{ background: "var(--bg)", color: "var(--muted)" }}>
                  <ModelDot color={modelColor} />
                  {model}
                </span>
                <span className="flex items-center gap-1 px-3 py-[4px] rounded-full text-[11px] font-medium" style={{ background: "var(--bg)", color: "var(--text)" }}>
                  <span style={{ color: "var(--gold)" }}>★</span>
                  {rating} · {reviewCount} reviews
                </span>
                {categories?.map((cat) => {
                  const style = getCategoryStyle(cat);
                  return (
                    <span
                      key={cat}
                      className="px-3 py-[4px] rounded-full text-[11px] font-semibold tracking-[.5px] border"
                      style={{ background: style.background, color: style.color, borderColor: style.borderColor }}
                    >
                      {cat}
                    </span>
                  );
                })}
              </div>

              {/* Fan disclaimer */}
              {isFanSim && disclaimer && (
                <div
                  className="text-[11px] leading-relaxed px-[12px] py-[9px] rounded-[10px] border mb-5"
                  style={{ color: "var(--muted)", background: "rgba(245,166,35,.04)", borderColor: "rgba(245,166,35,.2)" }}
                >
                  ⚠️ {disclaimer}
                </div>
              )}

              {/* Philosophy */}
              <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-3 mt-5" style={{ color: "var(--muted)" }}>
                Philosophy
              </div>
              <blockquote
                className="text-[13px] leading-[1.7] italic mb-5 rounded-r-[10px] pl-4 pr-4 py-[14px]"
                style={{ background: "var(--bg)", borderLeft: "3px solid var(--green)", color: "var(--text)" }}
              >
                {philosophy}
              </blockquote>

              {/* Sample Responses */}
              <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-3 mt-5" style={{ color: "var(--muted)" }}>
                Sample Responses
              </div>
              <div className="flex flex-col gap-2 mb-5">
                {samples.map((s, i) => (
                  <div
                    key={i}
                    className="text-[13px] leading-[1.6] rounded-[10px] px-[14px] py-3 border"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    <span style={{ color: "var(--green)", fontFamily: "var(--font-dm-serif)", fontSize: "20px", marginRight: "4px" }}>&ldquo;</span>
                    {s}
                  </div>
                ))}
              </div>

              {/* Reviews */}
              <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-3 mt-5" style={{ color: "var(--muted)" }}>
                User Reviews
              </div>
              <div>
                {reviews.map((r, i) => (
                  <div
                    key={i}
                    className="py-[14px]"
                    style={{ borderBottom: i < reviews.length - 1 ? "1px solid var(--border)" : "none" }}
                  >
                    <div className="flex justify-between mb-[5px]">
                      <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{r.name}</span>
                      <span className="text-[12px]" style={{ color: "var(--gold)" }}>{r.stars}</span>
                    </div>
                    <p className="text-[13px] leading-[1.6]" style={{ color: "var(--muted)" }}>{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Sticky sidebar ── */}
          <div
            className="rounded-[16px] border px-6 py-6 sticky top-4"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <SubscriptionPanel buddy={buddy} />
          </div>
        </div>

        {/* Mobile: hero card */}
        <div className="md:hidden rounded-[16px] border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="h-[100px] relative" style={{ background: bannerColor }}>
            <div
              className="absolute bottom-[-24px] left-7 w-[64px] h-[64px] rounded-[16px] border-[3px] flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{
                background: avatarBg,
                borderColor: "var(--card)",
                fontSize: avatarIsSerif ? "22px" : "28px",
                ...(avatarIsSerif ? { fontFamily: "var(--font-dm-serif)", color: "rgba(255,255,255,.9)" } : {}),
              }}
            >
              {isImageAvatar(avatarContent) ? (
                <img src={avatarContent} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                avatarContent
              )}
            </div>
          </div>

          <div className="px-7 pt-9 pb-6">
            <div
              className="flex items-center flex-wrap gap-2 mb-[6px]"
              style={{ fontFamily: "var(--font-dm-serif)", fontSize: "22px", color: "var(--text)" }}
            >
              {name}
              {isFanSim && (
                <span
                  className="inline-flex items-center px-2 py-[2px] rounded-full text-[9px] font-semibold uppercase tracking-[.5px] border"
                  style={{ background: "rgba(245,166,35,.1)", borderColor: "rgba(245,166,35,.25)", color: "#C47F00", fontFamily: "var(--font-sora)" }}
                >
                  Fan Sim
                </span>
              )}
            </div>

            <div className="flex gap-2 flex-wrap mb-4">
              <span className="px-3 py-[4px] rounded-full text-[11px]" style={{ background: "var(--bg)", color: "var(--muted)" }}>{tag}</span>
              <span className="flex items-center gap-[5px] px-3 py-[4px] rounded-full text-[11px]" style={{ background: "var(--bg)", color: "var(--muted)" }}>
                <ModelDot color={modelColor} />
                {model}
              </span>
              <span className="flex items-center gap-1 px-3 py-[4px] rounded-full text-[11px]" style={{ background: "var(--bg)", color: "var(--text)" }}>
                <span style={{ color: "var(--gold)" }}>★</span>
                {rating}
              </span>
            </div>

            {isFanSim && disclaimer && (
              <div
                className="text-[11px] leading-relaxed px-[12px] py-[9px] rounded-[10px] border mb-5"
                style={{ color: "var(--muted)", background: "rgba(245,166,35,.04)", borderColor: "rgba(245,166,35,.2)" }}
              >
                ⚠️ {disclaimer}
              </div>
            )}

            <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-3 mt-5" style={{ color: "var(--muted)" }}>Philosophy</div>
            <blockquote
              className="text-[13px] leading-[1.7] italic mb-5 rounded-r-[10px] pl-4 pr-4 py-[14px]"
              style={{ background: "var(--bg)", borderLeft: "3px solid var(--green)", color: "var(--text)" }}
            >
              {philosophy}
            </blockquote>

            <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-3 mt-5" style={{ color: "var(--muted)" }}>Sample Responses</div>
            <div className="flex flex-col gap-2 mb-5">
              {samples.map((s, i) => (
                <div
                  key={i}
                  className="text-[13px] leading-[1.6] rounded-[10px] px-[14px] py-3 border"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                >
                  <span style={{ color: "var(--green)", fontFamily: "var(--font-dm-serif)", fontSize: "20px", marginRight: "4px" }}>&ldquo;</span>
                  {s}
                </div>
              ))}
            </div>

            <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-3 mt-5" style={{ color: "var(--muted)" }}>User Reviews</div>
            <div>
              {reviews.map((r, i) => (
                <div
                  key={i}
                  className="py-[14px]"
                  style={{ borderBottom: i < reviews.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <div className="flex justify-between mb-[5px]">
                    <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{r.name}</span>
                    <span className="text-[12px]" style={{ color: "var(--gold)" }}>{r.stars}</span>
                  </div>
                  <p className="text-[13px] leading-[1.6]" style={{ color: "var(--muted)" }}>{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile: subscription panel */}
        <div
          className="md:hidden rounded-[16px] border px-6 py-6"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <SubscriptionPanel buddy={buddy} />
        </div>
      </div>
    </div>
  );
}
