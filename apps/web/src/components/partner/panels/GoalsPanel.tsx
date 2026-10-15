"use client";

import { SectionHeader, StatusPill, comingSoon, Card, CardHeader } from "../shared";
import { GOALS_WRITTEN, GOAL_CLIENT_OPTIONS, GOAL_BUDDY_OPTIONS } from "../mockData";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 13,
  color: "var(--text)",
  outline: "none",
  marginBottom: 12,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: ".5px",
  marginBottom: 5,
  display: "block",
};

export function GoalsPanel() {
  return (
    <div>
      <SectionHeader
        title="🎯 Write"
        emphasis="Client Goals"
        action={<div className="text-[12px]" style={{ color: "var(--muted)" }}>Goals appear in client&apos;s Goal Tracker with your attribution</div>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Create Goal for Client" />
          <label style={labelStyle}>Select Client</label>
          <select style={{ ...inputStyle, appearance: "auto" }}>
            {GOAL_CLIENT_OPTIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label style={labelStyle}>Goal Title</label>
          <input style={inputStyle} defaultValue="Emergency Fund — 6 months expenses" />
          <div className="grid grid-cols-2 gap-[10px]">
            <div><label style={labelStyle}>Target Amount</label><input style={inputStyle} defaultValue="₦2,000,000" /></div>
            <div><label style={labelStyle}>Target Date</label><input style={inputStyle} defaultValue="December 2026" /></div>
          </div>
          <label style={labelStyle}>Advisory Note to Client</label>
          <textarea
            style={{ ...inputStyle, resize: "none" }}
            rows={3}
            defaultValue="Based on your monthly expenses of ₦175k, I recommend building a 6-month emergency fund of ₦2M before increasing investment exposure. This should be your top priority."
          />
          <label style={labelStyle}>Assign to Buddy</label>
          <select style={{ ...inputStyle, appearance: "auto" }}>
            {GOAL_BUDDY_OPTIONS.map((b) => <option key={b}>{b}</option>)}
          </select>
          <button
            onClick={() => comingSoon("Publishing a goal to a client")}
            className="w-full py-[10px] rounded-[10px] text-[13px] font-semibold text-white border-none"
            style={{ background: "var(--green)" }}
          >
            Publish Goal to Client →
          </button>
        </Card>

        <Card>
          <CardHeader title="Goals Written This Month" />
          <div className="flex flex-col gap-[10px]">
            {GOALS_WRITTEN.map((g) => (
              <div key={g.client} className="rounded-[10px] px-3 py-[10px]" style={{ background: "var(--bg)" }}>
                <div className="flex justify-between items-start mb-1">
                  <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{g.client}</div>
                  <StatusPill label={g.status} tone={g.progress === null ? "pending" : "active"} />
                </div>
                <div className="text-[12px]" style={{ color: "var(--muted)" }}>{g.meta}</div>
                {g.progress !== null && (
                  <div className="h-[6px] rounded-[3px] mt-[6px] overflow-hidden" style={{ background: "var(--border)" }}>
                    <div className="h-full rounded-[3px]" style={{ width: `${g.progress}%`, background: g.color }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
