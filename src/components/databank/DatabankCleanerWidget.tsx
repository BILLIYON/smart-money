"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { popup } from "@/store/popupStore";
import { useDatabankStore } from "@/store/databankStore";
import type { CleaningSuggestion } from "@/app/api/databank/clean/scan/route";

type CleanTab = "auto_clean" | "interactive_review" | "ai_prompt";

export function DatabankCleanerWidget({ onCleanComplete }: { onCleanComplete?: () => void }) {
  const [activeTab, setActiveTab] = useState<CleanTab>("auto_clean");
  const [isCollapsed, setIsCollapsed] = useState(false);

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
  const [currentIndex, setCurrentIndex] = useState(0);

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

        popup.success("AI Rule Applied 🪄", `Identified ${data.suggestions.length} entries matching: "${text}"`);
      } else {
        popup.error("AI Assistant Error", data.error || "Could not process custom cleaning rule.");
      }
    } catch {
      popup.error("Error", "Failed to connect to AI assistant.");
    } finally {
      setPrompting(false);
    }
  };

  const handleApplyFixes = async (itemsToApply: CleaningSuggestion[], isAutoClean = false) => {
    if (itemsToApply.length === 0) {
      popup.alert("No Fixes Selected", "Please select at least one item to clean.", "info");
      return;
    }

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
        popup.success(isAutoClean ? "🏆 1-CLICK BULK CLEAN COMPLETE!" : "DataBank Cleaned! ⚡", summary);
        
        triggerConfetti();

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

  // Card Review Handlers
  const handleApproveCurrent = async () => {
    const currentItem = suggestions[currentIndex];
    if (!currentItem) return;
    await handleApplyFixes([currentItem]);
  };

  const handleSkipCurrent = () => {
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

  const currentCard = suggestions[currentIndex];

  return (
    <div
      id="ai-cleaner-widget"
      className="rounded-[16px] p-4 mb-5 transition-all duration-300 border shadow-sm"
      style={{
        background: "var(--card)",
        borderColor: cleanScore === 100 ? "var(--green, #00C48C)" : "var(--border)",
        color: "var(--text)",
      }}
    >
      {/* ── HEADER & SCORE BAR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[18px] bg-[var(--green)]/10 text-[var(--green)]">
            ✨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold" style={{ color: "var(--text)" }}>
                AI Data Cleaner & Bulk Auditor
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--green)]/15 text-[var(--green)]">
                500+ Batch Fix Engine
              </span>
            </div>
            <p className="text-[12px] m-0" style={{ color: "var(--muted)" }}>
              {suggestions.length === 0
                ? "✨ 100% Verified Data Perfection — all records are clean."
                : `⚠️ Found ${suggestions.length} issues across ${totalEntries} transactions requiring optimization.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Health Score Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[var(--bg)] border" style={{ borderColor: "var(--border)" }}>
            <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>Hygiene Score:</span>
            <span className="text-[13px] font-bold" style={{ color: cleanScore >= 80 ? "var(--green)" : cleanScore >= 50 ? "#F5A623" : "#EF4444" }}>
              {cleanScore}% Clean
            </span>
          </div>

          <button
            onClick={handleScan}
            disabled={scanning || prompting}
            className="px-3.5 py-1.5 rounded-[9px] text-[12px] font-semibold border transition-all cursor-pointer hover:opacity-90 disabled:opacity-50"
            style={{
              background: "var(--bg)",
              color: "var(--text)",
              borderColor: "var(--border)",
            }}
          >
            {scanning ? "🔄 Scanning..." : "🔍 Re-Scan"}
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-[8px] text-[12px] cursor-pointer hover:bg-[var(--border)]/30"
            style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "transparent" }}
            title={isCollapsed ? "Expand Smart Cleaner" : "Collapse Smart Cleaner"}
          >
            {isCollapsed ? "▼ Expand" : "▲ Collapse"}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="mt-4">
          {/* ── MODE TABS ── */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              onClick={() => setActiveTab("auto_clean")}
              className="px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold cursor-pointer transition-all border"
              style={{
                background: activeTab === "auto_clean" ? "var(--green)" : "var(--bg)",
                color: activeTab === "auto_clean" ? "#0B0E17" : "var(--text)",
                borderColor: activeTab === "auto_clean" ? "var(--green)" : "var(--border)",
              }}
            >
              ⚡ 1-Click Auto-Clean (500+) {suggestions.length > 0 && `(${suggestions.length})`}
            </button>

            <button
              onClick={() => setActiveTab("interactive_review")}
              className="px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold cursor-pointer transition-all border"
              style={{
                background: activeTab === "interactive_review" ? "var(--green)" : "var(--bg)",
                color: activeTab === "interactive_review" ? "#0B0E17" : "var(--text)",
                borderColor: activeTab === "interactive_review" ? "var(--green)" : "var(--border)",
              }}
            >
              🎴 Fast Interactive Card Review
            </button>

            <button
              onClick={() => setActiveTab("ai_prompt")}
              className="px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold cursor-pointer transition-all border"
              style={{
                background: activeTab === "ai_prompt" ? "var(--green)" : "var(--bg)",
                color: activeTab === "ai_prompt" ? "#0B0E17" : "var(--text)",
                borderColor: activeTab === "ai_prompt" ? "var(--green)" : "var(--border)",
              }}
            >
              🪄 Custom AI Prompt Rules
            </button>
          </div>

          {/* ── TAB 1: 1-CLICK BULK AUTO-CLEAN ── */}
          {activeTab === "auto_clean" && (
            <div className="flex flex-col gap-4">
              <div className="p-3.5 rounded-[12px] bg-[var(--bg)] border flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "var(--border)" }}>
                <div>
                  <div className="text-[13px] font-bold" style={{ color: "var(--text)" }}>
                    ⚡ Bulk AI Auto-Clean Mode (500+ Transactions)
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: "var(--muted)" }}>
                    Instantly repairs all inverted debits/credits, duplicate records, zero amounts, and missing categories across your entire database.
                  </div>
                </div>
                <button
                  onClick={() => handleApplyFixes(suggestions, true)}
                  disabled={applying || suggestions.length === 0}
                  className="px-4 py-2 rounded-[9px] text-[12px] font-bold cursor-pointer transition-all shadow-sm hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: "var(--green)",
                    color: "#0B0E17",
                    border: "none",
                  }}
                >
                  {applying ? "⏳ Cleaning..." : `⚡ 1-CLICK CLEAN ALL ${suggestions.length} FIXES`}
                </button>
              </div>

              {/* Filter Pills */}
              {suggestions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                      <button
                        onClick={() => setFilterTab("all")}
                        className={`px-2.5 py-1 rounded-[6px] font-medium border cursor-pointer ${
                          filterTab === "all" ? "bg-[var(--text)] text-[var(--bg)]" : "bg-[var(--bg)] text-[var(--muted)]"
                        }`}
                        style={{ borderColor: "var(--border)" }}
                      >
                        All Issues ({suggestions.length})
                      </button>
                      {countByType.inverted > 0 && (
                        <button
                          onClick={() => setFilterTab("inverted_direction")}
                          className={`px-2.5 py-1 rounded-[6px] font-medium border cursor-pointer ${
                            filterTab === "inverted_direction" ? "bg-amber-500 text-black" : "bg-[var(--bg)] text-[var(--muted)]"
                          }`}
                          style={{ borderColor: "var(--border)" }}
                        >
                          Inverted Debits ({countByType.inverted})
                        </button>
                      )}
                      {countByType.duplicate > 0 && (
                        <button
                          onClick={() => setFilterTab("duplicate")}
                          className={`px-2.5 py-1 rounded-[6px] font-medium border cursor-pointer ${
                            filterTab === "duplicate" ? "bg-red-500 text-white" : "bg-[var(--bg)] text-[var(--muted)]"
                          }`}
                          style={{ borderColor: "var(--border)" }}
                        >
                          Duplicates ({countByType.duplicate})
                        </button>
                      )}
                      {countByType.uncategorized > 0 && (
                        <button
                          onClick={() => setFilterTab("uncategorized")}
                          className={`px-2.5 py-1 rounded-[6px] font-medium border cursor-pointer ${
                            filterTab === "uncategorized" ? "bg-blue-500 text-white" : "bg-[var(--bg)] text-[var(--muted)]"
                          }`}
                          style={{ borderColor: "var(--border)" }}
                        >
                          Uncategorized ({countByType.uncategorized})
                        </button>
                      )}
                    </div>

                    <button
                      onClick={toggleSelectAll}
                      className="text-[11px] font-semibold text-[var(--green)] hover:underline cursor-pointer bg-transparent border-none"
                    >
                      {filteredSuggestions.every((s) => selectedIds.has(s.id)) ? "Deselect All" : "Select All"}
                    </button>
                  </div>

                  {/* List preview */}
                  <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
                    {filteredSuggestions.map((s) => {
                      const selected = selectedIds.has(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleSelect(s.id)}
                          className={`p-2.5 rounded-[8px] text-[12px] border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                            selected ? "bg-[var(--green)]/10 border-[var(--green)]/40" : "bg-[var(--bg)] border-[var(--border)]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleSelect(s.id)}
                              className="w-4 h-4 rounded accent-[var(--green)] cursor-pointer"
                            />
                            <div>
                              <div className="font-semibold" style={{ color: "var(--text)" }}>
                                {s.current.description || "Transaction"}
                              </div>
                              <div className="text-[11px] text-[var(--muted)] flex items-center gap-2 mt-0.5">
                                <span>Current: {s.current.entry_type} | ₦{(s.current.amount || 0).toLocaleString()}</span>
                                <span>→</span>
                                <span className="font-semibold text-[var(--green)]">
                                  Suggested: {s.suggested.action === "delete" ? "🗑️ Remove Duplicate" : `${s.suggested.entry_type} (${s.suggested.category})`}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono opacity-60">ID: {s.id.slice(0, 8)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Apply Selected Button */}
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() =>
                        handleApplyFixes(
                          suggestions.filter((s) => selectedIds.has(s.id))
                        )
                      }
                      disabled={applying || selectedIds.size === 0}
                      className="px-4 py-2 rounded-[8px] text-[12px] font-bold cursor-pointer transition-all border"
                      style={{
                        background: "var(--bg)",
                        color: "var(--green)",
                        borderColor: "var(--green)",
                      }}
                    >
                      Apply {selectedIds.size} Selected Fixes
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: FAST INTERACTIVE CARD REVIEW ── */}
          {activeTab === "interactive_review" && (
            <div className="p-4 rounded-[12px] bg-[var(--bg)] border" style={{ borderColor: "var(--border)" }}>
              {suggestions.length === 0 ? (
                <div className="text-center py-6 text-[13px]" style={{ color: "var(--muted)" }}>
                  🎉 All transaction records are audited and 100% clean!
                </div>
              ) : currentCard ? (
                <div className="flex flex-col items-center text-center gap-3 max-w-[480px] mx-auto">
                  <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
                    Item {currentIndex + 1} of {suggestions.length}
                  </span>
                  <div className="text-[16px] font-bold" style={{ color: "var(--text)" }}>
                    {currentCard.current.description || "Transaction Alert"}
                  </div>
                  <div className="text-[12px]" style={{ color: "var(--muted)" }}>
                    Category: <b>{currentCard.current.category || "Uncategorized"}</b> | Amount: <b>₦{(currentCard.current.amount || 0).toLocaleString()}</b>
                  </div>

                  <div className="p-3 my-1 rounded-[10px] w-full text-left text-[12px] bg-[var(--card)] border" style={{ borderColor: "var(--border)" }}>
                    <div className="text-[11px] font-bold text-amber-500 uppercase mb-1">Detected Issue: {currentCard.issue_type}</div>
                    <div>Reason: {currentCard.issue_description}</div>
                    <div className="mt-2 font-semibold text-[var(--green)]">
                      Suggested Fix: {currentCard.suggested.action === "delete" ? "🗑️ Delete Duplicate Record" : `Update to ${currentCard.suggested.entry_type} [${currentCard.suggested.category}]`}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full mt-2">
                    <button
                      onClick={handleSkipCurrent}
                      className="flex-1 py-2 rounded-[9px] text-[12px] font-semibold border cursor-pointer hover:bg-[var(--border)]/20"
                      style={{ background: "transparent", color: "var(--muted)", borderColor: "var(--border)" }}
                    >
                      Skip
                    </button>
                    <button
                      onClick={handleApproveCurrent}
                      className="flex-1 py-2 rounded-[9px] text-[12px] font-bold cursor-pointer transition-all hover:opacity-90"
                      style={{ background: "var(--green)", color: "#0B0E17", border: "none" }}
                    >
                      ✓ Approve Fix
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ── TAB 3: CUSTOM AI PROMPT RULES ── */}
          {activeTab === "ai_prompt" && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendPrompt()}
                  placeholder="e.g. 'Recategorize all Uber trips to Transport', 'Set Cowrywise as Savings'..."
                  className="flex-1 px-3.5 py-2.5 rounded-[9px] text-[12px] border focus:outline-none"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                />
                <button
                  onClick={() => handleSendPrompt()}
                  disabled={prompting || !userPrompt.trim()}
                  className="px-4 py-2.5 rounded-[9px] text-[12px] font-bold cursor-pointer border-none transition-all disabled:opacity-50"
                  style={{ background: "var(--green)", color: "#0B0E17" }}
                >
                  {prompting ? "Processing..." : "Run AI Rule"}
                </button>
              </div>

              {/* Preset Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold" style={{ color: "var(--muted)" }}>Quick Rules:</span>
                {quickPromptChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendPrompt(chip.prompt)}
                    className="px-2.5 py-1 rounded-[6px] text-[11px] font-medium border cursor-pointer hover:border-[var(--green)] hover:text-[var(--green)] transition-all"
                    style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--muted)" }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
