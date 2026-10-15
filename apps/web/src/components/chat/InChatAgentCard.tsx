"use client";

import type { AgentCardData } from "@/store/chatStore";

type Props = {
  data: AgentCardData;
  onExecute: () => void;
  onDecline: () => void;
  onDiscuss: (text: string) => void;
  done: boolean;
  refNumber?: string;
};

export function InChatAgentCard({ data, onExecute, onDecline, onDiscuss, done, refNumber }: Props) {
  if (done && refNumber) {
    return (
      <div
        className="rounded-[10px] border mt-[10px] px-[14px] py-3"
        style={{ background: "rgba(0,196,140,.06)", borderColor: "rgba(0,196,140,.2)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[16px]">✅</span>
          <span className="text-[12px] font-semibold" style={{ color: "var(--green)" }}>
            Executed Successfully
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px]">
            <span style={{ color: "var(--muted)" }}>Action</span>
            <span className="font-semibold" style={{ color: "var(--text)" }}>{data.action}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span style={{ color: "var(--muted)" }}>Amount</span>
            <span className="font-semibold" style={{ color: "var(--text)" }}>{data.amount}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span style={{ color: "var(--muted)" }}>Reference</span>
            <span className="font-mono font-semibold" style={{ color: "var(--text)" }}>{refNumber}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span style={{ color: "var(--muted)" }}>Benefit</span>
            <span className="font-semibold" style={{ color: data.benefitColor ?? "var(--green2)" }}>{data.benefit}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[14px] border mt-[10px] relative overflow-hidden"
      style={{
        background: "var(--card)",
        borderColor: "rgba(245,166,35,.35)",
        borderLeft: "3px solid var(--gold)",
      }}
    >
      <div className="px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-[10px]">
          <span className="text-[18px]">⚡</span>
          <span className="text-[13px] font-semibold flex-1" style={{ color: "var(--text)" }}>
            Execute: {data.title}
          </span>
          <span
            className="px-2 py-[2px] rounded-full text-[9px] font-bold uppercase tracking-[.5px] border"
            style={{ background: "rgba(245,166,35,.12)", borderColor: "rgba(245,166,35,.3)", color: "#C47F00" }}
          >
            Agent Action
          </span>
        </div>

        {/* Details */}
        <div
          className="rounded-[10px] px-3 py-[10px] mb-3 flex flex-col gap-[5px]"
          style={{ background: "var(--bg)" }}
        >
          {[
            { label: "Action",           value: data.action },
            { label: "Amount",           value: data.amount },
            { label: "From",             value: data.from },
            { label: "Transaction fee",  value: data.fee },
            { label: "Expected benefit", value: data.benefit, color: data.benefitColor },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-[12px]">
              <span style={{ color: "var(--muted)" }}>{row.label}</span>
              <span className="font-semibold" style={{ color: row.color ?? "var(--text)" }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Warning */}
        <div className="flex items-start gap-[6px] text-[11px] leading-[1.5] mb-3" style={{ color: "var(--muted)" }}>
          <span className="flex-shrink-0">🔒</span>
          <span>
            This will be executed from your connected GTBank account. You can adjust the amount before confirming.
            This action is logged in your Agentic Actions history.
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onExecute}
            className="px-[18px] py-[9px] rounded-[8px] text-[12px] font-bold border-none cursor-pointer transition-all duration-200"
            style={{ background: "var(--gold)", color: "var(--navy)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
          >
            ⚡ Confirm & Execute
          </button>
          <button
            onClick={onDecline}
            className="px-3 py-[9px] rounded-[8px] text-[12px] border cursor-pointer transition-colors duration-200"
            style={{ color: "var(--muted)", borderColor: "var(--border)", background: "transparent" }}
          >
            Decline
          </button>
          <button
            onClick={() => onDiscuss("Tell me more about this before I execute")}
            className="px-3 py-[9px] rounded-[8px] text-[12px] border cursor-pointer transition-colors duration-200"
            style={{ color: "var(--green)", borderColor: "rgba(0,196,140,.3)", background: "transparent" }}
          >
            Discuss first
          </button>
        </div>
      </div>
    </div>
  );
}
