"use client";

import { useState, useEffect } from "react";
import { SectionHeader, InfoBanner, StatusPill, Toggle, Card, CardHeader } from "../shared";

export interface PartnerBuddyItem {
  id: string;
  name: string;
  meta: string;
  type: string;
  model: string;
  visibility: string;
  subscribers: string;
  escalatesTo: string;
  status: string;
  icon: string;
  bg: string;
  color: string;
}

export interface EscalationRuleItem {
  id: string;
  trigger: string;
  value: string;
  target: string;
  on: boolean;
}

export function BuddiesPanel() {
  const [buddies, setBuddies] = useState<PartnerBuddyItem[]>([]);
  const [rules, setRules] = useState<EscalationRuleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBuddies = async () => {
    try {
      const res = await fetch("/api/partner/buddies");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.buddies)) {
          setBuddies(data.buddies);
        }
        if (Array.isArray(data.escalationRules)) {
          setRules(data.escalationRules);
        }
      }
    } catch (err) {
      console.warn("[BuddiesPanel] Error loading buddies & rules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuddies();
  }, []);

  const handleToggleRule = async (ruleId: string, currentOn: boolean) => {
    const nextOn = !currentOn;
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, on: nextOn } : r))
    );

    try {
      await fetch("/api/partner/buddies/escalation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId, isEnabled: nextOn }),
      });
    } catch (err) {
      console.error("[BuddiesPanel] Failed to toggle rule:", err);
    }
  };

  return (
    <div>
      <SectionHeader
        title="🤖 Partner"
        emphasis="AI Buddies"
        action={
          <button
            onClick={() => {
              window.location.href = "/studio";
            }}
            className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold text-white border-none cursor-pointer hover:bg-emerald-600 transition-all shadow"
            style={{ background: "var(--green)" }}
          >
            + Create in AI Studio
          </button>
        }
      />

      <InfoBanner tone="green">
        🤖 Partner buddies can be <strong style={{ color: "var(--text)" }}>Public</strong> (visible in the Smart
        Money Marketplace) or <strong style={{ color: "var(--text)" }}>Private</strong> (only your clients see them).
        Staff profile buddies include an interactive consultation booking CTA linking directly to advisor calendars.
      </InfoBanner>

      {loading ? (
        <div className="rounded-[16px] p-12 text-center border mb-5" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--muted)" }}>
          <div className="text-[14px] animate-pulse">Loading partner AI buddies...</div>
        </div>
      ) : buddies.length === 0 ? (
        <div className="rounded-[16px] p-12 text-center border mb-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="text-[36px] mb-3">🤖</div>
          <div className="text-[16px] font-semibold mb-1" style={{ color: "var(--text)" }}>No Proprietary AI Buddies Created</div>
          <div className="text-[12px] max-w-[420px] mx-auto mb-5 leading-relaxed" style={{ color: "var(--muted)" }}>
            Train institutional AI co-pilots with your firm&apos;s investment methodology, risk models, and brand personality.
          </div>
          <button
            onClick={() => {
              window.location.href = "/studio";
            }}
            className="px-5 py-[10px] rounded-[10px] text-[13px] font-semibold text-white border-none cursor-pointer hover:opacity-90 transition-all"
            style={{ background: "var(--green)" }}
          >
            + Create Your First Buddy
          </button>
        </div>
      ) : (
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
              {buddies.map((b, idx) => (
                <tr key={b.id || idx} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-[14px] py-3">
                    <div className="flex items-center gap-[10px]">
                      <div
                        className="rounded-[10px] flex items-center justify-center text-[15px] flex-shrink-0"
                        style={{ width: 34, height: 34, background: b.bg || "#132952", color: b.color || "#fff" }}
                      >
                        {b.icon || "🤖"}
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
                        background: b.visibility?.startsWith("Public") ? "rgba(74,26,107,.1)" : "rgba(0,196,140,.1)",
                        color: b.visibility?.startsWith("Public") ? "#4A1A6B" : "var(--green2)",
                      }}
                    >
                      {b.visibility}
                    </span>
                  </td>
                  <td className="px-[14px] py-3 text-[13px] font-semibold" style={{ color: "var(--text)" }}>{b.subscribers}</td>
                  <td className="px-[14px] py-3 text-[12px]" style={{ color: "var(--muted)" }}>{b.escalatesTo}</td>
                  <td className="px-[14px] py-3"><StatusPill label={b.status} tone="active" /></td>
                  <td className="px-[14px] py-3 text-right">
                    <button
                      onClick={() => {
                        window.location.href = `/buddies/${b.id || "stanbic-copilot"}`;
                      }}
                      className="px-[10px] py-[6px] rounded-[8px] text-[11px] font-semibold border cursor-pointer hover:bg-neutral-800 transition-all"
                      style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
                    >
                      Test Chat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Card>
        <CardHeader
          title="🔀 Escalation Rules"
          action={
            <div className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>
              Auto-escalates high-value or risk-flagged conversations
            </div>
          }
        />
        {rules.length === 0 ? (
          <div className="py-6 text-center text-[12px]" style={{ color: "var(--muted)" }}>
            No conversation escalation rules configured.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rules.map((r, i) => (
              <div key={r.id || i} className="flex flex-wrap items-center gap-3 px-3.5 py-[11px] rounded-[10px] text-[12px]" style={{ background: "var(--bg)" }}>
                <span style={{ color: "var(--muted)", minWidth: 100 }}>{r.trigger}</span>
                <span
                  className="px-[10px] py-[3px] rounded-[6px]"
                  style={{ background: "var(--card)", border: "1px solid var(--border)", fontFamily: "monospace" }}
                >
                  {r.value}
                </span>
                <span style={{ color: "var(--muted)" }}>→ escalate to</span>
                <span className="font-semibold" style={{ color: "var(--text)" }}>{r.target}</span>
                <div className="ml-auto">
                  <Toggle
                    on={r.on}
                    onToggle={() => handleToggleRule(r.id || String(i), r.on)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
