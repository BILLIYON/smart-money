"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { PartnerFirm } from "@/types/partner";

const CATEGORY_FILTERS = [
  "All",
  "Wealth Management",
  "Investment Advisory",
  "Asset Management",
  "Multi-Family Office",
];

function PartnerCardSkeleton() {
  return (
    <div
      className="rounded-[16px] overflow-hidden animate-pulse"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div style={{ height: 80, background: "var(--border)" }} />
      <div className="p-5 space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5 w-3/4">
            <div className="h-4 rounded bg-slate-200 dark:bg-slate-700 w-2/3" />
            <div className="h-2.5 rounded bg-slate-200 dark:bg-slate-700 w-1/3" />
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-slate-300 dark:bg-slate-600 -mt-9" />
        </div>
        <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 w-full" />
        <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 w-4/5" />
        <div className="flex gap-2 py-2">
          <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="h-10 rounded-[10px] bg-slate-200 dark:bg-slate-700 mt-2" />
      </div>
    </div>
  );
}

function PartnerCard({ firm }: { firm: PartnerFirm }) {
  return (
    <Link
      href={`/partners/${firm.id}`}
      className="block rounded-[16px] overflow-hidden transition-all duration-200 hover:-translate-y-[2px]"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div style={{ height: 80, background: firm.banner }} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-[15px] font-bold" style={{ color: "var(--text)" }}>{firm.name}</div>
            <div className="text-[10px] uppercase tracking-[.5px] mt-[2px]" style={{ color: "var(--muted)" }}>{firm.type}</div>
          </div>
          <div
            className="rounded-[12px] flex items-center justify-center text-[18px] flex-shrink-0"
            style={{ width: 40, height: 40, background: firm.iconBg, marginTop: -36, border: "2px solid var(--card)" }}
          >
            {firm.icon}
          </div>
        </div>
        <div className="text-[12px] leading-relaxed mb-3 line-clamp-2" style={{ color: "var(--muted)" }}>{firm.desc}</div>
        <div className="flex flex-wrap gap-[6px] mb-3">
          {firm.tags.map((t) => (
            <span key={t} className="px-[9px] py-[3px] rounded-full text-[10px] font-semibold" style={{ background: "var(--bg)", color: "var(--muted)", border: "1px solid var(--border)" }}>{t}</span>
          ))}
        </div>
        <div className="flex gap-[14px] pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div><div className="text-[14px] font-bold" style={{ color: "var(--green2)" }}>{firm.rating}</div><div className="text-[10px]" style={{ color: "var(--muted)" }}>Rating</div></div>
          <div><div className="text-[14px] font-bold" style={{ color: "var(--text)" }}>{firm.clients}</div><div className="text-[10px]" style={{ color: "var(--muted)" }}>Clients</div></div>
          <div><div className="text-[14px] font-bold" style={{ color: "var(--text)" }}>{firm.minPortfolio}</div><div className="text-[10px]" style={{ color: "var(--muted)" }}>Min. Portfolio</div></div>
        </div>
        <div
          className="w-full mt-[14px] py-[10px] rounded-[10px] text-[13px] font-semibold text-white text-center"
          style={{ background: "var(--green)" }}
        >
          View Profile & Apply →
        </div>
      </div>
    </Link>
  );
}

