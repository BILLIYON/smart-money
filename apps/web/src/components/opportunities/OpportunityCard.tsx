"use client";

import { useRouter } from "next/navigation";
import { comingSoon } from "@/components/partner/shared";
import type { Opportunity } from "./mockData";

const STATUS_STYLES: Record<Opportunity["status"], { bg: string; color: string; label: string }> = {
  active: { bg: "rgba(245,166,35,.12)", color: "#C47F00", label: "⏳ Active" },
  acted: { bg: "rgba(0,196,140,.1)", color: "var(--green2)", label: "✓ Acted On" },
  dismissed: { bg: "rgba(107,122,153,.1)", color: "var(--muted)", label: "Dismissed" },
  missed: { bg: "rgba(226,75,74,.1)", color: "#E24B4A", label: "✗ Missed" },
};

export function OpportunityCard({ opp }: { opp: Opportunity }) {
  const router = useRouter();
  const status = STATUS_STYLES[opp.status];
  const isActive = opp.status === "active";

  return (
    <div
      className="rounded-[14px] p-5 relative"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${isActive ? "var(--gold)" : status.color}`,
        opacity: opp.status === "dismissed" ? 0.7 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-[10px]">
          <div
            className="rounded-[9px] flex items-center justify-center text-[15px] flex-shrink-0"
            style={{
              width: 34,
              height: 34,
              background: opp.sourceColor,
              fontFamily: opp.sourceAvatar.length <= 2 && opp.sourceAvatar === opp.sourceAvatar.toUpperCase() ? "var(--font-dm-serif)" : undefined,
              color: "#fff",
              fontSize: opp.sourceAvatar.length <= 2 ? 13 : 15,
            }}
          >
            {opp.sourceAvatar}
          </div>
          <div>
            <div className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>{opp.sourceName}</div>
            <div className="text-[10px]" style={{ color: "var(--muted)" }}>
              {opp.source === "partner" ? "🤝 Partner suggestion" : "🤖 AI Buddy"} · {opp.category}
            </div>
          </div>
        </div>
        <span
          className="px-[10px] py-[3px] rounded-full text-[11px] font-semibold whitespace-nowrap"
          style={{ background: status.bg, color: status.color }}
        >
          {status.label}
        </span>
      </div>

      <div className="text-[14px] font-semibold mb-2" style={{ color: "var(--text)" }}>{opp.title}</div>

      <div
        className="text-[12px] italic leading-relaxed mb-3 px-3 py-2"
        style={{ background: "var(--bg)", borderLeft: "3px solid var(--green)", borderRadius: "0 8px 8px 0", color: "var(--muted)" }}
      >
        {opp.reasoning}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <span className="text-[12px] font-semibold" style={{ color: "var(--green2)" }}>{opp.valueEstimate}</span>
        <span className="text-[11px]" style={{ color: "var(--muted)" }}>{opp.windowLabel}</span>
      </div>

      {isActive && (
        <div className="flex gap-2 flex-wrap mt-3">
          <button
            onClick={() => router.push("/chat")}
            className="px-3 py-[7px] rounded-[8px] text-[12px] font-semibold text-white border-none"
            style={{ background: "var(--green)" }}
          >
            Discuss with Buddy
          </button>
          <button
            onClick={() => comingSoon("Acting on an opportunity")}
            className="px-3 py-[7px] rounded-[8px] text-[12px] font-semibold border"
            style={{ background: "rgba(245,166,35,.08)", color: "#C47F00", borderColor: "rgba(245,166,35,.4)" }}
          >
            ⚡ Act on This
          </button>
          <button
            onClick={() => comingSoon("Setting a reminder")}
            className="px-3 py-[7px] rounded-[8px] text-[12px] font-semibold border"
            style={{ background: "transparent", color: "var(--muted)", borderColor: "var(--border)" }}
          >
            Remind Me Later
          </button>
          <button
            onClick={() => comingSoon("Dismissing an opportunity")}
            className="px-3 py-[7px] rounded-[8px] text-[12px] font-semibold border"
            style={{ background: "transparent", color: "var(--muted)", borderColor: "var(--border)" }}
          >
            Not Interested
          </button>
        </div>
      )}
    </div>
  );
}
