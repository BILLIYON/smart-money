"use client";

import { useState, useMemo, useEffect } from "react";
import { CelebrityHero } from "@/components/buddy/CelebrityHero";
import { BuddyCard, CelebrityCard, CreateYourOwnCard } from "@/components/buddy/BuddyCard";
import { useBuddyStore } from "@/store/buddyStore";
import { type Buddy, type BuddyCategory, getAllBuddies } from "@/lib/buddies";
import type { CommunityBuddyRow } from "@/lib/db";
import Link from "next/link";

const MODEL_COLOR: Record<string, string> = {
  Claude: "#7B68EE",
  "GPT-4": "#10A37F",
  Gemini: "#4285F4",
  Groq: "#F55036",
};

function rowToBuddy(row: CommunityBuddyRow): Buddy {
  const price =
    row.price_note ||
    (row.price === "free" || row.price === "0" ? "Free" : `₦${row.price}/mo`);
  const badgeType: "free" | "pro" = (row.price === "free" || row.price === "0" || row.price_note === "Free") ? "free" : "pro";
  const rawModel = (row.model ?? "").toLowerCase();
  const model: Buddy["model"] =
    rawModel.includes("groq") || rawModel.includes("llama") ? "Groq" :
    rawModel.includes("gpt") ? "GPT-4" :
    rawModel.includes("gemini") ? "Gemini" :
    "Claude";

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
    rating: row.rating ? String(row.rating) : "4.8",
    reviewCount: row.review_count ? String(row.review_count) : "5.2k",
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
  const [loading, setLoading] = useState(true);
  const searchQuery = useBuddyStore((s) => s.searchQuery);

  useEffect(() => {
    Promise.all([
      fetch("/api/studio").then((r) => r.json()),
      fetch("/api/hidden-buddies").then((r) => r.json()),
    ])
      .then(([rows, ids]: [CommunityBuddyRow[], string[]]) => {
        if (Array.isArray(rows)) {
          setCommunityBuddies(rows.map(rowToBuddy));
        }
        if (Array.isArray(ids)) {
          setHiddenIds(new Set(ids));
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const { visibleArchetypes, visibleCelebs, extraCommunity } = useMemo(() => {
    const allBuddies = getAllBuddies(communityBuddies);
    const activeFromDb = allBuddies.filter((b) => !hiddenIds.has(b.id));

    const archetypes = activeFromDb.filter((b) => !b.isFanSim);
    const celebs = activeFromDb.filter((b) => b.isFanSim);
    const extra: Buddy[] = [];

    return {
      visibleArchetypes: archetypes,
      visibleCelebs: celebs,
      extraCommunity: extra,
    };
  }, [communityBuddies, hiddenIds]);

  const filteredArchetypes = useMemo(() => {
    let list = visibleArchetypes;
    if (activeFilter === "Free Only") {
      list = list.filter((b) => b.badgeType === "free");
    } else if (activeFilter !== "All" && activeFilter !== "Celebrity Sim") {
      list = list.filter((b) => b.categories.includes(activeFilter as BuddyCategory));
    } else if (activeFilter === "Celebrity Sim") {
      return [];
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.tag.toLowerCase().includes(q) ||
          b.desc.toLowerCase().includes(q) ||
          b.categories.some((cat) => cat.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeFilter, visibleArchetypes, searchQuery]);

  const filteredCelebs = useMemo(() => {
    if (activeFilter === "Free Only") return [];
    let list = visibleCelebs;
    if (activeFilter !== "All" && activeFilter !== "Celebrity Sim") {
      list = list.filter((b) => b.categories.includes(activeFilter as BuddyCategory));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.tag.toLowerCase().includes(q) ||
          b.desc.toLowerCase().includes(q) ||
          b.categories.some((cat) => cat.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeFilter, visibleCelebs, searchQuery]);

  const filteredCommunity = useMemo(() => {
    if (activeFilter === "Celebrity Sim") return [];
    let list = extraCommunity;
    if (activeFilter === "Free Only") {
      list = list.filter((b) => b.badgeType === "free");
    } else if (activeFilter !== "All") {
      list = list.filter((b) => b.categories.includes(activeFilter as BuddyCategory));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.tag.toLowerCase().includes(q) ||
          b.desc.toLowerCase().includes(q) ||
          b.categories.some((cat) => cat.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeFilter, extraCommunity, searchQuery]);

  const dynamicFilters = useMemo(() => {
    const predefinedValues = new Set(FILTERS.map((f) => f.value as string));
    const customCats = new Set<string>();
    for (const b of communityBuddies) {
      for (const cat of b.categories) {
        if (!predefinedValues.has(cat)) {
          customCats.add(cat);
        }
      }
    }
    const customFilters = Array.from(customCats).map((cat) => ({ label: cat, value: cat }));
    return [...FILTERS, ...customFilters];
  }, [communityBuddies]);

  const allMergedBuddies = [...filteredArchetypes, ...filteredCelebs, ...filteredCommunity];

  if (loading) {
    return (
      <div className="px-3 py-6 sm:px-6 lg:px-8 w-full">
        <div
          className="rounded-[20px] mb-8 animate-pulse"
          style={{ height: 160, background: "var(--card)", border: "1px solid var(--border)" }}
        />
        <div className="flex gap-2 mb-6">
          {[80, 90, 110, 80, 70, 90].map((w, i) => (
            <div
              key={i}
              className="rounded-full animate-pulse"
              style={{ width: w, height: 32, background: "var(--card)" }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 sm:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[16px] overflow-hidden animate-pulse"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <div style={{ height: 64, background: "var(--border)" }} />
              <div className="p-3">
                <div className="rounded mb-2" style={{ height: 12, width: "60%", background: "var(--border)" }} />
                <div className="rounded mb-3" style={{ height: 10, width: "80%", background: "var(--border)" }} />
                <div className="rounded" style={{ height: 28, background: "var(--border)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-6 sm:px-6 lg:px-8 w-full">
      {/* Dynamic Celebrity Hero */}
      <CelebrityHero celebs={visibleCelebs} />

      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-[18px] font-semibold"
          style={{ color: "var(--text)", fontFamily: "var(--font-dm-serif)" }}
        >
          {activeFilter === "Celebrity Sim"
            ? "Celebrity AI Simulations"
            : activeFilter === "All"
            ? "All Finance Buddies"
            : `${activeFilter} Buddies`}
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
        {dynamicFilters.map((f) => {
          const active = activeFilter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className="px-4 py-[7px] rounded-full text-[13px] font-medium transition-all duration-[250ms] border whitespace-nowrap cursor-pointer"
              style={
                active
                  ? { background: "var(--navy)", color: "white", borderColor: "var(--navy)" }
                  : { background: "var(--card)", color: "var(--muted)", borderColor: "var(--border)" }
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Fan disclaimer banner */}
      {activeFilter === "Celebrity Sim" && filteredCelebs.length > 0 && (
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
            These AI personas are trained on publicly available books, interviews, and speeches.
            They are not affiliated with, endorsed by, or representative of the named individuals.
          </span>
        </div>
      )}

      {/* Merged database buddies grid */}
      {allMergedBuddies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 sm:gap-5 mb-8">
          {filteredArchetypes.map((buddy) => (
            <BuddyCard key={buddy.id} buddy={buddy} />
          ))}
          {filteredCelebs.map((buddy) => (
            <CelebrityCard key={buddy.id} buddy={buddy} />
          ))}
          {filteredCommunity.map((buddy) => (
            <BuddyCard key={buddy.id} buddy={buddy} />
          ))}
          {activeFilter !== "Celebrity Sim" && <CreateYourOwnCard />}
        </div>
      ) : (
        <div
          className="text-center py-12 mb-8 rounded-[16px] border"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          <div className="text-[32px] mb-3">🔍</div>
          <div className="text-[14px]">
            {searchQuery.trim()
              ? `No Buddies match your search for "${searchQuery}" under this filter.`
              : "No Buddies match this filter yet."}
          </div>
        </div>
      )}
    </div>
  );
}
