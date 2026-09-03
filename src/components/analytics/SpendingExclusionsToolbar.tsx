"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDatabankStore } from "@/store/databankStore";

export type SpendingExclusions = {
  categories: string[];
  platforms: string[];
  keywords: string[];
  types: string[];
};

const KNOWN_PLATFORMS = [
  { id: "Paystack", name: "Paystack", icon: "🟣", color: "#00C3F8" },
  { id: "OPay", name: "OPay", icon: "🔴", color: "#00B875" },
  { id: "PalmPay", name: "PalmPay", icon: "🌴", color: "#6C38FF" },
  { id: "Moniepoint", name: "Moniepoint", icon: "🔵", color: "#0284C7" },
  { id: "Kuda Bank", name: "Kuda Bank", icon: "🟢", color: "#8B5CF6" },
  { id: "GTBank", name: "GTBank", icon: "🟠", color: "#DD4F05" },
  { id: "UBA", name: "UBA", icon: "🔴", color: "#D71921" },
  { id: "Zenith", name: "Zenith Bank", icon: "🏛️", color: "#DC2626" },
  { id: "Access Bank", name: "Access Bank", icon: "🏦", color: "#0284C7" },
];

export function SpendingExclusionsToolbar({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { loadContext } = useDatabankStore();
  const [isOpen, setIsOpen] = useState(!compact);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [exclusions, setExclusions] = useState<SpendingExclusions>({
    categories: [],
    platforms: [],
    keywords: [],
    types: [],
  });

  const [detectedCategories, setDetectedCategories] = useState<string[]>([]);
  const [detectedPlatforms, setDetectedPlatforms] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState("");

  // Load existing exclusions and candidate categories & platforms
  const fetchExclusions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/analytics/exclusions");
      if (res.ok) {
        const data = await res.json();
        setExclusions(
          data.exclusions || { categories: [], platforms: [], keywords: [], types: [] }
        );
        setDetectedCategories(data.detectedCategories || []);
        setDetectedPlatforms(data.detectedPlatforms || []);
      }
    } catch (err) {
      console.error("[SpendingExclusionsToolbar] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExclusions();
  }, [fetchExclusions]);

  // Save exclusions to backend and trigger context recalculation
  const saveExclusions = async (updated: SpendingExclusions) => {
    setSaving(true);
    setExclusions(updated);
    try {
      const res = await fetch("/api/analytics/exclusions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        await loadContext();
      }
    } catch (err) {
      console.error("[SpendingExclusionsToolbar] save error:", err);
    } finally {
      setSaving(false);
    }
  };

  // Toggle platform exclusion
  const togglePlatform = (plat: string) => {
    const exists = exclusions.platforms.some(
      (p) => p.toLowerCase() === plat.toLowerCase()
    );
    const newPlatforms = exists
      ? exclusions.platforms.filter(
          (p) => p.toLowerCase() !== plat.toLowerCase()
        )
      : [...exclusions.platforms, plat];

    saveExclusions({ ...exclusions, platforms: newPlatforms });
  };

  // Toggle category exclusion
  const toggleCategory = (cat: string) => {
    const exists = exclusions.categories.some(
      (c) => c.toLowerCase() === cat.toLowerCase()
    );
    const newCategories = exists
      ? exclusions.categories.filter(
          (c) => c.toLowerCase() !== cat.toLowerCase()
        )
      : [...exclusions.categories, cat];

    saveExclusions({ ...exclusions, categories: newCategories });
  };

  // Add custom keyword exclusion
  const addKeyword = () => {
    const kw = customKeyword.trim();
    if (!kw) return;
    if (
      exclusions.keywords.some(
        (k) => k.toLowerCase() === kw.toLowerCase()
      )
    ) {
      setCustomKeyword("");
      return;
    }
    const newKeywords = [...exclusions.keywords, kw];
    setCustomKeyword("");
    saveExclusions({ ...exclusions, keywords: newKeywords });
  };

  // Remove keyword exclusion
  const removeKeyword = (kw: string) => {
    const newKeywords = exclusions.keywords.filter(
      (k) => k.toLowerCase() !== kw.toLowerCase()
    );
    saveExclusions({ ...exclusions, keywords: newKeywords });
  };

  // Toggle transaction type exclusion
  const toggleType = (typeKey: string) => {
    const exists = exclusions.types.includes(typeKey);
    const newTypes = exists
      ? exclusions.types.filter((t) => t !== typeKey)
      : [...exclusions.types, typeKey];

    saveExclusions({ ...exclusions, types: newTypes });
  };

  // Clear all exclusions
  const clearAll = () => {
    saveExclusions({ categories: [], platforms: [], keywords: [], types: [] });
  };

  const totalExclusionsCount =
    exclusions.platforms.length +
    exclusions.categories.length +
    exclusions.keywords.length +
    exclusions.types.length;

  // Build merged platform list
  const allPlatforms = Array.from(
    new Set([
      "Paystack",
      "OPay",
      "PalmPay",
      "Moniepoint",
      "GTBank",
      "Kuda Bank",
      "UBA",
      ...detectedPlatforms,
    ])
  );

  const allCategories = Array.from(
    new Set([
      "Transfers",
      "Subscriptions",
      ...detectedCategories,
    ])
  );

  return (
    <div
      className="rounded-[14px] p-4 transition-all duration-200"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
      }}
    >
      {/* ── HEADER STRIP ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold" style={{ color: "var(--text)" }}>
              ⚙️ Spending Analytics Exclusion Filter
            </span>
            {totalExclusionsCount > 0 ? (
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1"
                style={{
                  background: "rgba(226,75,74,0.12)",
                  color: "#E24B4A",
                  border: "1px solid rgba(226,75,74,0.3)",
                }}
              >
                <span>🚫</span>
                <span>{totalExclusionsCount} Excluded ({[
                  ...exclusions.platforms,
                  ...exclusions.categories,
                  ...exclusions.keywords
                ].slice(0, 2).join(", ")}{totalExclusionsCount > 2 ? "..." : ""})</span>
              </span>
            ) : (
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                style={{
                  background: "rgba(0,196,140,0.1)",
                  color: "var(--green, #00C48C)",
                }}
              >
                ✨ 100% of Transactions Included in Analytics
              </span>
            )}
          </div>
          {saving && (
            <span className="text-[11px] animate-pulse" style={{ color: "var(--muted)" }}>
              Recalculating analytics in real-time...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {totalExclusionsCount > 0 && (
            <button
              onClick={clearAll}
              className="text-[11px] font-medium px-2.5 py-1 rounded-[6px] transition-all cursor-pointer hover:opacity-80"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--muted)",
              }}
            >
              Reset All
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-semibold cursor-pointer transition-all hover:opacity-90"
            style={{
              background: isOpen ? "var(--border)" : "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <span>{isOpen ? "Collapse Filter Bar" : "Select Payment Platforms to Exclude"}</span>
            <span>{isOpen ? "▲" : "▼"}</span>
          </button>
        </div>
      </div>

      {/* ── EXPANDABLE EXCLUSIONS DRAWER ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-3 pt-3 flex flex-col gap-4 text-[12px]"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
              Click any payment platform (<strong>Paystack</strong>, <strong>OPay</strong>, <strong>PalmPay</strong>, <strong>GTBank</strong>, etc.) or category to immediately exclude/include them from your <strong>Spending Analytics</strong> charts, savings rate, and AI Buddy prompts.
            </p>

            {/* 1. PAYMENT PLATFORM / PROVIDER LABELS */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center justify-between" style={{ color: "var(--muted)" }}>
                <span>💳 Payment Platforms & Providers</span>
                <span className="text-[10px] font-normal lowercase" style={{ color: "var(--muted)" }}>
                  Click to toggle exclusion
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {allPlatforms.map((plat) => {
                  const isExcluded = exclusions.platforms.some(
                    (p) => p.toLowerCase() === plat.toLowerCase()
                  );
                  const matchedKnown = KNOWN_PLATFORMS.find(
                    (k) => k.name.toLowerCase() === plat.toLowerCase() || k.id.toLowerCase() === plat.toLowerCase()
                  );
                  const icon = matchedKnown?.icon || "🏦";

                  return (
                    <button
                      key={plat}
                      onClick={() => togglePlatform(plat)}
                      className="px-3 py-1.5 rounded-[9px] text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                      style={{
                        background: isExcluded ? "rgba(226,75,74,0.12)" : "var(--bg)",
                        color: isExcluded ? "#E24B4A" : "var(--text)",
                        border: "1px solid",
                        borderColor: isExcluded ? "rgba(226,75,74,0.45)" : "var(--border)",
                      }}
                    >
                      <span className="text-[14px]">{icon}</span>
                      <span>{plat}</span>
                      <span
                        className="text-[10px] px-1.5 py-0.2 rounded font-bold"
                        style={{
                          background: isExcluded ? "#E24B4A" : "rgba(0,196,140,0.15)",
                          color: isExcluded ? "#ffffff" : "var(--green, #00A677)",
                        }}
                      >
                        {isExcluded ? "🚫 Excluded" : "✓ Active"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. TRANSACTION CATEGORIES */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
                🏷️ Transaction Categories
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allCategories.map((cat) => {
                  const isExcluded = exclusions.categories.some(
                    (c) => c.toLowerCase() === cat.toLowerCase()
                  );
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className="px-2.5 py-1 rounded-[7px] text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5"
                      style={{
                        background: isExcluded ? "rgba(226,75,74,0.12)" : "var(--bg)",
                        color: isExcluded ? "#E24B4A" : "var(--text)",
                        border: "1px solid",
                        borderColor: isExcluded ? "rgba(226,75,74,0.4)" : "var(--border)",
                        fontWeight: isExcluded ? 700 : 500,
                      }}
                    >
                      <span>{isExcluded ? "🚫" : "+"}</span>
                      <span>{cat}</span>
                      {isExcluded && <span className="text-[10px]">✕</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. TRANSACTION TYPES & CUSTOM KEYWORD */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Type Toggles */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
                  🔄 Transaction Types
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "subscription", label: "Subscriptions 🔄" },
                    { id: "asset", label: "Asset Inflows 💎" },
                    { id: "debt", label: "Debt Repayments ⚠️" },
                  ].map((typeItem) => {
                    const isExcluded = exclusions.types.includes(typeItem.id);
                    return (
                      <button
                        key={typeItem.id}
                        onClick={() => toggleType(typeItem.id)}
                        className="px-2.5 py-1 rounded-[7px] text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5"
                        style={{
                          background: isExcluded ? "rgba(226,75,74,0.12)" : "var(--bg)",
                          color: isExcluded ? "#E24B4A" : "var(--text)",
                          border: "1px solid",
                          borderColor: isExcluded ? "rgba(226,75,74,0.4)" : "var(--border)",
                        }}
                      >
                        <span>{isExcluded ? "🚫" : "+"}</span>
                        <span>{typeItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Keyword / Merchant Input */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
                  🔍 Custom Keyword / Narration
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                    placeholder="e.g. POS Transfer, Betting, Loan, Forex..."
                    className="flex-1 px-3 py-1.5 rounded-[8px] text-[12px] focus:outline-none"
                    style={{
                      background: "var(--input-bg, var(--bg))",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  />
                  <button
                    onClick={addKeyword}
                    disabled={!customKeyword.trim()}
                    className="px-3 py-1.5 rounded-[8px] text-[11px] font-semibold disabled:opacity-40 cursor-pointer hover:opacity-90 whitespace-nowrap"
                    style={{
                      background: "var(--green, #00C48C)",
                      color: "#0B0E17",
                    }}
                  >
                    + Exclude
                  </button>
                </div>

                {exclusions.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {exclusions.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[11px] font-medium"
                        style={{
                          background: "rgba(245,166,35,0.12)",
                          color: "#D35400",
                          border: "1px solid rgba(245,166,35,0.3)",
                        }}
                      >
                        <span>🚫 &ldquo;{kw}&rdquo;</span>
                        <button
                          onClick={() => removeKeyword(kw)}
                          className="ml-1 text-[11px] font-bold cursor-pointer hover:opacity-70"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
