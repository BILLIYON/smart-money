"use client";

import { SectionHeader, InfoBanner, Toggle } from "../shared";
import { FEATURE_TOGGLES } from "../mockData";

export function FeatureControlPanel() {
  return (
    <div>
      <SectionHeader
        title="🎛️"
        emphasis="Feature Control"
        action={<div className="text-[12px]" style={{ color: "var(--muted)" }}>Toggle which Smart Money features your clients can see and use</div>}
      />

      <InfoBanner tone="blue">
        💡 These settings apply to <strong style={{ color: "var(--text)" }}>all your clients</strong>. Changes take
        effect immediately. Clients will see features disappear or appear on next app refresh.
      </InfoBanner>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FEATURE_TOGGLES.map((f) => (
          <div
            key={f.name}
            className="rounded-[12px] px-4 py-[14px] flex items-start gap-3"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
          >
            <div className="text-[20px] flex-shrink-0 mt-[2px]">{f.icon}</div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{f.name}</div>
                <Toggle on={f.on} />
              </div>
              <div className="text-[11px] leading-relaxed mt-1" style={{ color: "var(--muted)" }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
