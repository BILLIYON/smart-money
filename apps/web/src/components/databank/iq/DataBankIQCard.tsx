"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { IQQuestion, IQQuestionOption } from "@/lib/databank-iq-types";

interface DataBankIQCardProps {
  question: IQQuestion;
  onAnswer: (payload: {
    category?: string;
    intent?: string;
    isSplit?: boolean;
    splitAllocations?: any[];
  }) => void;
  loading: boolean;
}

const COMMON_CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Groceries",
  "Housing",
  "Utilities",
  "Subscriptions",
  "Family & Gifts",
  "Shopping",
  "Health & Medical",
  "Debt Repayment",
  "Savings & Investments",
  "Business & Office",
];

export function DataBankIQCard({ question, onAnswer, loading }: DataBankIQCardProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitPersonalPct, setSplitPersonalPct] = useState(50);

  const getTierTheme = () => {
    switch (question.tier) {
      case "tier1_merchant":
        return {
          badgeBg: "rgba(139, 92, 246, 0.15)",
          badgeColor: "#A78BFA",
          badgeBorder: "rgba(139, 92, 246, 0.3)",
          accentGlow: "rgba(139, 92, 246, 0.2)",
          icon: "🧠",
        };
      case "tier2_ambiguous":
        return {
          badgeBg: "rgba(245, 158, 11, 0.15)",
          badgeColor: "#FBBF24",
          badgeBorder: "rgba(245, 158, 11, 0.3)",
          accentGlow: "rgba(245, 158, 11, 0.2)",
          icon: "🔍",
        };
      case "tier3_intent":
        return {
          badgeBg: "rgba(0, 196, 140, 0.15)",
          badgeColor: "#00C48C",
          badgeBorder: "rgba(0, 196, 140, 0.3)",
          accentGlow: "rgba(0, 196, 140, 0.2)",
          icon: "🎯",
        };
    }
  };

  const theme = getTierTheme();

  const handleSelectOption = (opt: IQQuestionOption) => {
    if (opt.isCustom) {
      setShowCustomInput(true);
      return;
    }
    if (opt.isSplit) {
      setShowSplitModal(true);
      return;
    }

    onAnswer({
      category: opt.category,
      intent: opt.intent,
    });
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCategory.trim()) return;
    onAnswer({
      category: customCategory.trim(),
    });
  };

  const handleSplitSubmit = () => {
    onAnswer({
      category: question.suggestedCategory || "Split",
      isSplit: true,
      splitAllocations: [
        { category: "Personal", percentage: splitPersonalPct },
        { category: "Business", percentage: 100 - splitPersonalPct },
      ],
    });
  };

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: 25 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -25 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-xl mx-auto rounded-[22px] p-6 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: `0 20px 40px -15px ${theme.accentGlow}`,
      }}
    >
      {/* Tier Badge */}
      <div className="flex items-center justify-between mb-4">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
          style={{
            background: theme.badgeBg,
            color: theme.badgeColor,
            border: `1px solid ${theme.badgeBorder}`,
          }}
        >
          <span>{theme.icon}</span>
          <span>{question.badge}</span>
        </span>

        {question.transactionCount > 1 && (
          <span className="text-[11px] font-bold text-gray-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
            Resolves {question.transactionCount} entries
          </span>
        )}
      </div>

      {/* Question Title */}
      <h2 className="text-[18px] sm:text-[20px] font-bold text-white leading-snug mb-2">
        {question.title}
      </h2>

      {/* Subtitle / Insight */}
      <p className="text-[12px] text-gray-400 leading-relaxed mb-6">
        {question.subtitle}
      </p>

      {/* Options Stack */}
      {!showCustomInput && !showSplitModal ? (
        <div className="flex flex-col gap-2.5">
          {question.options.map((opt, idx) => (
            <motion.button
              key={opt.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleSelectOption(opt)}
              disabled={loading}
              className="flex items-center justify-between p-3.5 rounded-[14px] text-left transition-all border cursor-pointer disabled:opacity-50"
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                borderColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <span className="text-[14px] font-semibold text-white">
                {opt.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-gray-500 font-bold px-1.5 py-0.5 rounded bg-white/5">
                  {idx + 1}
                </span>
                <span className="text-gray-400">→</span>
              </div>
            </motion.button>
          ))}
        </div>
      ) : showCustomInput ? (
        /* Custom Free-Text Input Fallback */
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCustomSubmit}
          className="flex flex-col gap-3"
        >
          <div className="text-[12px] font-bold text-gray-300">
            Choose or type a category:
          </div>

          <div className="flex flex-wrap gap-1.5 mb-1 max-h-28 overflow-y-auto pr-1">
            {COMMON_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCustomCategory(cat)}
                className="px-2.5 py-1 rounded-[8px] text-[11px] font-medium border cursor-pointer transition-colors"
                style={{
                  background: customCategory === cat ? "rgba(0,196,140,0.2)" : "rgba(255,255,255,0.04)",
                  borderColor: customCategory === cat ? "#00C48C" : "rgba(255,255,255,0.1)",
                  color: customCategory === cat ? "#00C48C" : "#94A3B8",
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="e.g. Travel, Gym, Education..."
              className="flex-1 px-3.5 py-2.5 rounded-[10px] text-[13px] bg-black/40 text-white border border-white/15 outline-none focus:border-[#00C48C]"
              autoFocus
            />
            <button
              type="submit"
              disabled={!customCategory.trim() || loading}
              className="px-5 py-2.5 rounded-[10px] text-[13px] font-bold text-[#0B0E17] bg-[#00C48C] border-none cursor-pointer disabled:opacity-50 hover:opacity-90"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowCustomInput(false)}
            className="text-[11px] text-gray-400 hover:text-white text-center cursor-pointer mt-1"
          >
            ← Back to options
          </button>
        </motion.form>
      ) : (
        /* Split Allocation Modal */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 p-4 rounded-[14px] bg-white/5 border border-white/10"
        >
          <div className="text-[13px] font-bold text-white">
            Split Transaction Allocation
          </div>
          <div className="text-[12px] text-gray-300">
            How much of this was personal vs business?
          </div>

          <div className="flex items-center justify-between text-[12px] font-bold text-white">
            <span className="text-[#00C48C]">Personal: {splitPersonalPct}%</span>
            <span className="text-[#3B82F6]">Business: {100 - splitPersonalPct}%</span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={splitPersonalPct}
            onChange={(e) => setSplitPersonalPct(Number(e.target.value))}
            className="w-full accent-[#00C48C] cursor-pointer"
          />

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleSplitSubmit}
              disabled={loading}
              className="flex-1 py-2 rounded-[10px] text-[12px] font-bold bg-[#00C48C] text-[#0B0E17] cursor-pointer"
            >
              Confirm Split
            </button>
            <button
              type="button"
              onClick={() => setShowSplitModal(false)}
              className="px-4 py-2 rounded-[10px] text-[12px] font-semibold text-gray-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
