"use client";

import { useState, useCallback } from "react";
import { popup } from "@/store/popupStore";
import { useDatabankStore } from "@/store/databankStore";
import type { CleaningSuggestion } from "@/app/api/databank/clean/scan/route";

export function DatabankCleanerWidget({ onCleanComplete }: { onCleanComplete?: () => void }) {
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

        if ((data.suggestions || []).length === 0) {
          popup.success("DataBank Audit Clear! 🎯", "All your financial entries are accurate and well-categorized.");
        } else {
          popup.alert("AI Audit Complete 🔍", `Found ${data.suggestions.length} potential issues for cleaning.`, "info");
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

        if ((data.suggestions || []).length === 0) {
          popup.alert("AI Agent Response 🤖", data.message || "No matching transactions found for your prompt.", "info");
        } else {
          popup.success("AI Agent Generated Fixes ⚡", `Found ${data.suggestions.length} entries matching: "${text.slice(0, 40)}..."`);
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

  const handleApplyFixes = async () => {
    if (selectedIds.size === 0) return;
    setApplying(true);
    try {
      const fixesToApply = suggestions
        .filter((s) => selectedIds.has(s.id))
        .map((s) => ({
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
        const summary = `Successfully updated ${data.updatedCount} items and removed ${data.deletedCount} duplicates/anomalies.`;
        setSuccessSummary(summary);
        popup.success("DataBank Cleaned 🚀", summary);
        
        // Remove applied items from suggestions
        setSuggestions((prev) => prev.filter((s) => !selectedIds.has(s.id)));
        setSelectedIds(new Set());
        setAnalyticsImpact(null);

        // Reload databank store context
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
    { label: "⚡ Run Full AI Audit", prompt: "Perform a complete audit scan for inverted debits, duplicates, and uncategorized expenses." },
    { label: "🔄 Fix Inverted Debits/Credits", prompt: "Find and fix all transactions where debit alerts were saved as income or credit alerts were saved as expenses." },
    { label: "🚗 Recategorize Uber & Bolt", prompt: "Find all Uber, Bolt, and ride-hailing payments and set category to Transport." },
    { label: "🍕 Group Dining & Food", prompt: "Find all restaurant, Domino's, KFC, and food purchases and set category to Food & Dining." },
    { label: "👯 Delete Duplicates", prompt: "Find all duplicate transactions with identical dates and amounts and mark them for deletion." },
  ];

  return (
    <div
      className="rounded-[16px] p-5 mb-6 transition-all duration-200 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)",
        border: "1px solid rgba(16, 185, 129, 0.25)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
      }}
    >
      {/* Widget Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-[12px]"
            style={{ width: 42, height: 42, background: "rgba(0,196,140,0.15)", flexShrink: 0 }}
          >
            <span className="text-[20px]">🤖</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-bold m-0" style={{ color: "var(--text)" }}>
                AI DataBank Agent Console
              </h3>
              <span
                className="text-[10px] font-semibold px-2 py-[2px] rounded-full"
                style={{ background: "rgba(0,196,140,0.15)", color: "var(--green2)" }}
              >
                Agentic Action Tool
              </span>
            </div>
            <p className="text-[12px] m-0 mt-0.5" style={{ color: "var(--muted)" }}>
              Prompt AI agents to clean transactions, fix debits/credits, and control your Spending Analytics.
            </p>
          </div>
        </div>

        {/* Audit Button */}
        <button
          onClick={handleScan}
          disabled={scanning || prompting}
          className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-bold text-white border-none cursor-pointer transition-transform active:scale-95 shadow-md"
          style={{
            background: "linear-gradient(135deg, var(--green) 0%, var(--green2) 100%)",
            opacity: scanning || prompting ? 0.7 : 1,
          }}
        >
          {scanning ? (
            <>
              <span className="animate-spin text-[14px]">🔄</span> Scanning...
            </>
          ) : (
            <>
              <span>🔍 Run AI Audit</span>
            </>
          )}
        </button>
      </div>

      {/* ── EMBEDDED AI AGENT PROMPT CONSOLE ── */}
      <div className="p-3.5 mb-4 rounded-[12px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="text-[12px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: "var(--text)" }}>
          <span>💬</span>
          <span>Prompt AI Agent to Modify & Control DataBank</span>
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2 mb-3">
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
            placeholder="e.g. 'Change all OPay top-ups to expenses', 'Recategorize Uber as Transport', 'Fix GTBank debit alerts'..."
            className="flex-1 px-3.5 py-2.5 rounded-[10px] border text-[13px] outline-none transition-colors"
            style={{ background: "var(--bg)", color: "var(--text)", borderColor: "var(--border)" }}
          />
          <button
            onClick={() => handleSendPrompt()}
            disabled={prompting || !userPrompt.trim()}
            className="px-4 py-2.5 rounded-[10px] text-[13px] font-bold text-white border-none cursor-pointer transition-all shadow-sm"
            style={{
              background: "var(--green)",
              opacity: prompting || !userPrompt.trim() ? 0.6 : 1,
            }}
          >
            {prompting ? "AI Agent Thinking..." : "Ask AI Agent ⚡"}
          </button>
        </div>

        {/* Quick Action Chips */}
        <div className="flex flex-wrap gap-1.5">
          {quickPromptChips.map((chip) => (
            <button
              key={chip.label}
              onClick={() => {
                setUserPrompt(chip.prompt);
                handleSendPrompt(chip.prompt);
              }}
              disabled={prompting || scanning}
              className="px-2.5 py-1 rounded-[6px] text-[11px] font-medium border cursor-pointer transition-all hover:border-[var(--green)] bg-transparent"
              style={{ color: "var(--muted)", borderColor: "var(--border)" }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Success Banner */}
      {successSummary && (
        <div
          className="p-3 mb-4 rounded-[10px] text-[12px] font-medium flex items-center gap-2 animate-fadeIn"
          style={{ background: "rgba(0,196,140,0.12)", border: "1px solid rgba(0,196,140,0.3)", color: "var(--green2)" }}
        >
          <span>🎉</span> {successSummary}
        </div>
      )}

      {/* Analytics Impact Preview */}
      {analyticsImpact && (analyticsImpact.incomeChange !== 0 || analyticsImpact.expenseChange !== 0) && (
        <div
          className="p-3 mb-4 rounded-[10px] text-[12px] font-medium flex flex-wrap items-center justify-between gap-2"
          style={{ background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59, 130, 246, 0.25)", color: "var(--text)" }}
        >
          <div className="flex items-center gap-2">
            <span>📊</span>
            <span className="font-bold">Spending Analytics Impact Preview:</span>
          </div>
          <div className="flex items-center gap-3 text-[12px]">
            {analyticsImpact.incomeChange !== 0 && (
              <span style={{ color: analyticsImpact.incomeChange >= 0 ? "var(--green2)" : "#EF4444" }}>
                Income: {analyticsImpact.incomeChange >= 0 ? "+" : ""}₦{Math.abs(analyticsImpact.incomeChange).toLocaleString()}
              </span>
            )}
            {analyticsImpact.expenseChange !== 0 && (
              <span style={{ color: analyticsImpact.expenseChange <= 0 ? "var(--green2)" : "#EF4444" }}>
                Expenses: {analyticsImpact.expenseChange >= 0 ? "+" : ""}₦{Math.abs(analyticsImpact.expenseChange).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Scanning / Prompting Loading Indicator */}
      {(scanning || prompting) && (
        <div className="p-4 rounded-[12px] text-center my-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="w-full h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "rgba(0,0,0,0.06)" }}>
            <div className="h-full rounded-full animate-pulse" style={{ width: "80%", background: "var(--green)" }} />
          </div>
          <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
            {prompting ? "AI Agent evaluating your custom prompt against DataBank entries..." : "Analyzing transaction directions, labels, and balances..."}
          </div>
        </div>
      )}

      {/* Audit & Prompt Results View */}
      {hasScanned && !scanning && !prompting && (
        <>
          {suggestions.length === 0 ? (
            <div className="p-4 rounded-[12px] text-center text-[13px]" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--muted)" }}>
              ✅ No transactions require modification for this prompt or audit scan.
            </div>
          ) : (
            <div>
              {/* Category Badges / Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                  onClick={() => setFilterTab("all")}
                  className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border cursor-pointer transition-colors"
                  style={{
                    background: filterTab === "all" ? "var(--green)" : "var(--card)",
                    color: filterTab === "all" ? "#fff" : "var(--text)",
                    borderColor: filterTab === "all" ? "var(--green)" : "var(--border)",
                  }}
                >
                  All Agent Fixes ({suggestions.length})
                </button>
                {countByType.inverted > 0 && (
                  <button
                    onClick={() => setFilterTab("inverted_direction")}
                    className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border cursor-pointer transition-colors"
                    style={{
                      background: filterTab === "inverted_direction" ? "#F59E0B" : "var(--card)",
                      color: filterTab === "inverted_direction" ? "#fff" : "var(--text)",
                      borderColor: filterTab === "inverted_direction" ? "#F59E0B" : "var(--border)",
                    }}
                  >
                    🔄 Inverted ({countByType.inverted})
                  </button>
                )}
                {countByType.duplicate > 0 && (
                  <button
                    onClick={() => setFilterTab("duplicate")}
                    className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border cursor-pointer transition-colors"
                    style={{
                      background: filterTab === "duplicate" ? "#EF4444" : "var(--card)",
                      color: filterTab === "duplicate" ? "#fff" : "var(--text)",
                      borderColor: filterTab === "duplicate" ? "#EF4444" : "var(--border)",
                    }}
                  >
                    👯 Duplicates ({countByType.duplicate})
                  </button>
                )}
                {countByType.uncategorized > 0 && (
                  <button
                    onClick={() => setFilterTab("uncategorized")}
                    className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border cursor-pointer transition-colors"
                    style={{
                      background: filterTab === "uncategorized" ? "#3B82F6" : "var(--card)",
                      color: filterTab === "uncategorized" ? "#fff" : "var(--text)",
                      borderColor: filterTab === "uncategorized" ? "#3B82F6" : "var(--border)",
                    }}
                  >
                    🏷️ Uncategorized ({countByType.uncategorized})
                  </button>
                )}
              </div>

              {/* Suggestions List */}
              <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1 mb-4">
                {filteredSuggestions.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const isDelete = item.suggested.action === "delete";

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleSelect(item.id)}
                      className="flex flex-wrap items-center justify-between p-3.5 rounded-[12px] border cursor-pointer transition-all hover:shadow-md"
                      style={{
                        background: isSelected ? "rgba(0,196,140,0.04)" : "var(--card)",
                        borderColor: isSelected ? "var(--green)" : "var(--border)",
                        opacity: isSelected ? 1 : 0.7,
                      }}
                    >
                      {/* Checkbox + Info */}
                      <div className="flex items-start gap-3 flex-1 min-w-[280px]">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold" style={{ color: "var(--text)" }}>
                              {item.issue_title}
                            </span>
                            <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                              ({item.current.entry_date})
                            </span>
                          </div>
                          <div className="text-[12px] mt-0.5" style={{ color: "var(--muted)" }}>
                            {item.issue_description}
                          </div>
                          <div className="text-[12px] font-semibold mt-1" style={{ color: "var(--text)" }}>
                            "{item.current.description}"
                          </div>
                        </div>
                      </div>

                      {/* Diff View */}
                      <div className="flex items-center gap-3 text-[12px] mt-2 sm:mt-0">
                        {isDelete ? (
                          <span className="px-3 py-1 rounded-[6px] font-bold text-red-500 bg-red-50 border border-red-200">
                            🗑️ Delete Entry
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 p-2 rounded-[8px]" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                            {/* Current */}
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold block" style={{ color: "var(--muted)" }}>Current</span>
                              <span className="font-semibold line-through text-red-400">
                                {item.current.entry_type} · {item.current.category}
                              </span>
                            </div>
                            <span className="text-[14px]">➔</span>
                            {/* Suggested */}
                            <div>
                              <span className="text-[10px] uppercase font-bold block" style={{ color: "var(--green2)" }}>AI Agent Fix</span>
                              <span className="font-bold" style={{ color: "var(--green2)" }}>
                                {item.suggested.entry_type || item.current.entry_type} · {item.suggested.category || item.current.category}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <button
                  onClick={toggleSelectAll}
                  className="text-[12px] font-semibold bg-transparent border-none cursor-pointer p-0"
                  style={{ color: "var(--green2)" }}
                >
                  {filteredSuggestions.every((s) => selectedIds.has(s.id)) ? "Deselect All" : "Select All Visible"}
                </button>

                <button
                  onClick={handleApplyFixes}
                  disabled={applying || selectedIds.size === 0}
                  className="px-5 py-2.5 rounded-[10px] text-[13px] font-bold text-white border-none cursor-pointer transition-all shadow-md"
                  style={{
                    background: "var(--green)",
                    opacity: applying || selectedIds.size === 0 ? 0.6 : 1,
                  }}
                >
                  {applying ? "Applying Fixes..." : `⚡ Apply ${selectedIds.size} AI Fixes (1-Click Agentic Clean)`}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

