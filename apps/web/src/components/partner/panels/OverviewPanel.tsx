"use client";

import { useState, useEffect } from "react";
import { SectionHeader, Card, CardHeader, KpiCard, Avatar, StatusPill, comingSoon } from "../shared";
import { OVERVIEW_KPIS, CLIENTS_NEEDING_ATTENTION, SCHEDULED_REPORTS } from "../mockData";
import type { PartnerTab } from "../PartnerSidebar";

export function OverviewPanel({ onNavigate }: { onNavigate: (tab: PartnerTab) => void }) {
  const [kpis, setKpis] = useState(OVERVIEW_KPIS);
  const [attentionList, setAttentionList] = useState(CLIENTS_NEEDING_ATTENTION);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadOverview() {
      try {
        const res = await fetch("/api/partner/overview");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data.kpis && data.kpis.length > 0) setKpis(data.kpis);
            if (data.attentionList && data.attentionList.length > 0) setAttentionList(data.attentionList);
          }
        }
      } catch (err) {
        console.warn("[OverviewPanel] Failed to fetch live overview metrics, using cached baseline:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadOverview();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div>
      <SectionHeader
        title="Partner"
        emphasis="Dashboard"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate("clients")}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold border transition-all hover:opacity-90"
              style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
            >
              View All Clients
            </button>
            <button
              onClick={() => onNavigate("buddies")}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold border-none text-white transition-all hover:opacity-90"
              style={{ background: "var(--green)" }}
            >
              + New Buddy
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px] mb-6">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <Card className="mb-5">
        <CardHeader
          title="⚠️ Clients Needing Attention"
          action={
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--green)" }} />
              <span className="text-[12px]" style={{ color: "var(--muted)" }}>Live AI Monitor</span>
            </div>
          }
        />
        <div className="flex flex-col gap-[10px]">
          {attentionList.map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-3 px-3 py-[10px] rounded-[10px] transition-all hover:brightness-95"
              style={{ background: c.bg || "rgba(226,75,74,.04)", border: `1px solid ${c.border || "rgba(226,75,74,.15)"}` }}
            >
              <Avatar initials={c.initials} color={c.color} size={34} />
              <div className="flex-1">
                <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{c.name}</div>
                <div className="text-[11px]" style={{ color: "var(--muted)" }}>{c.meta}</div>
              </div>
              <button
                onClick={() => onNavigate("clients")}
                className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold border cursor-pointer hover:bg-white/10"
                style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
              >
                {c.cta || "View →"}
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="📬 Scheduled Client Reports"
          action={
            <button
              onClick={() => comingSoon("Configuring scheduled reports")}
              className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold border"
              style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
            >
              Configure
            </button>
          }
        />
        <div className="flex flex-col gap-2">
          {SCHEDULED_REPORTS.map((r) => (
            <div key={r.title} className="flex items-center justify-between px-3 py-[10px] rounded-[10px]" style={{ background: "var(--bg)" }}>
              <div>
                <div className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{r.title}</div>
                <div className="text-[11px]" style={{ color: "var(--muted)" }}>{r.sub}</div>
              </div>
              <StatusPill label={r.status} tone="active" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
