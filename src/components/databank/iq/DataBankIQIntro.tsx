"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DataBankIQScoreRing } from "./DataBankIQScoreRing";
import { IQ_LEVELS, IQLevelInfo } from "@/lib/databank-iq";
import { DataBankIQSessionData } from "@/lib/databank-iq-generator";

interface DataBankIQIntroProps {
  session: DataBankIQSessionData;
  onStart: () => void;
  onDismiss: () => void;
}

export function DataBankIQIntro({ session, onStart, onDismiss }: DataBankIQIntroProps) {
  const [showUnlocks, setShowUnlocks] = useState(false);
  const currentLevel = session.currentLevel;

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto px-4 py-6 text-center">
      {/* Header Pill */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold mb-6"
        style={{
          background: "rgba(0, 196, 140, 0.12)",
          color: "#00C48C",
          border: "1px solid rgba(0, 196, 140, 0.3)",
        }}
      >
        <span>⚡ DataBank IQ</span>
        <span>·</span>
        <span>Post-Sync Financial Clarity</span>
      </motion.div>

      {/* Score Ring */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <DataBankIQScoreRing score={session.currentScore} level={currentLevel} size={190} />
      </motion.div>

      {/* Opening Narrative Hook Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full text-left p-5 rounded-[18px] mb-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="text-[26px] mt-0.5">🧠</div>
          <div className="flex-1">
            <h3 className="text-[15px] font-bold text-white mb-1.5">
              AI Audit Narrative
            </h3>
            <p className="text-[13px] leading-relaxed text-gray-300">
              {session.openingNarrative}
            </p>
            <div className="mt-3 flex items-center gap-4 text-[12px] font-medium text-gray-400">
              <span className="flex items-center gap-1">
                ⏱️ Takes ~{session.estimatedMinutes} minutes
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                🎯 {session.questions.length} fast questions
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#00C48C]">
                💾 Auto-saves progress
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Unlock Levels Accordion */}
      <div className="w-full mb-8">
        <button
          onClick={() => setShowUnlocks(!showUnlocks)}
          className="text-[12px] font-semibold text-gray-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
        >
          <span>{showUnlocks ? "Hide Score Tiers" : "What Higher Scores Unlock"}</span>
          <span>{showUnlocks ? "▲" : "▼"}</span>
        </button>

        <AnimatePresence>
          {showUnlocks && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left"
            >
              {Object.values(IQ_LEVELS).map((lvl) => {
                const isCurrent = lvl.name === currentLevel.name;
                return (
                  <div
                    key={lvl.name}
                    className="p-3 rounded-[12px] border text-left transition-all"
                    style={{
                      background: isCurrent ? lvl.bgRgba : "rgba(255, 255, 255, 0.02)",
                      borderColor: isCurrent ? lvl.color : "rgba(255, 255, 255, 0.07)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-bold text-white">{lvl.badge}</span>
                      <span className="text-[10px] font-mono font-bold text-gray-400">
                        {lvl.min}–{lvl.max}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-snug">{lvl.description}</p>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <button
          onClick={onStart}
          className="w-full sm:w-auto px-8 py-3.5 rounded-[12px] text-[14px] font-bold cursor-pointer transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, #00C48C 0%, #00996D 100%)",
            color: "#0B0E17",
            boxShadow: "0 8px 24px rgba(0, 196, 140, 0.35)",
          }}
        >
          <span>Start Cleaning</span>
          <span>→</span>
        </button>

        <button
          onClick={onDismiss}
          className="w-full sm:w-auto px-6 py-3.5 rounded-[12px] text-[13px] font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
          style={{ background: "transparent" }}
        >
          I&apos;ll do this later
        </button>
      </div>
    </div>
  );
}
