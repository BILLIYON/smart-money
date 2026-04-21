"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  status: "live" | "review";
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
  return n >= 1000 ? `₦${(n / 1000).toFixed(0)}k` : `₦${n.toLocaleString()}`;
}

// ── Stat card ──────────────────────────────────────────────
function StatCard({
  label,
  value,
  valueColor,
  change,
  changeUp = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  change: string;
  changeUp?: boolean;
}) {
  return (
    <div
      className="rounded-[14px] p-5"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div
        className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </div>
      <div
        className="text-[26px] font-bold mb-1"
        style={{ color: valueColor ?? "var(--text)", fontFamily: "var(--font-dm-serif)" }}
      >
        {value}
      </div>
      <div
        className="text-[11px] font-medium"
        style={{ color: changeUp ? "var(--green2)" : "var(--muted)" }}
      >
        {changeUp ? "↑ " : ""}{change}
      </div>
    </div>
  );
}

// ── Status pill ────────────────────────────────────────────
function StatusPill({ status }: { status: "live" | "review" }) {
  const isLive = status === "live";
  return (
    <span
      className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[10px] font-semibold"
      style={{
        background: isLive ? "rgba(0,196,140,.1)" : "rgba(245,166,35,.12)",
        color: isLive ? "var(--green2)" : "#C47F00",
      }}
    >
      {isLive ? "● Live" : "In Review"}
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────
export default function CreatorPage() {
  const router = useRouter();
  const [data, setData] = useState<DashData | null>(null);

  useEffect(() => {
    fetch("/api/creator").then((r) => r.json()).then(setData);
  }, []);

  if (!data) {
    return (
      <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
        <div className="px-4 py-6 sm:px-6 lg:px-8 w-full">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div className="h-6 w-44 rounded animate-pulse" style={{ background: "var(--border)" }} />
            <div className="h-9 w-28 rounded-[10px] animate-pulse" style={{ background: "var(--border)" }} />
          </div>
          {/* Earnings hero skeleton */}
          <div className="rounded-[16px] px-8 py-7 mb-6 animate-pulse" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="h-3 w-40 rounded mb-3" style={{ background: "var(--border)" }} />
            <div className="h-10 w-36 rounded mb-3" style={{ background: "var(--border)" }} />
            <div className="h-3 w-64 rounded mb-2" style={{ background: "var(--border)" }} />
            <div className="h-3 w-48 rounded" style={{ background: "var(--border)" }} />
          </div>
          {/* Stat cards skeleton */}
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-[14px] p-5 animate-pulse" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="h-3 w-24 rounded mb-3" style={{ background: "var(--border)" }} />
                <div className="h-7 w-20 rounded mb-2" style={{ background: "var(--border)" }} />
                <div className="h-3 w-32 rounded" style={{ background: "var(--border)" }} />
              </div>
            ))}
          </div>
          {/* Table skeleton */}
          <div className="overflow-hidden animate-pulse" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16 }}>
            <div className="px-5 py-[11px]" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
              <div className="h-3 w-48 rounded" style={{ background: "var(--border)" }} />
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-[14px]" style={{ borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
                <div className="w-[34px] h-[34px] rounded-[10px] flex-shrink-0" style={{ background: "var(--border)" }} />
                <div className="flex-1">
                  <div className="h-3 w-36 rounded mb-2" style={{ background: "var(--border)" }} />
                  <div className="h-3 w-24 rounded" style={{ background: "var(--border)" }} />
                </div>
                <div className="h-3 w-10 rounded" style={{ background: "var(--border)" }} />
                <div className="h-3 w-10 rounded" style={{ background: "var(--border)" }} />
                <div className="h-3 w-14 rounded" style={{ background: "var(--border)" }} />
                <div className="h-5 w-14 rounded-full" style={{ background: "var(--border)" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
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
          {/* Decorative orb */}
          <div
            className="absolute pointer-events-none"
            style={{ right: -40, bottom: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(0,196,140,.08)" }}
          />

          <div className="relative z-10">
            <div
              className="text-[10px] uppercase tracking-[2px] mb-2"
              style={{ color: "rgba(255,255,255,.5)" }}
            >
              Total Earnings This Month
            </div>
            <div
              className="text-[40px] font-bold mb-[6px] leading-none"
              style={{ fontFamily: "var(--font-dm-serif)", color: "var(--gold)" }}
            >
              {fmt(data.earnings)}
            </div>
            <div className="text-[12px]" style={{ color: "rgba(255,255,255,.5)", lineHeight: 1.5 }}>
              From {data.totalSubscribers} active subscribers across {data.buddies.filter((b) => b.status === "live").length} Finance Buddies
              <br />
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
            >
              {data.verified ? "Withdraw to Bank" : "Withdraw to Bank 🔒"}
            </button>
            <button
              className="px-5 py-[10px] rounded-[10px] text-[12px] font-medium transition-all duration-150"
              style={{
                background: "transparent",
                color: "rgba(255,255,255,.7)",
                border: "1px solid rgba(255,255,255,.2)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,.5)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,.2)"; }}
            >
              View Analytics
            </button>
          </div>
        </div>

        {/* Verification notice if not verified */}
        {!data.verified && (
          <div
            className="flex items-center gap-2 px-4 py-[10px] rounded-[10px] mb-5 text-[12px]"
            style={{ background: "rgba(245,166,35,.08)", border: "1px solid rgba(245,166,35,.25)", color: "#C47F00" }}
          >
            <span>🔒</span>
            <span>
              Complete identity verification to unlock withdrawals.{" "}
              <span className="font-semibold underline cursor-pointer">Verify now →</span>
            </span>
          </div>
        )}

        {/* ── 3 Stat cards ── */}
        <div
          className="grid gap-4 mb-6"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
        >
          <StatCard
            label="Active Subscribers"
            value={String(data.totalSubscribers)}
            valueColor="var(--green2)"
            change={`${data.newSubscribersThisMonth} from last month`}
            changeUp
          />
          <StatCard
            label="Avg. Rating"
            value={`${data.avgRating} ★`}
            valueColor="var(--gold)"
            change="Across all buddies"
            changeUp
          />
          <StatCard
            label="Avg. Session"
            value={`${data.avgSessionMinutes}m`}
            change={`+${data.avgSessionDelta}m from last month`}
            changeUp
          />
        </div>

        {/* ── Buddies table ── */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="text-[16px] font-semibold" style={{ color: "var(--text)" }}>
            My Finance Buddies
          </div>
        </div>

        <div
          className="overflow-hidden"
          style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16 }}
        >
          {/* Table header */}
          <div
            className="grid px-5 py-[11px]"
            style={{
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
              background: "var(--bg)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {["Buddy", "Subscribers", "Rating", "Monthly Rev.", "Status"].map((h) => (
              <div
                key={h}
                className="text-[10px] font-semibold uppercase tracking-[.5px]"
                style={{ color: "var(--muted)" }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Table rows */}
          {data.buddies.map((buddy, i) => (
            <div
              key={buddy.id}
              className="grid px-5 py-[14px] items-center transition-all duration-150"
              style={{
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                borderBottom: i < data.buddies.length - 1 ? "1px solid var(--border)" : "none",
                opacity: buddy.status === "review" ? 0.55 : 1,
                cursor: "default",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              {/* Buddy cell */}
              <div className="flex items-center gap-[10px] min-w-0">
                <div
                  className="flex items-center justify-center rounded-[10px] text-[16px] flex-shrink-0"
                  style={{ width: 34, height: 34, background: buddy.avatarBg }}
                >
                  {buddy.emoji}
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

              {/* Subscribers */}
              <div className="text-[13px]" style={{ color: "var(--muted)" }}>
                {buddy.subscribers ?? "—"}
              </div>

              {/* Rating */}
              <div
                className="text-[13px] font-semibold"
                style={{ color: buddy.rating ? "var(--gold)" : "var(--muted)" }}
              >
                {buddy.rating ? `${buddy.rating} ★` : "—"}
              </div>

              {/* Revenue */}
              <div
                className="text-[13px] font-semibold"
                style={{ color: buddy.monthlyRevenue ? "var(--green2)" : "var(--muted)" }}
              >
                {buddy.monthlyRevenue ? fmt(buddy.monthlyRevenue) : "—"}
              </div>

              {/* Status */}
              <div>
                <StatusPill status={buddy.status} />
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {data.buddies.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="text-[48px] mb-4" style={{ color: "var(--muted)" }}>✦</div>
            <div className="text-[15px] font-semibold mb-5" style={{ color: "var(--text)" }}>
              You haven&apos;t published a buddy yet
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
        )}

      </div>
    </div>
  );
}
