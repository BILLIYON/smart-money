"use client";

import { SectionHeader, InfoBanner, StatusPill, Toggle, comingSoon, Card, CardHeader } from "../shared";
import { PARTNER_BUDDIES, ESCALATION_RULES } from "../mockData";

export function BuddiesPanel() {
  return (
    <div>
      <SectionHeader
        title="🤖 Partner"
        emphasis="AI Buddies"
        action={
          <button
            onClick={() => comingSoon("Creating a buddy in AI Studio")}
            className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold text-white border-none"
            style={{ background: "var(--green)" }}
          >
            + Create in AI Studio
          </button>
        }
      />

      <InfoBanner tone="green">
        🤖 Partner buddies can be <strong style={{ color: "var(--text)" }}>Public</strong> (visible in the Smart
        Money Marketplace) or <strong style={{ color: "var(--text)" }}>Private</strong> (only your clients see them).
        Staff profile buddies include a <strong style={{ color: "var(--text)" }}>&quot;Book a Session&quot;</strong> CTA
        that links to your calendar.
      </InfoBanner>

      <div className="rounded-[16px] overflow-hidden mb-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
              {["Buddy", "Type", "Model", "Visibility", "Subscribers", "Escalates To", "Status", ""].map((h) => (
                <th key={h} className="text-[10px] font-bold uppercase tracking-[.5px] px-[14px] py-[10px] text-left whitespace-nowrap" style={{ color: "var(--muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PARTNER_BUDDIES.map((b) => (
              <tr key={b.name} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-[14px] py-3">
                  <div className="flex items-center gap-[10px]">
                    <div
                      className="rounded-[10px] flex items-center justify-center text-[14px] flex-shrink-0"
                      style={{ width: 34, height: 34, background: b.bg, color: b.color }}
                    >
                      {b.icon}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{b.name}</div>
                      <div className="text-[11px]" style={{ color: "var(--muted)" }}>{b.meta}</div>
                    </div>
                  </div>
                </td>
                <td className="px-[14px] py-3 text-[12px]" style={{ color: "var(--text)" }}>{b.type}</td>
                <td className="px-[14px] py-3"><StatusPill label={b.model} tone="active" /></td>
                <td className="px-[14px] py-3">
                  <span
                    className="inline-flex px-[10px] py-[3px] rounded-full text-[10px] font-semibold"
                    style={{
                      background: b.visibility.startsWith("Public") ? "rgba(74,26,107,.1)" : "rgba(0,196,140,.1)",
                      color: b.visibility.startsWith("Public") ? "#4A1A6B" : "var(--green2)",
                    }}
                  >
                    {b.visibility}
                  </span>
                </td>
                <td className="px-[14px] py-3 text-[13px] font-semibold" style={{ color: "var(--text)" }}>{b.subscribers}</td>
                <td className="px-[14px] py-3 text-[12px]" style={{ color: "var(--muted)" }}>{b.escalatesTo}</td>
                <td className="px-[14px] py-3"><StatusPill label={b.status} tone="active" /></td>
                <td className="px-[14px] py-3">
                  <button
                    onClick={() => comingSoon("Editing a partner buddy")}
                    className="px-[10px] py-[6px] rounded-[8px] text-[11px] font-semibold border"
                    style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card>
        <CardHeader
          title="🔀 Escalation Rules"
          action={
            <button
              onClick={() => comingSoon("Adding an escalation rule")}
              className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold border"
              style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
            >
              + Add Rule
            </button>
          }
        />
        <div className="flex flex-col gap-2">
          {ESCALATION_RULES.map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-3 px-3 py-[10px] rounded-[10px] text-[12px]" style={{ background: "var(--bg)" }}>
              <span style={{ color: "var(--muted)", minWidth: 100 }}>{r.trigger}</span>
              <span
                className="px-[10px] py-[3px] rounded-[6px]"
                style={{ background: "var(--card)", border: "1px solid var(--border)", fontFamily: "monospace" }}
              >
                {r.value}
              </span>
              <span style={{ color: "var(--muted)" }}>→ escalate to</span>
              <span className="font-semibold" style={{ color: "var(--text)" }}>{r.target}</span>
              <div className="ml-auto"><Toggle on={r.on} /></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
