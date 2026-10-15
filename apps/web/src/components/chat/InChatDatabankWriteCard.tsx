"use client";

import { useState } from "react";
import Link from "next/link";
import type { DatabankWriteCardData, DatabankWriteEntry } from "@/store/chatStore";

type Props = {
  data: DatabankWriteCardData;
  done: boolean;
  onDismiss: () => void;
};

const ENTRY_ICON: Record<string, string> = {
  expense: "💸",
  income: "💰",
  subscription: "🔄",
  asset: "🏦",
  debt: "📋",
};

const ENTRY_COLOR: Record<string, string> = {
  expense: "#ef4444",
  income: "#22c55e",
  subscription: "#f59e0b",
  asset: "#3b82f6",
  debt: "#a855f7",
};

function formatAmount(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;
}

export function InChatDatabankWriteCard({ data, done, onDismiss }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const entries = data.entries ?? [];
  const goal = data.goal;
  const totalEntries = entries.length;
  const hasGoal = !!goal;

  if (done) {
    return (
      <div
        className="flex items-start gap-[12px] px-[14px] py-[12px] rounded-[12px] border mt-[10px]"
        style={{ background: "rgba(0,196,140,.07)", borderColor: "rgba(0,196,140,.25)" }}
      >
        <span className="text-[22px] mt-[2px]">✅</span>
        <div>
          <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
            DataBank Updated!
          </div>
          <div className="text-[12px] mt-[2px]" style={{ color: "var(--muted)" }}>
            {totalEntries > 0 && (
              <span>{totalEntries} {totalEntries === 1 ? "entry" : "entries"} logged. </span>
            )}
            {hasGoal && <span>Goal &ldquo;{goal!.title}&rdquo; created. </span>}
          </div>
          <div className="flex gap-[10px] mt-[6px] flex-wrap">
            {totalEntries > 0 && (
              <Link
                href="/databank"
                className="text-[11px] font-medium"
                style={{ color: "var(--green)" }}
              >
                View DataBank →
              </Link>
            )}
            {hasGoal && (
              <Link
                href="/goals"
                className="text-[11px] font-medium"
                style={{ color: "var(--green)" }}
              >
                View Goals →
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[14px] border mt-[10px] overflow-hidden"
      style={{
        background: "var(--card)",
        borderColor: "rgba(139,92,246,.3)",
        borderLeft: "3px solid #8b5cf6",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-[14px] py-[10px]"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-[8px]">
          <span className="text-[18px]">🗃️</span>
          <div>
            <div className="text-[13px] font-bold" style={{ color: "var(--text)" }}>
              Add to DataBank
            </div>
            <div className="text-[11px]" style={{ color: "var(--muted)" }}>
              AI extracted the following — already saved to your DataBank
            </div>
          </div>
        </div>
        <button
          onClick={() => { setDismissed(true); onDismiss(); }}
          className="text-[18px] leading-none cursor-pointer border-none bg-transparent"
          style={{ color: "var(--muted)" }}
          title="Dismiss"
        >
          ×
        </button>
      </div>

      {/* Entries list */}
      {entries.length > 0 && (
        <div className="px-[14px] py-[10px]">
          <div className="text-[11px] font-semibold mb-[6px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            {entries.length} {entries.length === 1 ? "Entry" : "Entries"} Logged
          </div>
          <div className="flex flex-col gap-[6px]">
            {entries.map((entry: DatabankWriteEntry, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between px-[10px] py-[7px] rounded-[8px]"
                style={{ background: "var(--bg)" }}
              >
                <div className="flex items-center gap-[8px]">
                  <span className="text-[16px]">{ENTRY_ICON[entry.entry_type] ?? "📝"}</span>
                  <div>
                    <div className="text-[12px] font-medium" style={{ color: "var(--text)" }}>
                      {entry.description}
                    </div>
                    <div className="text-[10px] capitalize" style={{ color: "var(--muted)" }}>
                      {entry.entry_type}{entry.category ? ` · ${entry.category}` : ""}{entry.date ? ` · ${entry.date}` : ""}
                    </div>
                  </div>
                </div>
                <span
                  className="text-[13px] font-bold"
                  style={{ color: ENTRY_COLOR[entry.entry_type] ?? "var(--text)" }}
                >
                  {entry.entry_type === "income" ? "+" : "-"}{formatAmount(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goal section */}
      {hasGoal && (
        <div
          className="px-[14px] py-[10px]"
          style={{ borderTop: entries.length > 0 ? "1px solid var(--border)" : undefined }}
        >
          <div className="text-[11px] font-semibold mb-[6px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Goal Created
          </div>
          <div
            className="flex items-center justify-between px-[10px] py-[7px] rounded-[8px]"
            style={{ background: "var(--bg)" }}
          >
            <div className="flex items-center gap-[8px]">
              <span className="text-[16px]">🎯</span>
              <div>
                <div className="text-[12px] font-medium" style={{ color: "var(--text)" }}>
                  {goal!.title}
                </div>
                {goal!.target_date && (
                  <div className="text-[10px]" style={{ color: "var(--muted)" }}>
                    Target: {goal!.target_date}
                  </div>
                )}
              </div>
            </div>
            <span className="text-[13px] font-bold" style={{ color: "var(--green)" }}>
              {formatAmount(goal!.target_amount)}
            </span>
          </div>
        </div>
      )}

      {/* Footer links */}
      <div
        className="flex gap-[12px] px-[14px] py-[9px]"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {entries.length > 0 && (
          <Link
            href="/databank"
            className="text-[11px] font-semibold"
            style={{ color: "#8b5cf6" }}
          >
            Open DataBank →
          </Link>
        )}
        {hasGoal && (
          <Link
            href="/goals"
            className="text-[11px] font-semibold"
            style={{ color: "var(--green)" }}
          >
            Open Goals →
          </Link>
        )}
        <span className="text-[10px] ml-auto" style={{ color: "var(--muted)" }}>
          Saved automatically ✓
        </span>
      </div>
    </div>
  );
}
