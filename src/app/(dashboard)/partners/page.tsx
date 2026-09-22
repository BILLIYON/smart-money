"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { comingSoon } from "@/components/partner/shared";
import { PARTNER_FIRMS, PARTNER_CATEGORY_FILTERS, type PartnerFirm } from "@/components/partner/mockData";

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
        <div className="text-[12px] leading-relaxed mb-3" style={{ color: "var(--muted)" }}>{firm.desc}</div>
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
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = PARTNER_FIRMS;
    if (activeFilter !== "All") {
      list = list.filter((f) => f.type === activeFilter || f.tags.includes(activeFilter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q));
    }
    return list;
  }, [activeFilter, search]);

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
          <div className="text-[24px]" style={{ fontFamily: "var(--font-dm-serif)", color: "var(--green)" }}>{PARTNER_FIRMS.length}</div>
          <div className="text-[10px]" style={{ color: "rgba(255,255,255,.45)" }}>Verified Partners</div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5" style={{ scrollbarWidth: "none" }}>
        {PARTNER_CATEGORY_FILTERS.map((f) => (
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

      {filtered.length > 0 ? (
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
              onClick={() => comingSoon("Inviting a partner to a chat")}
              className="px-4 py-[9px] rounded-[10px] text-[13px] font-semibold text-white border-none"
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
