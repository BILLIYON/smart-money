"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { DataBankIQScoreRing } from "./DataBankIQScoreRing";
import { IQLevelInfo } from "@/lib/databank-iq";
import Link from "next/link";

interface DataBankIQSummaryProps {
  score: number;
  level: IQLevelInfo;
  resolvedCount: number;
  totalAnswered: number;
  onViewTransactions: () => void;
}

export function DataBankIQSummary({
  score,
  level,
  resolvedCount,
  totalAnswered,
  onViewTransactions,
}: DataBankIQSummaryProps) {
  useEffect(() => {
    // Trigger celebratory confetti burst
    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#00C48C", "#3B82F6", "#F59E0B", "#8B5CF6", "#FFFFFF"],
      });
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="flex flex-col items-center max-w-xl mx-auto px-4 py-6 text-center select-none">
      {/* Victory Pill */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold mb-6"
        style={{
          background: "rgba(0, 196, 140, 0.15)",
          color: "#00C48C",
          border: "1px solid rgba(0, 196, 140, 0.3)",
        }}
      >
        <span>🎉 DataBank Clean Complete</span>
      </motion.div>

      {/* Score Ring with Glow */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
        className="mb-6"
      >
        <DataBankIQScoreRing score={score} level={level} size={190} />
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-3 w-full mb-6"
      >
        <div className="p-4 rounded-[16px] bg-white/5 border border-white/10 text-left">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Transactions Resolved
          </div>
          <div className="text-[26px] font-black text-white leading-none">
            {resolvedCount}
          </div>
          <div className="text-[11px] text-[#00C48C] font-semibold mt-1">
            ✓ Classified & Locked
          </div>
        </div>

        <div className="p-4 rounded-[16px] bg-white/5 border border-white/10 text-left">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Questions Answered
          </div>
          <div className="text-[26px] font-black text-white leading-none">
            {totalAnswered}
          </div>
          <div className="text-[11px] text-[#3B82F6] font-semibold mt-1">
            ⚡ Merchant Memory Saved
          </div>
        </div>
      </motion.div>

      {/* AI Buddy Forward-Looking Advice Box */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full text-left p-5 rounded-[18px] mb-8 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(0, 196, 140, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)",
          border: "1px solid rgba(0, 196, 140, 0.25)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="text-[28px] mt-0.5">🤖</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[13px] font-bold text-white">AI Financial Buddy</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#00C48C]/20 text-[#00C48C]">
                Ready to Advise
              </span>
            </div>
            <p className="text-[13px] text-gray-300 leading-relaxed">
              &quot;Now that I have clear visibility into your actual merchants and savings goals, I can generate hyper-personalized financial plans. Want to explore your optimized monthly savings buffer?&quot;
            </p>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
        <Link
          href="/chat"
          className="flex-1 w-full py-3.5 rounded-[12px] text-[14px] font-bold text-[#0B0E17] bg-[#00C48C] hover:bg-[#00B07D] transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#00C48C]/25"
        >
          <span>Chat with Buddy</span>
          <span>→</span>
        </Link>

        <button
          onClick={onViewTransactions}
          className="flex-1 w-full py-3.5 rounded-[12px] text-[13px] font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10 cursor-pointer"
        >
          See Full Transactions List
        </button>
      </div>
    </div>
  );
}
