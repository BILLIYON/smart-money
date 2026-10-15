"use client";

import { motion } from "framer-motion";
import { isImageAvatar } from "@/lib/utils";

type DataChip = { label: string; highlight?: string };

type Props = {
  sourceLabel: string;
  buddyAv: string;
  buddyBg: string;
  buddyIsSerif?: boolean;
  buddyName: string;
  pastContextQuote: string;
  signalText: string;
  dataChips: DataChip[];
  manageHref?: string;
  onYes: () => void;
  onMore: () => void;
  onDismiss: () => void;
};

export function SignalAlertCard({
  sourceLabel,
  buddyAv,
  buddyBg,
  buddyIsSerif,
  buddyName,
  pastContextQuote,
  signalText,
  dataChips,
  manageHref,
  onYes,
  onMore,
  onDismiss,
}: Props) {
  return (
    <motion.div
      className="flex gap-3"
      style={{ maxWidth: "92%", alignSelf: "stretch" }}
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
    >
      {/* Buddy avatar */}
      <div
        className="flex items-center justify-center flex-shrink-0 rounded-[10px] text-[16px] overflow-hidden"
        style={{
          width: 34, height: 34,
          background: buddyBg,
          ...(buddyIsSerif
            ? { fontFamily: "var(--font-dm-serif)", fontSize: "12px", color: "rgba(255,255,255,.9)" }
            : {}),
        }}
      >
        {isImageAvatar(buddyAv) ? (
          <img src={buddyAv} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          buddyAv
        )}
      </div>

      {/* Card */}
      <div
        className="flex-1 rounded-[14px] border px-4 py-4 relative overflow-hidden"
        style={{
          background: "var(--card)",
          borderColor: "rgba(74,144,217,.35)",
          borderLeft: "3px solid #4A90D9",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-[10px]">
          <span
            className="inline-flex items-center gap-1 px-[10px] py-[3px] rounded-full text-[10px] font-semibold border"
            style={{ background: "rgba(74,144,217,.1)", borderColor: "rgba(74,144,217,.25)", color: "#4A90D9" }}
          >
            {sourceLabel}
          </span>
          <span className="text-[11px] ml-auto" style={{ color: "var(--muted)" }}>
            {buddyName}
          </span>
        </div>

        {/* Past context quote */}
        <div
          className="rounded-[10px] border px-3 py-[10px] mb-[10px] text-[12px] leading-[1.6]"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--muted)" }}
        >
          {pastContextQuote}
        </div>

        {/* Signal text */}
        <p className="text-[13px] leading-[1.7] mb-[10px]" style={{ color: "var(--text)" }}>
          {signalText}
        </p>

        {/* Data chips */}
        <div className="flex gap-[10px] flex-wrap mb-3">
          {dataChips.map((chip) => (
            <div
              key={chip.label}
              className="px-3 py-[5px] rounded-[8px] border text-[11px] font-medium"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
            >
              {chip.label}
              {chip.highlight && (
                <span className="font-bold" style={{ color: "var(--green2)" }}>
                  {" "}{chip.highlight}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap mb-2">
          <button
            onClick={onYes}
            className="px-4 py-2 rounded-[9px] text-[12px] font-semibold text-white border-none cursor-pointer transition-all duration-200"
            style={{ background: "#4A90D9" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#3A7BC8"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#4A90D9"; }}
          >
            ✓ Yes, let&apos;s discuss it
          </button>
          <button
            onClick={onMore}
            className="px-4 py-2 rounded-[9px] text-[12px] font-semibold border cursor-pointer transition-all duration-200"
            style={{ background: "rgba(74,144,217,.1)", color: "#4A90D9", borderColor: "rgba(74,144,217,.25)" }}
          >
            Tell me more first
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-2 rounded-[9px] text-[12px] border cursor-pointer transition-colors duration-200"
            style={{ background: "transparent", color: "var(--muted)", borderColor: "var(--border)" }}
          >
            Not interested
          </button>
        </div>

        {/* Manage link */}
        {manageHref && (
          <a
            href={manageHref}
            className="text-[10px] block mt-2 transition-colors duration-150"
            style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)"; }}
          >
            Manage signal source in DataBank →
          </a>
        )}
      </div>
    </motion.div>
  );
}
