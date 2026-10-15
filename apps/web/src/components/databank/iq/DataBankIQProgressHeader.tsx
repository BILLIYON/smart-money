"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IQLevelInfo } from "@/lib/databank-iq";

interface DataBankIQProgressHeaderProps {
  score: number;
  level: IQLevelInfo;
  scoreDelta?: number | null;
  currentIndex: number;
  totalQuestions: number;
  resolvedCount: number;
  remainingCount: number;
  onExit: () => void;
}

export function DataBankIQProgressHeader({
  score,
  level,
  scoreDelta,
  currentIndex,
  totalQuestions,
  resolvedCount,
  remainingCount,
  onExit,
}: DataBankIQProgressHeaderProps) {
  const progressPercent = totalQuestions > 0 ? Math.min(100, Math.round((currentIndex / totalQuestions) * 100)) : 0;

  return (
    <div className="w-full flex flex-col gap-3 pb-4 mb-5 border-b border-white/10 select-none">
      {/* Top Row: Meta stats & Exit */}
      <div className="flex items-center justify-between">
        {/* Left: Resolution counters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-white/5 border border-white/10 text-[12px] font-bold text-white">
            <span className="text-[#00C48C]">✓ {resolvedCount}</span>
            <span className="text-gray-400 font-normal">resolved</span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-300">{remainingCount}</span>
            <span className="text-gray-400 font-normal">remaining</span>
          </div>

          <span className="hidden sm:inline text-[11px] text-gray-500 font-medium">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
        </div>

        {/* Right: Score Pill & Exit */}
        <div className="flex items-center gap-3">
          {/* Live Score Pill */}
          <div className="relative flex items-center gap-2 px-3 py-1 rounded-[10px] bg-black/40 border border-white/15">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              DataBank IQ:
            </div>
            <motion.div
              key={score}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-[14px] font-black"
              style={{ color: level.color }}
            >
              {score}
            </motion.div>
            <span
              className="text-[10px] font-bold px-1.5 py-0.2 rounded"
              style={{ background: level.bgRgba, color: level.color }}
            >
              {level.name}
            </span>

            {/* Floating Delta Animation (+3 IQ) */}
            <AnimatePresence>
              {scoreDelta && scoreDelta > 0 && (
                <motion.span
                  key={`delta-${score}-${Date.now()}`}
                  initial={{ opacity: 1, y: 0, scale: 0.8 }}
                  animate={{ opacity: 0, y: -24, scale: 1.2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute -top-3 right-0 text-[12px] font-extrabold text-[#00C48C] pointer-events-none drop-shadow"
                >
                  +{scoreDelta} IQ 🚀
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Exit Button */}
          <button
            onClick={onExit}
            className="px-3 py-1 rounded-[8px] text-[12px] font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-colors border border-white/10 cursor-pointer"
            title="Saves all your progress immediately"
          >
            Save & Exit
          </button>
        </div>
      </div>

      {/* Bottom Row: Smooth Progress Bar */}
      <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #3B82F6 0%, #00C48C 100%)" }}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  );
}
