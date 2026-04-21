"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { create } from "zustand";

// ── Store ──────────────────────────────────────────────────
type ToastState = {
  visible: boolean;
  title: string;
  message: string;
  buddyEmoji: string;
  show: (title: string, message: string, buddyEmoji?: string) => void;
  dismiss: () => void;
};

export const useMilestoneToast = create<ToastState>((set) => ({
  visible: false,
  title: "",
  message: "",
  buddyEmoji: "🏆",
  show: (title, message, buddyEmoji = "🏆") =>
    set({ visible: true, title, message, buddyEmoji }),
  dismiss: () => set({ visible: false }),
}));

// ── Component ──────────────────────────────────────────────
export function MilestoneToast() {
  const { visible, title, message, buddyEmoji, dismiss } = useMilestoneToast();

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(dismiss, 5500);
    return () => clearTimeout(t);
  }, [visible, dismiss]);

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
      <AnimatePresence>
        {visible && (
          <motion.div
            key="milestone-toast"
            initial={{ y: -60, opacity: 0, scale: 0.88 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -60, opacity: 0, scale: 0.88 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="pointer-events-auto flex items-center gap-4 px-5 py-4 rounded-[18px]"
            style={{
              background: "var(--navy2)",
              border: "1px solid rgba(0,196,140,.3)",
              boxShadow: "0 8px 40px rgba(0,0,0,.45), 0 0 0 1px rgba(0,196,140,.1)",
            }}
          >
            {/* Icon */}
            <div
              className="flex items-center justify-center rounded-[12px] text-[22px] flex-shrink-0"
              style={{
                width: 48,
                height: 48,
                background: "rgba(0,196,140,.15)",
                border: "1px solid rgba(0,196,140,.25)",
              }}
            >
              {buddyEmoji}
            </div>

            {/* Text */}
            <div className="flex flex-col">
              <div
                className="text-[13px] font-bold"
                style={{ color: "#fff", fontFamily: "var(--font-sora)" }}
              >
                {title}
              </div>
              <div
                className="text-[12px] mt-[2px]"
                style={{ color: "rgba(255,255,255,.6)", maxWidth: 280 }}
              >
                {message}
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={dismiss}
              className="ml-2 flex-shrink-0 cursor-pointer transition-opacity duration-150 hover:opacity-60 text-[16px]"
              style={{ color: "rgba(255,255,255,.35)", background: "none", border: "none" }}
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
