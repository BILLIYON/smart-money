"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isImageAvatar } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────
type Buddy = {
  id: string;
  emoji: string;
  avatarBg: string;
  name: string;
  price: string;
  model: string;
  category: string;
  subscribers: number | null;
  rating: number | null;
  monthlyRevenue: number | null;
  status: "live" | "pending" | "revision_requested" | "flagged";
  rejectionReason: string | null;
};

type DashData = {
  earnings: number;
  gross: number;
  sharePercent: number;
  totalSubscribers: number;
  newSubscribersThisMonth: number;
  avgRating: number;
  avgSessionMinutes: number;
  avgSessionDelta: number;
  verified: boolean;
  buddies: Buddy[];
};

// ── Helpers ────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  return n >= 1000 ? `₦${(n / 1000).toFixed(0)}k` : `₦${n.toLocaleString()}`;
}

// ── Stat card ──────────────────────────────────────────────
function StatCard({
  label, value, valueColor, change, changeUp = false,
}: {
  label: string; value: string; valueColor?: string; change: string; changeUp?: boolean;
}) {
  return (
    <div className="rounded-[14px] p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      <div className="text-[26px] font-bold mb-1" style={{ color: valueColor ?? "var(--text)", fontFamily: "var(--font-dm-serif)" }}>
        {value}
      </div>
      <div className="text-[11px] font-medium" style={{ color: changeUp ? "var(--green2)" : "var(--muted)" }}>
        {changeUp ? "↑ " : ""}{change}
      </div>
    </div>
  );
}

// ── Status pill ────────────────────────────────────────────
function StatusPill({ status }: { status: Buddy["status"] }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[10px] font-semibold" style={{ background: "rgba(0,196,140,.1)", color: "var(--green2)" }}>
        ● Live
      </span>
    );
  }
  if (status === "revision_requested") {
    return (
      <span className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[10px] font-semibold" style={{ background: "rgba(245,166,35,.15)", color: "#C47F00", border: "1px solid rgba(245,166,35,.3)" }}>
        🔄 Correction Needed
      </span>
    );
  }
  if (status === "flagged") {
    return (
      <span className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[10px] font-semibold" style={{ background: "rgba(220,38,38,.12)", color: "#DC2626", border: "1px solid rgba(220,38,38,.3)" }}>
        🚩 Flagged Violation
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[10px] font-semibold" style={{ background: "rgba(245,166,35,.12)", color: "#C47F00" }}>
      ⏳ In Review
    </span>
  );
}

