"use client";

import { useState } from "react";
import Link from "next/link";
import type { GoalCardData } from "@/store/chatStore";

type Props = {
  data: GoalCardData;
  onConfirm: (data: GoalCardData) => void;
  onDismiss: () => void;
  done: boolean;
};

export function InChatGoalCard({ data, onConfirm, onDismiss, done }: Props) {
  const [name, setName] = useState(data.name);
  const [amount, setAmount] = useState(data.amount);
  const [date, setDate] = useState(data.date);

  if (done) {
    return (
      <div
        className="flex items-center gap-[10px] px-[14px] py-[10px] rounded-[10px] border mt-[10px]"
        style={{ background: "rgba(0,196,140,.08)", borderColor: "rgba(0,196,140,.2)" }}
      >
        <span className="text-[20px]">🎯</span>
        <div>
          <div className="text-[12px]" style={{ color: "var(--text)", lineHeight: 1.5 }}>
            <strong>{name}</strong> added to your Goal Tracker.
          </div>
          <Link
            href="/goals"
            className="text-[11px] font-medium block mt-[2px]"
            style={{ color: "var(--green)" }}
          >
            View in Goal Tracker →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[14px] border mt-[10px] relative overflow-hidden"
      style={{
        background: "var(--card)",
        borderColor: "rgba(0,196,140,.3)",
        borderLeft: "3px solid var(--green)",
      }}
    >
      <div className="px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[18px]">🎯</span>
          <span className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
            Create Goal from This Advice
          </span>
        </div>
        <p className="text-[11px] leading-[1.5] mb-3" style={{ color: "var(--muted)" }}>
          Pre-filled from your conversation. Adjust and confirm to add to your Goal Tracker.
        </p>

        {/* Fields grid */}
        <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {[
            { label: "Goal Name", value: name, onChange: setName, span: true },
            { label: "Target Amount", value: amount, onChange: setAmount },
            { label: "Target Date", value: date, onChange: setDate },
            { label: "Buddy", value: data.buddyName, onChange: () => {}, readOnly: true },
          ].map((f) => (
            <div
              key={f.label}
              className="flex flex-col gap-1"
              style={f.span ? { gridColumn: "1 / -1" } : {}}
            >
              <label className="text-[10px] font-semibold uppercase tracking-[.3px]" style={{ color: "var(--muted)" }}>
                {f.label}
              </label>
              <input
                value={f.value}
                onChange={(e) => f.onChange(e.target.value)}
                readOnly={f.readOnly}
                className="rounded-[8px] px-[10px] py-2 text-[12px] outline-none border transition-colors duration-200"
                style={{
                  background: "var(--input-bg)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                  opacity: f.readOnly ? 0.7 : 1,
                  fontFamily: "var(--font-sora)",
                }}
                onFocus={(e) => { if (!f.readOnly) (e.target as HTMLInputElement).style.borderColor = "var(--green)"; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
              />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm({ name, amount, date, buddyName: data.buddyName })}
            className="px-4 py-2 rounded-[8px] text-[12px] font-semibold text-white border-none cursor-pointer transition-colors duration-200"
            style={{ background: "var(--green)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green)"; }}
          >
            ✓ Add to Goals
          </button>
          <button
            onClick={onDismiss}
            className="px-3 py-2 rounded-[8px] text-[12px] border cursor-pointer transition-colors duration-200"
            style={{ color: "var(--muted)", borderColor: "var(--border)", background: "transparent" }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