export default function PartnersPage() {
  const router = useRouter();
  const [firms, setFirms] = useState<PartnerFirm[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadFirms() {
      try {
        setLoading(true);
        const res = await fetch("/api/partners");
        if (!res.ok) return;
        const data = await res.json();
        const list = data.firms || data.partners || [];
        if (mounted && Array.isArray(list)) {
          setFirms(list.map((f: any) => ({
            id: f.slug || f.id,
            name: f.name,
            type: f.type,
            icon: f.icon || "🏛️",
            banner: f.banner || "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
            iconBg: f.iconBg || "#0B1E3D",
            desc: f.desc || f.description || "",
            tags: Array.isArray(f.tags) ? f.tags : [],
            rating: f.rating || "4.8★",
            clients: f.clients || "1,000+",
            minPortfolio: f.minPortfolio || "₦0",
          })));
        }
      } catch (err) {
        console.error("Failed to load partner firms:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadFirms();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = firms;
    if (activeFilter !== "All") {
      list = list.filter((f) => f.type === activeFilter || f.tags.includes(activeFilter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q));
    }
    return list;
  }, [firms, activeFilter, search]);

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 w-full">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="text-[22px] font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
          Find a <em style={{ fontFamily: "var(--font-dm-serif)", fontStyle: "italic", color: "var(--green)" }}>Partner</em>
        </div>
        <div
          className="flex items-center gap-2 rounded-[10px] px-[14px] py-2 w-[220px]"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <span style={{ color: "var(--muted)" }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search firms..."
            className="border-none bg-transparent text-[13px] outline-none w-full"
            style={{ color: "var(--text)" }}
          />
        </div>
      </div>

      <div
        className="rounded-[16px] px-6 py-6 sm:px-7 mb-6 flex items-center gap-5 flex-wrap"
        style={{ background: "linear-gradient(135deg,var(--navy),var(--navy2))" }}
      >
        <div className="flex-1 min-w-[240px]">
          <div className="text-[11px] uppercase tracking-[2px] mb-[6px]" style={{ color: "rgba(255,255,255,.4)" }}>Verified Partner Firms</div>
          <div className="text-[20px] mb-[6px] text-white" style={{ fontFamily: "var(--font-dm-serif)" }}>Work with a real financial expert</div>
          <div className="text-[12px] leading-relaxed max-w-[500px]" style={{ color: "rgba(255,255,255,.5)" }}>
            Your AI buddy handles the day-to-day. These firms provide human expertise for the bigger decisions — investment strategy, tax planning, business structuring, estate management.
          </div>
        </div>
        <div className="text-center px-5 py-3 rounded-[12px] flex-shrink-0" style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)" }}>
          <div className="text-[24px]" style={{ fontFamily: "var(--font-dm-serif)", color: "var(--green)" }}>
            {loading ? "..." : firms.length}
          </div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,.45)" }}>Verified Partners</div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5" style={{ scrollbarWidth: "none" }}>
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className="px-[14px] py-[6px] rounded-full text-[12px] font-medium border whitespace-nowrap"
            style={
              activeFilter === f
                ? { background: "var(--navy)", color: "#fff", borderColor: "var(--navy)" }
                : { background: "var(--card)", color: "var(--muted)", borderColor: "var(--border)" }
            }
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <PartnerCardSkeleton />
          <PartnerCardSkeleton />
          <PartnerCardSkeleton />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((f) => <PartnerCard key={f.id} firm={f} />)}
        </div>
      ) : (
        <div className="text-center py-16 rounded-[16px] border" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
          <div className="text-[32px] mb-3">🔍</div>
          <div className="text-[14px]">No firms match &quot;{search || activeFilter}&quot; yet.</div>
        </div>
      )}

      <div className="mt-6 rounded-[16px] p-5" style={{ background: "rgba(74,144,217,.05)", border: "1px solid rgba(74,144,217,.2)" }}>
        <div className="flex items-start gap-[14px]">
          <div className="text-[24px] flex-shrink-0">💬</div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold mb-1" style={{ color: "var(--text)" }}>Invite Your Partner to a Chat</div>
            <div className="text-[12px] leading-relaxed mb-3" style={{ color: "var(--muted)" }}>
              Once you&apos;re working with a partner firm, you&apos;ll be able to share a chat with them so they can
              see the full conversation and join as an active participant — useful when you want human input on
              something you&apos;ve been discussing with your AI buddy. You can revoke access at any time from
              Settings → Privacy &amp; Data.
            </div>
            <button
              onClick={() => {
                toast.success("Opening AI Buddy chat to initiate partner co-pilot consultation...");
                router.push("/chat");
              }}
              className="px-4 py-[9px] rounded-[10px] text-[13px] font-semibold text-white border-none cursor-pointer hover:bg-emerald-600 transition"
              style={{ background: "var(--green)" }}
            >
              Invite a Partner to This Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
