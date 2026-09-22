"use client";

import { SectionHeader, InfoBanner, Toggle, comingSoon } from "../shared";
import { CUSTOM_ANALYTICS_RULES, ANALYTICS_CATEGORY_TOGGLES } from "../mockData";

export function AnalyticsRulesPanel() {
  return (
    <div>
      <SectionHeader
        title="⚙️"
        emphasis="Analytics Rules"
        action={<div className="text-[12px]" style={{ color: "var(--muted)" }}>Define how financial metrics are calculated for your clients</div>}
      />

      <InfoBanner tone="gold">
        ⚙️ These rules override Smart Money&apos;s default calculations. Clients see metrics calculated your way in
        their Spending Analytics dashboard.
      </InfoBanner>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <div className="text-[15px] font-semibold mb-3" style={{ color: "var(--text)" }}>Active Custom Rules</div>
          {CUSTOM_ANALYTICS_RULES.map((r) => (
            <div key={r.name} className="rounded-[10px] px-[14px] py-3 mb-[10px] flex items-center gap-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <span className="text-[18px]">{r.icon}</span>
              <div className="flex-1">
                <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{r.name}</div>
                <div className="text-[11px]" style={{ color: "var(--muted)", fontFamily: "monospace" }}>{r.formula}</div>
              </div>
              <Toggle on={r.on} />
            </div>
          ))}
          <button
            onClick={() => comingSoon("Adding a custom rule")}
            className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold border mt-1"
            style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
          >
            + Add Custom Rule
          </button>
        </div>

        <div>
          <div className="text-[15px] font-semibold mb-3" style={{ color: "var(--text)" }}>Included / Excluded Categories</div>
          <div className="rounded-[12px] p-[14px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            {ANALYTICS_CATEGORY_TOGGLES.map((t, i) => (
              <div
                key={t.label}
                className="flex items-center justify-between py-[11px]"
                style={{ borderBottom: i < ANALYTICS_CATEGORY_TOGGLES.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <div>
                  <div className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{t.label}</div>
                  <div className="text-[11px] mt-[2px]" style={{ color: "var(--muted)" }}>{t.desc}</div>
                </div>
                <Toggle on={t.on} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
