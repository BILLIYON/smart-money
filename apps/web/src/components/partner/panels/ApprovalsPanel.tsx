"use client";

import { useState, useEffect } from "react";
import { SectionHeader, Avatar, InfoBanner } from "../shared";
import type { ApprovalItem } from "@/types/partner";

export function ApprovalsPanel() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [decided, setDecided] = useState<Record<string, "approved" | "declined">>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchApprovals = async () => {
    try {
      const res = await fetch("/api/partner/approvals");
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals || []);
      }
    } catch (err) {
      console.warn("[ApprovalsPanel] Error fetching approvals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleDecision = async (id: string, decision: "approve" | "decline") => {
    setProcessingId(id);
    const resolvedState = decision === "approve" ? "approved" : "declined";
    setDecided((prev) => ({ ...prev, [id]: resolvedState }));

    try {
      await fetch(`/api/partner/approvals/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
    } catch (err) {
      console.error("[ApprovalsPanel] Error processing decision:", err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div>
      <SectionHeader
        title="⚡"
        emphasis="Action Approvals"
        sub={undefined}
        action={
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[12px] font-medium" style={{ color: "var(--muted)" }}>
              Actions &gt; ₦500,000 require partner sign-off
            </span>
          </div>
        }
      />

      <InfoBanner tone="gold">
        ⚙️ <strong style={{ color: "var(--text)" }}>Approval threshold is set to ₦500,000.</strong> Any client agentic
        action above this amount is held in this oversight queue before execution. Change this in Feature Control → Agentic
        Oversight.
      </InfoBanner>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-[13px] text-zinc-400 animate-pulse">Loading approvals queue...</div>
        </div>
      ) : approvals.length === 0 ? (
        <div className="rounded-[14px] p-8 text-center border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="text-[28px] mb-2">🛡️</div>
          <div className="text-[14px] font-semibold text-white mb-1">Queue is Clear</div>
          <div className="text-[12px]" style={{ color: "var(--muted)" }}>
            No client agentic actions currently exceed the institutional threshold.
          </div>
        </div>
      ) : (
        approvals.map((a, i) => {
          const actionKey = a.id || `${a.client}-${i}`;
          const decision = decided[actionKey] || (a.status === "executed" ? "approved" : a.status === "declined_by_partner" ? "declined" : null);
          const isProcessing = processingId === actionKey;

          return (
            <div
              key={actionKey}
              className="rounded-[14px] px-[18px] py-4 mb-3 transition-all"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderLeft: `3px solid ${decision === "approved" ? "var(--green)" : decision === "declined" ? "#E24B4A" : "var(--gold)"}`,
              }}
            >
              <div className="flex items-start gap-[10px] mb-[10px]">
                <Avatar initials={a.initials} color={a.color} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-white">{a.client}</div>
                  <div className="text-[12px] mt-[1px]" style={{ color: "var(--muted)" }}>
                    Requested by: {a.requestedBy}
                  </div>
                </div>
                {!decision ? (
                  <span
                    className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[11px] font-semibold"
                    style={{ background: "rgba(245,166,35,.1)", color: "#C47F00" }}
                  >
                    ⏳ Pending your approval
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[11px] font-semibold"
                    style={{
                      background: decision === "approved" ? "rgba(0,196,140,.12)" : "rgba(226,75,74,.12)",
                      color: decision === "approved" ? "var(--green2)" : "#E24B4A",
                    }}
                  >
                    {decision === "approved" ? "✓ Approved" : "✗ Declined"}
                  </span>
                )}
              </div>

              <div className="rounded-[10px] px-[14px] py-3 mb-[10px]" style={{ background: "var(--bg)" }}>
                <div className="grid grid-cols-3 gap-[10px]">
                  <div>
                    <div className="text-[10px]" style={{ color: "var(--muted)" }}>Action</div>
                    <div className="text-[13px] font-semibold text-white">{a.action}</div>
                  </div>
                  <div>
                    <div className="text-[10px]" style={{ color: "var(--muted)" }}>Amount</div>
                    <div style={{ fontFamily: "var(--font-dm-serif)", fontSize: 18, color: "var(--text)" }}>{a.amount}</div>
                  </div>
                  <div>
                    <div className="text-[10px]" style={{ color: "var(--muted)" }}>From</div>
                    <div className="text-[13px] font-semibold text-white">{a.from}</div>
                  </div>
                </div>
              </div>

              <div
                className="text-[12px] italic leading-relaxed mb-[10px] px-3 py-2"
                style={{
                  background: "var(--bg)",
                  borderLeft: "3px solid var(--green)",
                  borderRadius: "0 8px 8px 0",
                  color: "var(--muted)",
                }}
              >
                {a.reasoning}
              </div>

              {decision ? (
                <div
                  className="text-[12px] font-semibold"
                  style={{ color: decision === "approved" ? "var(--green2)" : "#E24B4A" }}
                >
                  {decision === "approved"
                    ? "✓ Approved and executed into client ledger."
                    : "Declined. Client and buddy have been notified."}
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  <button
                    disabled={isProcessing}
                    onClick={() => handleDecision(actionKey, "approve")}
                    className="px-4 py-[7px] rounded-[8px] text-[12px] font-semibold text-white border-none cursor-pointer hover:bg-emerald-600 transition-all shadow"
                    style={{ background: "var(--green)" }}
                  >
                    {isProcessing ? "Processing..." : "✓ Approve & Execute"}
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => handleDecision(actionKey, "decline")}
                    className="px-4 py-[7px] rounded-[8px] text-[12px] font-semibold border cursor-pointer hover:bg-rose-500/10 transition-all text-rose-400"
                    style={{ borderColor: "rgba(226,75,74,.3)", background: "transparent" }}
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => {
                      window.open(`/chat`, "_blank");
                    }}
                    className="px-4 py-[7px] rounded-[8px] text-[12px] font-semibold border cursor-pointer hover:bg-amber-500/10 transition-all"
                    style={{ background: "rgba(245,166,35,.08)", color: "#C47F00", borderColor: "rgba(245,166,35,.4)" }}
                  >
                    💬 View Client Context
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
