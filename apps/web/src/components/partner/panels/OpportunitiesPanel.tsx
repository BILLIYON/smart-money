"use client";

import { SectionHeader, StatusPill, comingSoon, Card, CardHeader } from "../shared";
import { OPPORTUNITIES_SENT } from "@/components/opportunities/mockData";
import { GOAL_CLIENT_OPTIONS } from "../mockData";

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

const STATUS_TONE: Record<string, "active" | "pending" | "inactive"> = {
  Active: "pending",
  "Acted On": "active",
  Missed: "inactive",
};

export function PartnerOpportunitiesPanel() {
  return (
    <div>
      <SectionHeader
        title="💡 Send Client"
        emphasis="Opportunities"
        action={<div className="text-[12px]" style={{ color: "var(--muted)" }}>Time-sensitive suggestions appear in the client&apos;s Opportunities tab</div>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Send Opportunity" />
          <label style={labelStyle}>Select Client</label>
          <select style={{ ...inputStyle, appearance: "auto" }}>
            {GOAL_CLIENT_OPTIONS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label style={labelStyle}>Title</label>
          <input style={inputStyle} placeholder="e.g. REIT allocation matching your stated goals" />
          <label style={labelStyle}>Category</label>
          <select style={{ ...inputStyle, appearance: "auto" }}>
            <option>Investment</option>
            <option>Real Estate</option>
            <option>Rate Alert</option>
            <option>Spending</option>
          </select>
          <label style={labelStyle}>Reasoning (shown to client)</label>
          <textarea
            style={{ ...inputStyle, resize: "none" }}
            rows={3}
            placeholder="Why this is relevant to them specifically — reference past conversations, their stated goals, or their DataBank."
          />
          <div className="grid grid-cols-2 gap-[10px]">
            <div><label style={labelStyle}>Estimated Value</label><input style={inputStyle} placeholder="e.g. +₦40,000/yr" /></div>
            <div><label style={labelStyle}>Window Closes</label><input style={inputStyle} placeholder="e.g. 2 weeks" /></div>
          </div>
          <button
            onClick={() => comingSoon("Sending an opportunity to a client")}
            className="w-full py-[10px] rounded-[10px] text-[13px] font-semibold text-white border-none"
            style={{ background: "var(--green)" }}
          >
            Send Opportunity →
          </button>
        </Card>

        <Card>
          <CardHeader title="Opportunities Sent" />
          <div className="flex flex-col gap-[10px]">
            {OPPORTUNITIES_SENT.map((o, i) => (
              <div key={i} className="rounded-[10px] px-3 py-[10px]" style={{ background: "var(--bg)" }}>
                <div className="flex justify-between items-start mb-1">
                  <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{o.client}</div>
                  <StatusPill label={o.status} tone={STATUS_TONE[o.status] ?? "pending"} />
                </div>
                <div className="text-[12px]" style={{ color: "var(--muted)" }}>{o.title}</div>
                <div className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>Sent {o.sentAgo}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
