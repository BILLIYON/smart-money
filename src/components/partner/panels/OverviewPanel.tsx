"use client";

import { SectionHeader, Card, CardHeader, KpiCard, Avatar, StatusPill, comingSoon } from "../shared";
import { OVERVIEW_KPIS, CLIENTS_NEEDING_ATTENTION, SCHEDULED_REPORTS } from "../mockData";
import type { PartnerTab } from "../PartnerSidebar";

export function OverviewPanel({ onNavigate }: { onNavigate: (tab: PartnerTab) => void }) {
  return (
    <div>
      <SectionHeader
        title="Partner"
        emphasis="Dashboard"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate("clients")}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold border"
              style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
            >
              View All Clients
            </button>
            <button
              onClick={() => onNavigate("buddies")}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold border-none text-white"
              style={{ background: "var(--green)" }}
            >
              + New Buddy
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px] mb-6">
        {OVERVIEW_KPIS.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <Card className="mb-5">
        <CardHeader
          title="⚠️ Clients Needing Attention"
          action={<span className="text-[12px]" style={{ color: "var(--muted)" }}>Auto-flagged by Smart Money AI</span>}
        />
        <div className="flex flex-col gap-[10px]">
          {CLIENTS_NEEDING_ATTENTION.map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-3 px-3 py-[10px] rounded-[10px]"
              style={{ background: c.bg, border: `1px solid ${c.border}` }}
            >
              <Avatar initials={c.initials} color={c.color} size={34} />
              <div className="flex-1">
                <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{c.name}</div>
                <div className="text-[11px]" style={{ color: "var(--muted)" }}>{c.meta}</div>
              </div>
              <button
                onClick={() => onNavigate("clients")}
                className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold border"
                style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
              >
                {c.cta}
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
