"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { create } from "zustand";

// ── Store ──────────────────────────────────────────────────
type SalaryMomentState = {
  visible: boolean;
  amountKobo: number;
  accountName: string;
  show: (amountKobo: number, accountName: string) => void;
  dismiss: () => void;
};

export const useSalaryMoment = create<SalaryMomentState>((set) => ({
  visible: false,
  amountKobo: 0,
  accountName: "",
  show: (amountKobo, accountName) => set({ visible: true, amountKobo, accountName }),
  dismiss: () => set({ visible: false, amountKobo: 0, accountName: "" }),
}));

// ── Types ──────────────────────────────────────────────────
type AllocationItem = {
  label: string;
  icon: string;
  pct: number;
  amountFormatted: string;
  color: string;
  reason: string;
};

type AllocationPlan = {
  totalFormatted: string;
  allocations: AllocationItem[];
  buddyTake: string;
  buddyName: string;
};

// ── Helpers ────────────────────────────────────────────────
function formatNaira(kobo: number): string {
  return `₦${Math.floor(kobo / 100).toLocaleString("en-NG")}`;
}

// ── Component ──────────────────────────────────────────────
export function SalaryMomentOverlay() {
  const { visible, amountKobo, accountName, dismiss } = useSalaryMoment();
  const router = useRouter();

  const [plan, setPlan] = useState<AllocationPlan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || amountKobo <= 0) return;

    setLoading(true);
    setPlan(null);

    fetch(`/api/analytics/allocation?amount=${amountKobo}`)
      .then((r) => r.json())
      .then((data: AllocationPlan) => setPlan(data))
      .catch(() => {/* non-blocking — overlay still shows without plan */})
      .finally(() => setLoading(false));
  }, [visible, amountKobo]);

  function handleOpenChat() {
    dismiss();
    router.push("/chat");
  }

  return (
    <AnimatePresence>
      {visible && (
        /* ── Backdrop ────────────────────────────────────── */
        <motion.div
          key="salary-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ background: "rgba(11,30,61,.88)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
        >
          {/* ── Card ─────────────────────────────────────── */}
          <motion.div
            key="salary-card"
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.93 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="w-full max-w-[480px] rounded-[22px] overflow-hidden"
            style={{
              background: "var(--navy2)",
              border: "1px solid rgba(255,255,255,.08)",
              boxShadow: "0 24px 80px rgba(0,0,0,.6)",
            }}
          >
            {/* ── Banner ───────────────────────────────── */}
            <div
              className="px-7 pt-7 pb-6"
              style={{ background: "linear-gradient(135deg,#0B1E3D,#132952)" }}
            >
              {/* Source chip */}
              <div className="flex items-center gap-2 mb-5">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-full text-[11px] font-semibold"
                  style={{
                    background: "rgba(0,196,140,.15)",
                    border: "1px solid rgba(0,196,140,.3)",
                    color: "var(--green)",
                  }}
                >
                  💵 Salary Detected
                </span>
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,.4)" }}>
                  via Open Banking
                </span>
              </div>

              {/* Bank + amount */}
              <div
                className="text-[13px] font-semibold mb-1"
                style={{ color: "rgba(255,255,255,.55)" }}
              >
                {accountName || "Your Bank Account"}
              </div>
              <div
                className="text-[42px] font-bold leading-none mb-2"
                style={{
                  color: "var(--gold)",
                  fontFamily: "var(--font-dm-serif)",
                  letterSpacing: "-1px",
                }}
              >
                {formatNaira(amountKobo)}
              </div>
              <div className="text-[13px]" style={{ color: "rgba(255,255,255,.45)" }}>
                Just credited to your account
              </div>
            </div>

            {/* ── Allocation plan ───────────────────────── */}
            <div className="px-7 py-5">
              {/* Buddy header */}
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="flex items-center justify-center rounded-[10px] text-[16px] flex-shrink-0"
                  style={{
                    width: 36, height: 36,
                    background: "#1A3A6E",
                    border: "1px solid rgba(0,196,140,.2)",
                  }}
                >
                  🎯
                </div>
                <div>
                  <div
                    className="text-[13px] font-semibold"
                    style={{ color: "#fff", fontFamily: "var(--font-sora)" }}
                  >
                    {plan ? plan.buddyName : "Your Buddy"} has a plan
                  </div>
                  <div className="text-[11px]" style={{ color: "rgba(255,255,255,.4)" }}>
                    Auto-generated allocation · refine in chat
                  </div>
                </div>
              </div>

              {/* Allocation bars */}
              {loading && (
                <div className="flex flex-col gap-3 mb-5">
                  {[75, 55, 40, 30, 20].map((w, i) => (
                    <div key={i} className="h-[36px] rounded-[8px] animate-pulse" style={{ background: "rgba(255,255,255,.07)", width: `${w}%` }} />
                  ))}
                </div>
              )}

              {plan && (
                <div className="flex flex-col gap-[10px] mb-5">
                  {plan.allocations.map((item, i) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px]">{item.icon}</span>
                          <span className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,.8)" }}>
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[12px] font-bold"
                            style={{ color: item.color }}
                          >
                            {item.amountFormatted}
                          </span>
                          <span className="text-[10px]" style={{ color: "rgba(255,255,255,.3)" }}>
                            {item.pct}%
                          </span>
                        </div>
                      </div>

                      {/* Animated bar */}
                      <div
                        className="w-full rounded-full overflow-hidden"
                        style={{ height: 5, background: "rgba(255,255,255,.08)" }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: item.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${item.pct}%` }}
                          transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 + i * 0.07 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Buddy take */}
              {plan && (
                <div
                  className="rounded-[12px] px-4 py-3 mb-5 text-[12px] leading-[1.6] italic"
                  style={{
                    background: "rgba(0,196,140,.08)",
                    border: "1px solid rgba(0,196,140,.15)",
                    color: "rgba(255,255,255,.65)",
                  }}
                >
                  &ldquo;{plan.buddyTake}&rdquo;
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleOpenChat}
                  className="flex-1 py-[13px] rounded-[12px] text-[13px] font-semibold text-white transition-all duration-150"
                  style={{ background: "var(--green)", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green)"; }}
                >
                  Open Chat to Discuss →
                </button>
                <button
                  onClick={dismiss}
                  className="px-5 py-[13px] rounded-[12px] text-[13px] font-medium transition-all duration-150"
                  style={{
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.1)",
                    color: "rgba(255,255,255,.55)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,.1)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,.06)"; }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