// ── Verify Modal ───────────────────────────────────────────
function VerifyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [fullName, setFullName] = useState("");
  const [nin, setNin] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErr(null);
    if (fullName.trim().length < 3) { setErr("Enter your full legal name"); return; }
    if (nin.replace(/\D/g, "").length < 10) { setErr("Enter a valid BVN or NIN (11 digits)"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/creator/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, nin }),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? "Verification failed"); return; }
      onSuccess();
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputBase: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 13,
    border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)",
    outline: "none",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-[20px] p-8 w-full max-w-md relative"
        style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          style={{ background: "var(--bg)", color: "var(--muted)", fontSize: 18 }}
        >×</button>

        {/* Header */}
        <div className="text-[10px] uppercase tracking-[2px] mb-1" style={{ color: "var(--muted)" }}>Identity Verification</div>
        <div className="text-[20px] font-bold mb-1" style={{ fontFamily: "var(--font-dm-serif)", color: "var(--text)" }}>
          Verify your identity
        </div>
        <div className="text-[12px] mb-6 leading-relaxed" style={{ color: "var(--muted)" }}>
          Required to unlock withdrawals. Your information is encrypted and never shared.
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-4 mb-5">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.5px] mb-1 block" style={{ color: "var(--muted)" }}>
              Full Legal Name
            </label>
            <input
              type="text"
              placeholder="e.g. Adeyemi Isaac Matthew"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={inputBase}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[.5px] mb-1 block" style={{ color: "var(--muted)" }}>
              BVN or NIN
            </label>
            <input
              type="text"
              placeholder="11-digit BVN or NIN"
              value={nin}
              maxLength={11}
              onChange={(e) => setNin(e.target.value.replace(/\D/g, ""))}
              style={{ ...inputBase, letterSpacing: nin ? "3px" : "normal", fontFamily: nin ? "monospace" : "inherit" }}
            />
            <div className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>
              We mask and store only the last 2 digits for reference.
            </div>
          </div>
        </div>

        {err && (
          <div className="text-[12px] mb-4 px-3 py-2 rounded-[8px]" style={{ background: "rgba(220,38,38,0.1)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.2)" }}>
            {err}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-[12px] rounded-[12px] text-[13px] font-semibold transition-all"
          style={{
            background: loading ? "var(--border)" : "var(--green)",
            color: loading ? "var(--muted)" : "#fff",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Verifying…" : "Submit Verification →"}
        </button>

        <div className="text-[10px] text-center mt-4" style={{ color: "var(--muted)" }}>
          🔒 256-bit encrypted · NDPR compliant
        </div>
      </div>
    </div>
  );
}

// ── Loading skeleton ───────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="px-4 py-6 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-44 rounded animate-pulse" style={{ background: "var(--border)" }} />
          <div className="h-9 w-28 rounded-[10px] animate-pulse" style={{ background: "var(--border)" }} />
        </div>
        <div className="rounded-[16px] px-8 py-7 mb-6 animate-pulse" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="h-3 w-40 rounded mb-3" style={{ background: "var(--border)" }} />
          <div className="h-10 w-36 rounded mb-3" style={{ background: "var(--border)" }} />
          <div className="h-3 w-64 rounded mb-2" style={{ background: "var(--border)" }} />
          <div className="h-3 w-48 rounded" style={{ background: "var(--border)" }} />
        </div>
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-[14px] p-5 animate-pulse" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="h-3 w-24 rounded mb-3" style={{ background: "var(--border)" }} />
              <div className="h-7 w-20 rounded mb-2" style={{ background: "var(--border)" }} />
              <div className="h-3 w-32 rounded" style={{ background: "var(--border)" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────
export default function CreatorPage() {
  const router = useRouter();
  const [data, setData] = useState<DashData | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  const loadData = () => {
    fetch("/api/creator")
      .then((r) => r.json())
      .then((d) => {
        if (d && Array.isArray(d.buddies)) {
          setData(d);
        } else {
          setData({
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
          });
        }
      })
      .catch((err) => {
        console.error("Creator data fetch error:", err);
        setData({
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
        });
      });
  };

  useEffect(() => { loadData(); }, []);

  if (!data) return <LoadingSkeleton />;

  const liveBuddies = (data.buddies || []).filter((b) => b.status === "live").length;

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
      {showVerifyModal && (
        <VerifyModal
          onClose={() => setShowVerifyModal(false)}
          onSuccess={() => {
            setShowVerifyModal(false);
            loadData(); // refresh verified status
          }}
        />
      )}

      <div className="px-4 py-6 sm:px-6 lg:px-8 w-full">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="text-[22px] font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
            <em style={{ fontFamily: "var(--font-dm-serif)", fontStyle: "italic", color: "var(--green)" }}>Creator</em>{" "}
            Dashboard
          </div>
          <button
            onClick={() => router.push("/studio")}
            className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold transition-all duration-150"
            style={{ background: "var(--green)", color: "#fff", border: "none" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green)"; }}
          >
            + New Buddy
          </button>
        </div>

        {/* ── Earnings hero ── */}
        <div
          className="relative overflow-hidden rounded-[16px] px-8 py-7 mb-6 flex items-center justify-between flex-wrap gap-6"
          style={{ background: "linear-gradient(135deg,var(--navy) 0%,var(--navy2) 100%)" }}
        >
          <div className="absolute pointer-events-none" style={{ right: -40, bottom: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(0,196,140,.08)" }} />

          <div className="relative z-10">
            <div className="text-[10px] uppercase tracking-[2px] mb-2" style={{ color: "rgba(255,255,255,.5)" }}>
              Total Earnings This Month
            </div>
            <div className="text-[40px] font-bold mb-[6px] leading-none" style={{ fontFamily: "var(--font-dm-serif)", color: "var(--gold)" }}>
              {data.earnings > 0 ? fmt(data.earnings) : "₦0"}
            </div>
            <div className="text-[12px]" style={{ color: "rgba(255,255,255,.5)", lineHeight: 1.5 }}>
              {data.totalSubscribers > 0
                ? <>From {data.totalSubscribers} active subscriber{data.totalSubscribers !== 1 ? "s" : ""} across {liveBuddies} Finance {liveBuddies === 1 ? "Buddy" : "Buddies"}<br /></>
                : <>No active subscribers yet — publish your first Buddy below<br /></>}
              Your {data.sharePercent}% share of {fmt(data.gross)} gross
            </div>
          </div>

          <div className="relative z-10 flex flex-col gap-[10px]">
            <button
              disabled={!data.verified}
              className="px-5 py-[10px] rounded-[10px] text-[12px] font-semibold transition-all duration-150"
              style={{
                background: data.verified ? "var(--green)" : "rgba(255,255,255,.12)",
                color: data.verified ? "#fff" : "rgba(255,255,255,.4)",
                border: "none",
                cursor: data.verified ? "pointer" : "not-allowed",
              }}
              title={!data.verified ? "Complete identity verification to withdraw" : undefined}
              onClick={() => {
                if (data.verified) {
                  alert("Withdrawal requested! Funds will arrive in your bank account shortly.");
                }
              }}
            >
              {data.verified ? "Withdraw to Bank" : "Withdraw to Bank 🔒"}
            </button>
            <button
              className="px-5 py-[10px] rounded-[10px] text-[12px] font-medium transition-all duration-150"
              style={{ background: "transparent", color: "rgba(255,255,255,.7)", border: "1px solid rgba(255,255,255,.2)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,.5)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,.2)"; }}
            >
              View Analytics
            </button>
          </div>
        </div>

        {/* ── Verification notice ── */}
        {!data.verified && (
          <div
            className="flex items-center gap-2 px-4 py-[10px] rounded-[10px] mb-5 text-[12px]"
            style={{ background: "rgba(245,166,35,.08)", border: "1px solid rgba(245,166,35,.25)", color: "#C47F00" }}
          >
            <span>🔒</span>
            <span>
              Complete identity verification to unlock withdrawals.{" "}
              <span
                className="font-semibold underline cursor-pointer hover:opacity-80"
                onClick={() => setShowVerifyModal(true)}
              >
                Verify now →
              </span>
            </span>
          </div>
        )}

        {data.verified && (
          <div
            className="flex items-center gap-2 px-4 py-[10px] rounded-[10px] mb-5 text-[12px]"
            style={{ background: "rgba(0,196,140,.08)", border: "1px solid rgba(0,196,140,.2)", color: "var(--green2)" }}
          >
            <span>✅</span>
            <span className="font-semibold">Identity verified — withdrawals are unlocked.</span>
          </div>
        )}

        {/* ── 3 Stat cards ── */}
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
          <StatCard
            label="Active Subscribers"
            value={String(data.totalSubscribers)}
            valueColor="var(--green2)"
            change={data.newSubscribersThisMonth > 0 ? `↑ ${data.newSubscribersThisMonth} new this month` : "No new subs this month"}
            changeUp={data.newSubscribersThisMonth > 0}
          />
          <StatCard
            label="Avg. Rating"
            value={data.avgRating > 0 ? `${data.avgRating} ★` : "No ratings yet"}
            valueColor="var(--gold)"
            change="Across all buddies"
            changeUp={data.avgRating > 0}
          />
          <StatCard
            label="Avg. Session"
            value={data.avgSessionMinutes > 0 ? `${data.avgSessionMinutes}m` : "—"}
            change={
              data.avgSessionDelta > 0
                ? `+${data.avgSessionDelta} sessions vs last month`
                : data.avgSessionDelta < 0
                ? `${data.avgSessionDelta} sessions vs last month`
                : "No sessions tracked yet"
            }
            changeUp={data.avgSessionDelta > 0}
          />
        </div>

        {/* ── Buddies table ── */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="text-[16px] font-semibold" style={{ color: "var(--text)" }}>
            My Finance Buddies
          </div>
        </div>

        {data.buddies.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="text-[48px] mb-4" style={{ color: "var(--muted)" }}>✦</div>
            <div className="text-[15px] font-semibold mb-2" style={{ color: "var(--text)" }}>
              You haven&apos;t published a buddy yet
            </div>
            <div className="text-[13px] mb-5" style={{ color: "var(--muted)" }}>
              Go to AI Studio to build and publish your first Finance Buddy.
            </div>
            <button
              onClick={() => router.push("/studio")}
              className="px-5 py-[10px] rounded-[10px] text-[13px] font-semibold"
              style={{ background: "var(--green)", color: "#fff", border: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green)"; }}
            >
              Open AI Studio →
            </button>
          </div>
        ) : (
          <div className="overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16 }}>
            {/* Table header */}
            <div className="grid px-5 py-[11px]" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
              {["Buddy", "Subscribers", "Rating", "Monthly Rev.", "Status"].map((h) => (
                <div key={h} className="text-[10px] font-semibold uppercase tracking-[.5px]" style={{ color: "var(--muted)" }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Table rows */}
            {data.buddies.map((buddy, i) => (
              <div key={buddy.id} style={{ borderBottom: i < data.buddies.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div
                  className="grid px-5 py-[14px] items-center transition-all duration-150"
                  style={{
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                    opacity: buddy.status === "pending" ? 0.75 : 1,
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                  {/* Buddy cell */}
                  <div className="flex items-center gap-[10px] min-w-0">
                    <div
                      className="flex items-center justify-center rounded-[10px] text-[16px] flex-shrink-0 overflow-hidden"
                      style={{ width: 34, height: 34, background: buddy.avatarBg }}
                    >
                      {isImageAvatar(buddy.emoji) ? (
                        <img src={buddy.emoji} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        buddy.emoji
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold truncate" style={{ color: "var(--text)" }}>
                        {buddy.name}
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--muted)" }}>
                        {buddy.price} · {buddy.model} · {buddy.category}
                      </div>
                    </div>
                  </div>

                  <div className="text-[13px]" style={{ color: "var(--muted)" }}>
                    {buddy.subscribers ?? "—"}
                  </div>

                  <div className="text-[13px] font-semibold" style={{ color: buddy.rating ? "var(--gold)" : "var(--muted)" }}>
                    {buddy.rating ? `${buddy.rating} ★` : "—"}
                  </div>

                  <div className="text-[13px] font-semibold" style={{ color: buddy.monthlyRevenue ? "var(--green2)" : "var(--muted)" }}>
                    {buddy.monthlyRevenue ? fmt(buddy.monthlyRevenue) : "—"}
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusPill status={buddy.status} />
                    <button
                      onClick={() => router.push(`/studio?edit=${buddy.id}`)}
                      className="px-2.5 py-1 rounded-[6px] text-[11px] font-semibold border transition-all hover:border-[var(--green)]"
                      style={{
                        background: "var(--card)",
                        color: "var(--text)",
                        borderColor: "var(--border)",
                        cursor: "pointer",
                      }}
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </div>

                {/* Feedback Note Banner */}
                {buddy.rejectionReason && (buddy.status === "revision_requested" || buddy.status === "flagged") && (
                  <div
                    className="px-5 py-3 border-t"
                    style={{
                      background: buddy.status === "flagged" ? "rgba(220,38,38,.06)" : "rgba(245,166,35,.08)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2 text-[12px]">
                      <div>
                        <span className="font-bold" style={{ color: buddy.status === "flagged" ? "#DC2626" : "#C47F00" }}>
                          {buddy.status === "flagged" ? "🚩 Violation Note from Admin: " : "🔄 Admin Correction Note: "}
                        </span>
                        <span style={{ color: "var(--text)" }}>&quot;{buddy.rejectionReason}&quot;</span>
                      </div>
                      <button
                        onClick={() => router.push(`/studio?edit=${buddy.id}`)}
                        className="px-3 py-1.5 rounded-[8px] text-[11px] font-semibold border transition-colors"
                        style={{
                          background: "var(--bg)",
                          borderColor: buddy.status === "flagged" ? "rgba(220,38,38,.4)" : "rgba(245,166,35,.4)",
                          color: buddy.status === "flagged" ? "#DC2626" : "#C47F00",
                          cursor: "pointer",
                        }}
                      >
                        ✏️ Fix & Resubmit in Studio →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
