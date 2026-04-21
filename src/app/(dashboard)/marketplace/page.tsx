"use client";

import { useState, useMemo, useEffect } from "react";
import { CelebrityHero } from "@/components/buddy/CelebrityHero";
import { BuddyCard, CreateYourOwnCard } from "@/components/buddy/BuddyCard";
import { ARCHETYPE_BUDDIES, CELEBRITY_BUDDIES, type Buddy, type BuddyCategory } from "@/lib/buddies";
import type { CommunityBuddyRow } from "@/lib/db";
import Link from "next/link";

const MODEL_COLOR: Record<string, string> = {
  Claude: "#7B68EE",
  "GPT-4": "#10A37F",
  Gemini: "#4285F4",
};

function rowToBuddy(row: CommunityBuddyRow): Buddy {
  const price =
    row.price === "free" ? "Free"
    : row.price === "custom" && row.custom_price ? `$${row.custom_price}/mo`
    : "$5/mo";
  const badgeType: "free" | "pro" = row.price === "free" ? "free" : "pro";
  const model = (row.model ?? "Claude") as Buddy["model"];
  return {
    id: row.id,
    name: row.name,
    tag: row.tag ?? "",
    desc: row.description ?? "",
    price,
    priceNote: row.price_note ?? "",
    badge: price,
    badgeType,
    bannerColor: row.banner_color ?? "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
    avatarBg: row.avatar_bg ?? "#1A3A6E",
    avatarContent: row.avatar_content ?? "🎯",
    avatarIsSerif: row.avatar_is_serif ?? false,
    model,
    modelColor: MODEL_COLOR[model] ?? "#7B68EE",
    rating: "New",
    reviewCount: "0",
    isFanSim: row.is_fan_sim ?? false,
    disclaimer: row.disclaimer ?? undefined,
    categories: (row.categories ?? []) as BuddyCategory[],
    philosophy: row.philosophy ?? "",
    samples: row.samples ?? [],
    reviews: [],
    includes: row.includes ?? [],
  };
}

const FILTERS: { label: string; value: BuddyCategory | "All" | "Free Only" }[] = [
  { label: "All",              value: "All" },
  { label: "Investing",        value: "Investing" },
  { label: "Budgeting",        value: "Budgeting" },
  { label: "Entrepreneurship", value: "Entrepreneurship" },
  { label: "Academic",         value: "Academic" },
  { label: "Crypto",           value: "Crypto" },
  { label: "Free Only",        value: "Free Only" },
  { label: "Celebrity Sims",   value: "Celebrity Sim" },
];

export default function MarketplacePage() {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [communityBuddies, setCommunityBuddies] = useState<Buddy[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch("/api/studio").then((r) => r.json()),
      fetch("/api/hidden-buddies").then((r) => r.json()),
    ])
      .then(([rows, ids]: [CommunityBuddyRow[], string[]]) => {
        setCommunityBuddies(rows.map(rowToBuddy));
        setHiddenIds(new Set(ids));
      })
      .catch(() => {});
  }, []);

  const visibleArchetypes = ARCHETYPE_BUDDIES.filter((b) => !hiddenIds.has(b.id));
  const visibleCelebs = CELEBRITY_BUDDIES.filter((b) => !hiddenIds.has(b.id));

  const filteredArchetypes = useMemo(() => {
    if (activeFilter === "All") return visibleArchetypes;
    if (activeFilter === "Free Only") return visibleArchetypes.filter((b) => b.badgeType === "free");
    if (activeFilter === "Celebrity Sim") return [];
    return visibleArchetypes.filter((b) => b.categories.includes(activeFilter as BuddyCategory));
  }, [activeFilter, visibleArchetypes]);

  const filteredCelebs = useMemo(() => {
    if (activeFilter === "Free Only") return [];
    if (activeFilter === "All" || activeFilter === "Celebrity Sim") return visibleCelebs;
    return visibleCelebs.filter((b) => b.categories.includes(activeFilter as BuddyCategory));
  }, [activeFilter, visibleCelebs]);

  const filteredCommunity = useMemo(() => {
    if (activeFilter === "Celebrity Sim") return [];
    if (activeFilter === "All") return communityBuddies;
    if (activeFilter === "Free Only") return communityBuddies.filter((b) => b.badgeType === "free");
    return communityBuddies.filter((b) => b.categories.includes(activeFilter as BuddyCategory));
  }, [activeFilter, communityBuddies]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 w-full">
      {/* Celebrity Hero */}
      <CelebrityHero />

      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-[18px] font-semibold"
          style={{ color: "var(--text)", fontFamily: "var(--font-dm-serif)" }}
        >
          Or choose an Archetype Buddy
        </h2>
        <Link
          href="/studio"
          className="text-[12px] font-medium transition-colors duration-200"
          style={{ color: "var(--green)" }}
        >
          + Create a Buddy
        </Link>
      </div>

      {/* Filter chips */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 mb-6"
        style={{ scrollbarWidth: "none" }}
      >
        {FILTERS.map((f) => {
          const active = activeFilter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className="flex-shrink-0 px-4 py-[7px] rounded-full text-[12px] font-medium border transition-all duration-200"
              style={
                active
                  ? { background: "var(--navy)", color: "#fff", borderColor: "var(--navy)" }
                  : { background: "var(--card)", color: "var(--muted)", borderColor: "var(--border)" }
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Archetype grid */}
      {filteredArchetypes.length > 0 ? (
        <div
          className="grid gap-5 mb-8"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}
        >
          {filteredArchetypes.map((buddy) => (
            <BuddyCard key={buddy.id} buddy={buddy} />
          ))}
          <CreateYourOwnCard />
        </div>
      ) : activeFilter !== "Celebrity Sim" && activeFilter !== "Free Only" ? (
        <div
          className="text-center py-12 mb-8 rounded-[16px] border"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          <div className="text-[32px] mb-3">🔍</div>
          <div className="text-[14px]">No Archetype Buddies match this filter yet.</div>
        </div>
      ) : null}

      {/* Community Buddies section */}
      {filteredCommunity.length > 0 && (
        <>
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-[11px] uppercase tracking-[2px]" style={{ color: "var(--muted)" }}>
              Community Buddies
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>
          <div
            className="grid gap-5 mb-8"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}
          >
            {filteredCommunity.map((buddy) => (
              <BuddyCard key={buddy.id} buddy={buddy} />
            ))}
          </div>
        </>
      )}

      {/* Celebrity section divider */}
      {filteredCelebs.length > 0 && (
        <>
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-[11px] uppercase tracking-[2px]" style={{ color: "var(--muted)" }}>
              Celebrity AI Simulations
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          {/* Fan disclaimer banner */}
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-[12px] border mb-5 text-[12px] leading-relaxed"
            style={{
              background: "rgba(245,166,35,.06)",
              borderColor: "rgba(245,166,35,.2)",
              color: "var(--muted)",
            }}
          >
            <span className="text-[16px] flex-shrink-0">⚠️</span>
            <span>
              <strong style={{ color: "var(--text)" }}>Fan-created simulations.</strong>{" "}
              These AI personas are trained on publicly available books, interviews, and speeches. They are not affiliated with, endorsed by, or representative of the named individuals.
            </span>
          </div>

          {/* Celebrity grid */}
          <div
            className="grid gap-5 mb-8"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}
          >
            {filteredCelebs.map((buddy) => (
              <BuddyCard key={buddy.id} buddy={buddy} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
