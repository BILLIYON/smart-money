"use client";

import { useState } from "react";
import { SectionHeader, Avatar, InfoBanner, comingSoon } from "../shared";
import { APPROVALS } from "../mockData";

export function ApprovalsPanel() {
  const [decided, setDecided] = useState<Record<number, "approved" | "declined">>({});

  return (
    <div>
      <SectionHeader
        title="⚡"
        emphasis="Action Approvals"
        sub={undefined}
        action={<div className="text-[12px]" style={{ color: "var(--muted)" }}>Actions above ₦500,000 require partner sign-off</div>}
      />

      <InfoBanner tone="gold">
        ⚙️ <strong style={{ color: "var(--text)" }}>Approval threshold is set to ₦500,000.</strong> Any client agentic
        action above this amount is held for your review before execution. Change this in Feature Control → Agentic
        Oversight.
      </InfoBanner>

      {APPROVALS.map((a, i) => {
        const decision = decided[i];
        return (
          <div
            key={a.client + i}
            className="rounded-[14px] px-[18px] py-4 mb-3"
            style={{ background: "var(--card)", border: "1px solid var(--border)", borderLeft: "3px solid var(--gold)" }}
          >
            <div className="flex items-start gap-[10px] mb-[10px]">
              <Avatar initials={a.initials} color={a.color} size={36} />
              <div className="flex-1">
                <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{a.client}</div>
                <div className="text-[12px] mt-[1px]" style={{ color: "var(--muted)" }}>Requested by: {a.requestedBy}</div>
              </div>
              {!decision && (
                <span className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[11px] font-semibold" style={{ background: "rgba(245,166,35,.1)", color: "#C47F00" }}>
                  Pending your approval
                </span>
              )}
            </div>

            <div className="rounded-[10px] px-[14px] py-3 mb-[10px]" style={{ background: "var(--bg)" }}>
              <div className="grid grid-cols-3 gap-[10px]">
                <div><div className="text-[10px]" style={{ color: "var(--muted)" }}>Action</div><div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{a.action}</div></div>
                <div><div className="text-[10px]" style={{ color: "var(--muted)" }}>Amount</div><div style={{ fontFamily: "var(--font-dm-serif)", fontSize: 18, color: "var(--text)" }}>{a.amount}</div></div>
                <div><div className="text-[10px]" style={{ color: "var(--muted)" }}>From</div><div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{a.from}</div></div>
              </div>
            </div>

            <div
              className="text-[12px] italic leading-relaxed mb-[10px] px-3 py-2"
              style={{ background: "var(--bg)", borderLeft: "3px solid var(--green)", borderRadius: "0 8px 8px 0", color: "var(--muted)" }}
            >
              {a.reasoning}
            </div>

            {decision ? (
              <div className="text-[12px] font-semibold" style={{ color: decision === "approved" ? "var(--green2)" : "var(--muted)" }}>
                {decision === "approved" ? "✓ Approved and executing. Check Agentic Actions history." : "Declined. Client and buddy have been notified."}
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { comingSoon("Approving actions"); }}
                  className="px-4 py-[7px] rounded-[8px] text-[12px] font-semibold text-white border-none"
                  style={{ background: "var(--green)" }}
                >
                  ✓ Approve & Execute
                </button>
                <button
                  onClick={() => { comingSoon("Declining actions"); }}
                  className="px-4 py-[7px] rounded-[8px] text-[12px] font-semibold border"
                  style={{ background: "transparent", color: "var(--muted)", borderColor: "var(--border)" }}
                >
                  Decline
                </button>
                <button
                  onClick={() => comingSoon("Joining a client chat")}
                  className="px-4 py-[7px] rounded-[8px] text-[12px] font-semibold border"
                  style={{ background: "rgba(245,166,35,.08)", color: "#C47F00", borderColor: "rgba(245,166,35,.4)" }}
                >
                  💬 Join Client Chat
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
