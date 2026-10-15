"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DataBankIQMilestoneModalProps {
  insight: {
    title: string;
    body: string;
    avatar: string;
  } | null;
  onContinue: () => void;
}

export function DataBankIQMilestoneModal({
  insight,
  onContinue,
}: DataBankIQMilestoneModalProps) {
  if (!insight) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="w-full max-w-md rounded-[24px] p-6 text-center relative overflow-hidden border border-white/15"
          style={{
            background: "linear-gradient(135deg, #131B2E 0%, #0F172A 100%)",
            boxShadow: "0 25px 60px -15px rgba(0, 196, 140, 0.3)",
          }}
        >
          {/* Confetti or spark particle glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 bg-[#00C48C]/20 blur-2xl rounded-full pointer-events-none" />

          {/* Avatar Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
            className="w-16 h-16 mx-auto rounded-2xl bg-[#00C48C]/15 border border-[#00C48C]/30 flex items-center justify-center text-[32px] mb-4 shadow-inner"
          >
            {insight.avatar}
          </motion.div>

          {/* Pill Badge */}
          <div className="inline-block px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-[#00C48C] bg-[#00C48C]/10 mb-3 border border-[#00C48C]/20">
            Audit Milestone Reached
          </div>

          {/* Title */}
          <h3 className="text-[18px] font-bold text-white mb-2 leading-tight">
            {insight.title}
          </h3>

          {/* Insight Body */}
          <p className="text-[13px] text-gray-300 leading-relaxed mb-6">
            {insight.body}
          </p>

          {/* CTA */}
          <button
            onClick={onContinue}
            className="w-full py-3.5 rounded-[12px] text-[14px] font-bold text-[#0B0E17] bg-[#00C48C] hover:bg-[#00B07D] transition-all transform active:scale-98 cursor-pointer shadow-lg shadow-[#00C48C]/25"
          >
            Keep Going 🚀
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
