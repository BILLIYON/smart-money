"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { popup } from "@/store/popupStore";
import { useDatabankStore } from "@/store/databankStore";
import type { CleaningSuggestion } from "@/app/api/databank/clean/scan/route";

type GameTab = "auto_sweep" | "speed_swipe" | "ai_prompt" | "badges";

type UserBadge = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
};

export function DatabankCleanerWidget({ onCleanComplete }: { onCleanComplete?: () => void }) {
  const [activeTab, setActiveTab] = useState<GameTab>("auto_sweep");

  // Audit state
  const [scanning, setScanning] = useState(false);
  const [prompting, setPrompting] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const [suggestions, setSuggestions] = useState<CleaningSuggestion[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterTab, setFilterTab] = useState<"all" | "inverted_direction" | "duplicate" | "uncategorized" | "zero_amount">("all");
  const [applying, setApplying] = useState(false);
  const [successSummary, setSuccessSummary] = useState<string | null>(null);
  const [analyticsImpact, setAnalyticsImpact] = useState<{ incomeChange: number; expenseChange: number } | null>(null);

  // Gamification State
  const [xp, setXp] = useState(120);
  const [streak, setStreak] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // Compute Cleanliness Score (0 - 100%)
  const cleanScore = Math.max(
    0,
    Math.min(
      100,
      totalEntries === 0
        ? 100
        : Math.round(((totalEntries - suggestions.length) / Math.max(1, totalEntries)) * 100)
    )
  );

  // Compute Level based on XP
  const level = Math.floor(xp / 100) + 1;
  const xpInCurrentLevel = xp % 100;

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#00C48C", "#FFD700", "#FF4081", "#3B82F6"],
      });
    } catch {
      // Fallback if canvas environment doesn't support confetti
    }
  };

  const addXp = (amount: number) => {
    setXp((prev) => {
      const next = prev + amount;
      if (Math.floor(next / 100) > Math.floor(prev / 100)) {
        setShowLevelUp(true);
        triggerConfetti();
        setTimeout(() => setShowLevelUp(false), 3500);
      }
      return next;
    });
  };

  const handleScan = useCallback(async () => {
    setScanning(true);
    setSuccessSummary(null);
    setAnalyticsImpact(null);
    try {
      const res = await fetch("/api/databank/clean/scan");
      if (res.status === 401) {
        popup.error("Unauthorized", "Please log in to scan DataBank.");
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSuggestions(data.suggestions || []);
        setTotalEntries(data.totalEntries || 0);
        setHasScanned(true);
        setSelectedIds(new Set((data.suggestions || []).map((s: CleaningSuggestion) => s.id)));
        setCurrentIndex(0);

        if ((data.suggestions || []).length === 0) {
          popup.success("100% Data Hygiene! 🎯", "All your financial entries are clean and accurate.");
          triggerConfetti();
        } else {
          popup.alert(
            "Data Quality Audit Complete 🔍",
            `Found ${data.suggestions.length} issues across ${data.totalEntries} entries.`,
            "info"
          );
        }
      } else {
        popup.error("Scan Failed", data.error || "Could not scan DataBank entries.");
      }
    } catch {
      popup.error("Error", "Failed to connect to AI audit service.");
    } finally {
      setScanning(false);
    }
  }, []);

  // Initial scan on load
  useEffect(() => {
    if (!hasScanned) {
      handleScan();
    }
  }, [hasScanned, handleScan]);

  const handleSendPrompt = async (customInstruction?: string) => {
    const text = (customInstruction || userPrompt).trim();
    if (!text) return;
    setPrompting(true);
    setSuccessSummary(null);
    setAnalyticsImpact(null);
    try {
      const res = await fetch("/api/databank/clean/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      if (res.status === 401) {
        popup.error("Unauthorized", "Please log in to prompt the AI agent.");
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSuggestions(data.suggestions || []);
        setHasScanned(true);
        setSelectedIds(new Set((data.suggestions || []).map((s: CleaningSuggestion) => s.id)));
        setAnalyticsImpact(data.analyticsImpact || null);
        setCurrentIndex(0);

        if ((data.suggestions || []).length === 0) {
          popup.alert("AI Agent Response 🤖", data.message || "No matching transactions found for your prompt.", "info");
        } else {
          popup.success("AI Agent Generated Fixes ⚡", `Found ${data.suggestions.length} entries matching: "${text.slice(0, 40)}..."`);
          addXp(30);
        }
      } else {
        popup.error("Prompt Failed", data.error || "Could not process AI agent prompt.");
      }
    } catch {
      popup.error("Error", "Failed to communicate with AI agent server.");
    } finally {
      setPrompting(false);
    }
  };

  const handleApplyFixes = async (targetFixes?: CleaningSuggestion[], isAutoSweep = false) => {
    const itemsToApply = targetFixes || suggestions.filter((s) => selectedIds.has(s.id));
    if (itemsToApply.length === 0) return;

    setApplying(true);
    try {
      const fixesToApply = itemsToApply.map((s) => ({
        id: s.id,
        action: s.suggested.action,
        patch: s.suggested.action === "update" ? {
          entry_type: s.suggested.entry_type,
          amount: s.suggested.amount,
          category: s.suggested.category,
          description: s.suggested.description,
        } : undefined,
      }));

      const res = await fetch("/api/databank/clean/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixes: fixesToApply }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const appliedSet = new Set(itemsToApply.map((i) => i.id));
        const summary = `Cleaned ${data.totalProcessed} transactions (${data.updatedCount} updated, ${data.deletedCount} duplicates/zero entries removed)!`;
        
        setSuccessSummary(summary);
        popup.success(isAutoSweep ? "🏆 1-CLICK BULK SWEEP COMPLETE!" : "DataBank Cleaned! ⚡", summary);
        
        triggerConfetti();
        addXp(isAutoSweep ? 250 : itemsToApply.length * 15);

        // Remove applied items
        setSuggestions((prev) => prev.filter((s) => !appliedSet.has(s.id)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          appliedSet.forEach((id) => next.delete(id));
          return next;
        });

        setAnalyticsImpact(null);
        await useDatabankStore.getState().loadContext().catch(() => {});
        onCleanComplete?.();
      } else {
        popup.error("Clean Failed", data.error || "Failed to apply DataBank fixes.");
      }
    } catch {
      popup.error("Error", "An unexpected error occurred while cleaning DataBank.");
    } finally {
      setApplying(false);
    }
  };

  // Speed Swipe Card Handlers
  const handleSwipeApprove = async () => {
    const currentItem = suggestions[currentIndex];
    if (!currentItem) return;

    setStreak((prev) => prev + 1);
    addXp(15 + Math.min(streak * 5, 50));
    await handleApplyFixes([currentItem]);
  };

  const handleSwipeSkip = () => {
    setStreak(0);
    if (currentIndex < suggestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visible = filteredSuggestions;
    const allSelected = visible.every((s) => selectedIds.has(s.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visible.forEach((s) => {
        if (allSelected) next.delete(s.id);
        else next.add(s.id);
      });
      return next;
    });
  };

  const filteredSuggestions = suggestions.filter((s) => {
    if (filterTab === "all") return true;
    return s.issue_type === filterTab;
  });

  const countByType = {
    inverted: suggestions.filter((s) => s.issue_type === "inverted_direction").length,
    duplicate: suggestions.filter((s) => s.issue_type === "duplicate").length,
    uncategorized: suggestions.filter((s) => s.issue_type === "uncategorized").length,
    zero_amount: suggestions.filter((s) => s.issue_type === "zero_amount").length,
  };

  const quickPromptChips = [
    { label: "⚡ Fix Inverted Debits/Credits", prompt: "Find and fix all transactions where debit alerts were saved as income or credit alerts were saved as expenses." },
    { label: "🚗 Recategorize Uber & Transport", prompt: "Find all Uber, Bolt, and fuel payments and set category to Transport & Fuel." },
    { label: "🍕 Group Food & Dining", prompt: "Find all restaurant, Domino's, KFC, and food purchases and set category to Food & Dining." },
    { label: "👯 Remove Duplicates", prompt: "Find all duplicate transactions with identical dates and amounts and mark them for deletion." },
    { label: "💼 Cowrywise to Savings", prompt: "Find all Cowrywise, PiggyVest, and investment transfers and set category to Savings & Investments." },
  ];

  const badges: UserBadge[] = [
    { id: "clean_starter", title: "Data Novice", description: "Ran your first DataBank audit scan", icon: "🧹", unlocked: hasScanned },
    { id: "streak_master", title: "Streak Master", description: "Achieved a 5x cleaning streak", icon: "🔥", unlocked: streak >= 5 || xp >= 200 },
    { id: "turbo_cleaner", title: "1-Click Auto-Sweeper", description: "Cleaned 20+ transactions in 1 click", icon: "⚡", unlocked: xp >= 300 },
    { id: "master_auditor", title: "Master Financial Auditor", description: "Achieved 100% Data Quality Score", icon: "🏆", unlocked: cleanScore === 100 && totalEntries > 0 },
  ];

  return (
    <div
      className="rounded-[20px] p-5 mb-6 transition-all duration-300 overflow-hidden border"
      style={{
        background: "linear-gradient(135deg, rgba(11, 21, 40, 0.95) 0%, rgba(19, 35, 61, 0.95) 100%)",
        borderColor: cleanScore === 100 ? "var(--green, #00C48C)" : "rgba(255, 215, 0, 0.3)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        color: "#ffffff",
      }}
    >
      {/* ── Level Up Celebration Banner ── */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            className="p-4 mb-4 rounded-[14px] text-center font-bold text-white shadow-xl flex items-center justify-center gap-3"
            style={{ background: "linear-gradient(90deg, #FFD700 0%, #FF4081 50%, #00C48C 100%)" }}
          >
            <span className="text-[28px]">🎉</span>
            <div>
              <div className="text-[16px]">LEVEL UP! Welcome to Level {level} Auditor!</div>
              <div className="text-[12px] opacity-90 font-normal">You earned bonus XP and unlocked new Data Cleanliness badges!</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── GAMIFIED HEALTH SCORE & XP HEADER ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 mb-5 rounded-[16px] border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
        {/* Quality Score Meter */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center justify-between text-[12px] font-semibold mb-1">
            <span className="text-gray-300">Data Quality Hygiene</span>
            <span className="font-bold text-[14px]" style={{ color: cleanScore >= 80 ? "#00C48C" : cleanScore >= 50 ? "#FFD700" : "#EF4444" }}>
              {cleanScore}% Clean
            </span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden bg-black/40 border border-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${cleanScore}%` }}
              transition={{ duration: 1 }}
              className="h-full rounded-full"
              style={{
                background: cleanScore >= 80 ? "linear-gradient(90deg, #00C48C, #10B981)" : cleanScore >= 50 ? "linear-gradient(90deg, #F59E0B, #FFD700)" : "linear-gradient(90deg, #EF4444, #F59E0B)",
              }}
            />
          </div>
          <div className="text-[11px] mt-1 text-gray-400">
            {suggestions.length === 0 ? "✨ 100% Verified Data Perfection" : `⚠️ ${suggestions.length} issues detected across ${totalEntries} entries`}
          </div>
        </div>

        {/* Level & XP Progress */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center justify-between text-[12px] font-semibold mb-1">
            <span className="text-gray-300">Level {level} Auditor</span>
            <span className="text-[#FFD700] font-mono font-bold">{xp} XP Total</span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden bg-black/40 border border-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all"
              style={{ width: `${xpInCurrentLevel}%` }}
            />
          </div>
          <div className="text-[11px] mt-1 text-gray-400 flex items-center justify-between">
            <span>{100 - xpInCurrentLevel} XP to Level {level + 1}</span>
            {streak > 0 && <span className="text-amber-400 font-bold">🔥 {streak}x Streak!</span>}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleScan}
            disabled={scanning || prompting}
            className="w-full md:w-auto px-4 py-2.5 rounded-[12px] text-[13px] font-bold text-white border-none cursor-pointer transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #00C48C 0%, #009E70 100%)",
              opacity: scanning || prompting ? 0.7 : 1,
            }}
          >
            {scanning ? (
              <>
                <span className="animate-spin text-[14px]">🔄</span> Scanning DataBank...
              </>
            ) : (
              <>
                <span>🔍 Re-Audit DataBank</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── ARCADE GAME TABS ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4 border-b pb-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <button
          onClick={() => setActiveTab("auto_sweep")}
          className={`px-4 py-2 rounded-[10px] text-[12.5px] font-bold cursor-pointer transition-all flex items-center gap-1.5 border ${
            activeTab === "auto_sweep"
              ? "bg-[#00C48C] text-[#0B0E17] border-[#00C48C]"
              : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
          }`}
        >
          <span>⚡ 1-Click Auto-Sweep (500+)</span>
          {suggestions.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/30 text-white font-bold">
              {suggestions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("speed_swipe")}
          className={`px-4 py-2 rounded-[10px] text-[12.5px] font-bold cursor-pointer transition-all flex items-center gap-1.5 border ${
            activeTab === "speed_swipe"
              ? "bg-amber-400 text-[#0B0E17] border-amber-400"
              : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
          }`}
        >
          <span>🃏 Speed Card Swipe Game</span>
        </button>

        <button
          onClick={() => setActiveTab("ai_prompt")}
          className={`px-4 py-2 rounded-[10px] text-[12.5px] font-bold cursor-pointer transition-all flex items-center gap-1.5 border ${
            activeTab === "ai_prompt"
              ? "bg-blue-500 text-white border-blue-500"
              : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
          }`}
        >
          <span>🪄 AI Magic Wand Console</span>
        </button>

        <button
          onClick={() => setActiveTab("badges")}
          className={`px-4 py-2 rounded-[10px] text-[12.5px] font-bold cursor-pointer transition-all flex items-center gap-1.5 border ${
            activeTab === "badges"
              ? "bg-purple-500 text-white border-purple-500"
              : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
          }`}
        >
          <span>🏆 Badges & Ranks</span>
        </button>
      </div>

      {/* ── TAB 1: 1-CLICK AI AUTO-SWEEP ── */}
      {activeTab === "auto_sweep" && (
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-[14px] bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-[15px] font-bold text-white m-0 flex items-center gap-2">
                <span>⚡ Bulk AI Auto-Sweep Mode</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#00C48C]/20 text-[#00C48C] font-semibold">
                  Designed for 500+ Transactions
                </span>
              </h4>
              <p className="text-[12px] text-gray-300 m-0 mt-1">
                Don't edit entries one by one! 1-Click Auto-Sweep detects and repairs all inverted debits, duplicates, and unclassified entries automatically.
              </p>
            </div>

            <button
              onClick={() => handleApplyFixes(suggestions, true)}
              disabled={applying || suggestions.length === 0}
              className="px-6 py-3 rounded-[12px] text-[14px] font-extrabold text-[#0B0E17] border-none cursor-pointer transition-all shadow-xl hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(90deg, #FFD700 0%, #00C48C 100%)",
                opacity: applying || suggestions.length === 0 ? 0.6 : 1,
              }}
            >
              {applying ? "Sweeping 500+ Items..." : `🏆 1-CLICK AUTO-SWEEP ALL ${suggestions.length} FIXES (+250 XP)`}
            </button>
          </div>

          {/* Categorized Issue Cards */}
          {suggestions.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-[12px] bg-amber-500/10 border border-amber-500/20 text-center">
                <div className="text-[20px] font-extrabold text-amber-400">{countByType.inverted}</div>
                <div className="text-[11px] text-gray-300 font-semibold mt-0.5">🔄 Inverted Debits/Credits</div>
              </div>
              <div className="p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-center">
                <div className="text-[20px] font-extrabold text-red-400">{countByType.duplicate}</div>
                <div className="text-[11px] text-gray-300 font-semibold mt-0.5">👯 Duplicate Charges</div>
              </div>
              <div className="p-3 rounded-[12px] bg-blue-500/10 border border-blue-500/20 text-center">
                <div className="text-[20px] font-extrabold text-blue-400">{countByType.uncategorized}</div>
                <div className="text-[11px] text-gray-300 font-semibold mt-0.5">🏷️ Uncategorized Items</div>
              </div>
              <div className="p-3 rounded-[12px] bg-purple-500/10 border border-purple-500/20 text-center">
                <div className="text-[20px] font-extrabold text-purple-400">{countByType.zero_amount}</div>
                <div className="text-[11px] text-gray-300 font-semibold mt-0.5">⚠️ Zero Amount Alerts</div>
              </div>
            </div>
          )}

          {/* Suggestions List Table */}
          {hasScanned && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-bold text-gray-300">
                  Select Specific Fixes to Apply ({selectedIds.size} / {suggestions.length} selected):
                </span>
                <button
                  onClick={toggleSelectAll}
                  className="text-[11.5px] font-bold text-[#00C48C] bg-transparent border-none cursor-pointer"
                >
                  {filteredSuggestions.every((s) => selectedIds.has(s.id)) ? "Deselect All" : "Select All Visible"}
                </button>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                {filteredSuggestions.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const isDelete = item.suggested.action === "delete";

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleSelect(item.id)}
                      className="flex flex-wrap items-center justify-between p-3 rounded-[12px] border cursor-pointer transition-all hover:border-[#00C48C]"
                      style={{
                        background: isSelected ? "rgba(0,196,140,0.08)" : "rgba(255,255,255,0.03)",
                        borderColor: isSelected ? "#00C48C" : "rgba(255,255,255,0.08)",
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-[260px]">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="cursor-pointer"
                        />
                        <div>
                          <div className="text-[13px] font-bold text-white">{item.issue_title}</div>
                          <div className="text-[11px] text-gray-400">"{item.current.description}" · {item.current.entry_date}</div>
                        </div>
                      </div>

                      <div className="text-[12px]">
                        {isDelete ? (
                          <span className="px-2.5 py-1 rounded-[6px] font-bold text-red-400 bg-red-500/10 border border-red-500/20">
                            🗑️ Delete Duplicate
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-[6px] font-bold text-[#00C48C] bg-[#00C48C]/10 border border-[#00C48C]/20">
                            {item.current.entry_type} ➔ {item.suggested.entry_type || item.current.entry_type} ({item.suggested.category || item.current.category})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-white/10">
                <button
                  onClick={() => handleApplyFixes()}
                  disabled={applying || selectedIds.size === 0}
                  className="px-5 py-2.5 rounded-[10px] text-[13px] font-bold text-[#0B0E17] bg-[#00C48C] border-none cursor-pointer hover:opacity-90 disabled:opacity-50"
                >
                  {applying ? "Applying Selected Fixes..." : `⚡ Apply ${selectedIds.size} Selected Fixes`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: SPEED CARD SWIPE GAME ── */}
      {activeTab === "speed_swipe" && (
        <div className="flex flex-col items-center justify-center p-4 min-h-[320px]">
          {suggestions.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-[48px] block mb-2">🏆</span>
              <h3 className="text-[18px] font-bold text-white">All Clean! No Cards to Swipe</h3>
              <p className="text-[13px] text-gray-400">Your DataBank cleanliness is 100%. Re-audit to check for new transactions!</p>
            </div>
          ) : (
            <div className="w-full max-w-md flex flex-col items-center">
              <div className="text-[12px] font-bold text-amber-400 mb-2 tracking-wider uppercase">
                🃏 Card {currentIndex + 1} of {suggestions.length} · 🔥 {streak}x Clean Streak!
              </div>

              {/* Swipe Card */}
              {suggestions[currentIndex] && (
                <motion.div
                  key={suggestions[currentIndex].id}
                  initial={{ scale: 0.9, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: -10 }}
                  className="w-full p-5 rounded-[20px] border shadow-2xl flex flex-col gap-4 text-left relative overflow-hidden"
                  style={{
                    background: "linear-gradient(145deg, #13233d 0%, #0d1b30 100%)",
                    borderColor: "rgba(255, 215, 0, 0.3)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300">
                      {suggestions[currentIndex].issue_title}
                    </span>
                    <span className="text-[11px] text-gray-400 font-mono">
                      📅 {suggestions[currentIndex].current.entry_date}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Transaction Description</span>
                    <div className="text-[15px] font-extrabold text-white">
                      "{suggestions[currentIndex].current.description}"
                    </div>
                  </div>

                  {/* Diff Comparison Box */}
                  <div className="p-3 rounded-[12px] bg-black/30 border border-white/10 flex items-center justify-between text-[13px]">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Current</span>
                      <span className="font-bold text-red-400 line-through">
                        {suggestions[currentIndex].current.entry_type} · {suggestions[currentIndex].current.category}
                      </span>
                    </div>
                    <span className="text-[16px] text-amber-400">➔</span>
                    <div>
                      <span className="text-[10px] text-[#00C48C] uppercase font-bold block">AI Fix</span>
                      <span className="font-extrabold text-[#00C48C]">
                        {suggestions[currentIndex].suggested.entry_type || suggestions[currentIndex].current.entry_type} · {suggestions[currentIndex].suggested.category || suggestions[currentIndex].current.category}
                      </span>
                    </div>
                  </div>

                  {/* Swipe Game Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <button
                      onClick={handleSwipeSkip}
                      className="py-2.5 rounded-[10px] text-[12px] font-bold text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer"
                    >
                      ❌ Skip
                    </button>
                    <button
                      onClick={handleSwipeApprove}
                      disabled={applying}
                      className="py-2.5 rounded-[10px] text-[12px] font-bold text-[#0B0E17] bg-[#00C48C] border-none hover:opacity-90 cursor-pointer col-span-2"
                    >
                      {applying ? "Fixing..." : "⚡ Approve Fix (+15 XP)"}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: AI MAGIC WAND PROMPT CONSOLE ── */}
      {activeTab === "ai_prompt" && (
        <div className="flex flex-col gap-3 p-4 rounded-[14px] bg-white/5 border border-white/10">
          <div className="text-[13px] font-bold text-white flex items-center gap-2">
            <span>🪄</span>
            <span>Natural Language AI Magic Wand</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendPrompt();
                }
              }}
              placeholder="e.g. 'Categorize all Cowrywise transfers to Savings', 'Fix GTBank debits'..."
              className="flex-1 px-3.5 py-2.5 rounded-[10px] text-[13px] outline-none border bg-black/40 text-white border-white/15 focus:border-[#00C48C]"
            />
            <button
              onClick={() => handleSendPrompt()}
              disabled={prompting || !userPrompt.trim()}
              className="px-5 py-2.5 rounded-[10px] text-[13px] font-bold text-white bg-blue-600 border-none cursor-pointer hover:bg-blue-500 disabled:opacity-50"
            >
              {prompting ? "AI Agent Working..." : "Run AI Wand ⚡"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {quickPromptChips.map((chip) => (
              <button
                key={chip.label}
                onClick={() => {
                  setUserPrompt(chip.prompt);
                  handleSendPrompt(chip.prompt);
                }}
                disabled={prompting || scanning}
                className="px-2.5 py-1.5 rounded-[8px] text-[11px] font-semibold bg-white/5 text-gray-300 border border-white/10 hover:border-[#00C48C] hover:text-white cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: BADGES & RANKS ── */}
      {activeTab === "badges" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {badges.map((b) => (
            <div
              key={b.id}
              className="p-4 rounded-[14px] border text-center flex flex-col items-center justify-between"
              style={{
                background: b.unlocked ? "rgba(0,196,140,0.08)" : "rgba(255,255,255,0.02)",
                borderColor: b.unlocked ? "#00C48C" : "rgba(255,255,255,0.08)",
                opacity: b.unlocked ? 1 : 0.5,
              }}
            >
              <div className="text-[36px] mb-2">{b.icon}</div>
              <div>
                <div className="text-[13px] font-bold text-white">{b.title}</div>
                <div className="text-[11px] text-gray-400 mt-1">{b.description}</div>
              </div>
              <div className="mt-3">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    background: b.unlocked ? "#00C48C" : "rgba(255,255,255,0.1)",
                    color: b.unlocked ? "#0B0E17" : "#94A3B8",
                  }}
                >
                  {b.unlocked ? "Unlocked 🔓" : "Locked 🔒"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
