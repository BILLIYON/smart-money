"use client";

import { useEffect, useState } from "react";
import { SectionHeader, InfoBanner, Toggle } from "../shared";
import toast from "react-hot-toast";

interface AnalyticsRule {
  id: string;
  name: string;
  formula: string;
  icon: string;
  isEnabled: boolean;
}

interface CategoryToggle {
  id: string;
  label: string;
  desc: string;
  isIncluded: boolean;
}

export function AnalyticsRulesPanel() {
  const [rules, setRules] = useState<AnalyticsRule[]>([]);
  const [categories, setCategories] = useState<CategoryToggle[]>([]);
  const [loading, setLoading] = useState(true);

  // Add rule modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleFormula, setNewRuleFormula] = useState("");
  const [newRuleIcon, setNewRuleIcon] = useState("📐");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch("/api/partner/analytics-rules");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.rules)) {
            setRules(data.rules);
          }
          if (Array.isArray(data.categories)) {
            setCategories(data.categories);
          }
        }
      } catch (err) {
        console.error("Failed to load analytics rules:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleToggleRule = async (rule: AnalyticsRule) => {
    const nextState = !rule.isEnabled;
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, isEnabled: nextState } : r))
    );

    try {
      const res = await fetch("/api/partner/analytics-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId: rule.id, isEnabled: nextState }),
      });
      if (!res.ok) throw new Error("Failed to update rule");
      toast.success(`${rule.name} ${nextState ? "activated" : "deactivated"}`);
    } catch (err) {
      console.error(err);
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, isEnabled: !nextState } : r))
      );
      toast.error(`Could not toggle ${rule.name}`);
    }
  };

  const handleToggleCategory = async (cat: CategoryToggle) => {
    const nextState = !cat.isIncluded;
    setCategories((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, isIncluded: nextState } : c))
    );

    try {
      const res = await fetch(`/api/partner/analytics-categories/${encodeURIComponent(cat.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isIncluded: nextState }),
      });
      if (!res.ok) throw new Error("Failed to update category toggle");
      toast.success(`${cat.label} ${nextState ? "included" : "excluded"}`);
    } catch (err) {
      console.error(err);
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, isIncluded: !nextState } : c))
      );
      toast.error(`Could not toggle ${cat.label}`);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newRuleFormula.trim()) {
      toast.error("Please enter both a rule name and formula");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/partner/analytics-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleName: newRuleName.trim(),
          formula: newRuleFormula.trim(),
          icon: newRuleIcon || "📐",
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create rule");
      }

      const data = await res.json();
      if (data.rule) {
        setRules((prev) => [...prev, data.rule]);
      }
      toast.success("Custom analytics rule added successfully!");
      setNewRuleName("");
      setNewRuleFormula("");
      setShowAddModal(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to add rule");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <SectionHeader
        title="⚙️"
        emphasis="Analytics Rules"
        action={
          <div className="text-[12px]" style={{ color: "var(--muted)" }}>
            Define custom financial calculation formulas and spend boundaries
          </div>
        }
      />

      <InfoBanner tone="gold">
        ⚙️ These rules govern calculations across your firm. Clients see metrics calculated according to your
        institutional wealth parameters in their Spending Analytics dashboard and quarterly reviews.
      </InfoBanner>

      {loading ? (
        <div className="text-center py-10 text-[13px]" style={{ color: "var(--muted)" }}>
          Loading custom analytics rules...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left Column: Active Rules */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>
                Active Custom Rules ({rules.length})
              </div>
            </div>

            <div className="space-y-[10px]">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="rounded-[10px] px-[14px] py-3 flex items-center gap-3 transition-colors"
                  style={{
                    background: "var(--bg)",
                    border: `1px solid ${r.isEnabled ? "var(--border)" : "rgba(255,255,255,0.05)"}`,
                    opacity: r.isEnabled ? 1 : 0.65,
                  }}
                >
                  <span className="text-[18px] flex-shrink-0">{r.icon || "⚙️"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold truncate" style={{ color: "var(--text)" }}>
                      {r.name}
                    </div>
                    <div
                      className="text-[11px] truncate mt-0.5"
                      style={{ color: "var(--muted)", fontFamily: "monospace" }}
                    >
                      {r.formula}
                    </div>
                  </div>
                  <Toggle on={r.isEnabled} onToggle={() => handleToggleRule(r)} />
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold border mt-3 transition hover:opacity-90"
              style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
            >
              + Add Custom Rule
            </button>
          </div>

          {/* Right Column: Category Inclusions */}
          <div>
            <div className="text-[15px] font-semibold mb-3" style={{ color: "var(--text)" }}>
              Included / Excluded Categories ({categories.length})
            </div>
            <div
              className="rounded-[12px] p-[14px]"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              {categories.map((t, i) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-[11px] gap-3"
                  style={{
                    borderBottom: i < categories.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium" style={{ color: "var(--text)" }}>
                      {t.label}
                    </div>
                    <div className="text-[11px] mt-[2px] leading-relaxed" style={{ color: "var(--muted)" }}>
                      {t.desc}
                    </div>
                  </div>
                  <Toggle on={t.isIncluded} onToggle={() => handleToggleCategory(t)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-[16px] p-6"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-semibold" style={{ color: "var(--text)" }}>
                Add Custom Analytics Rule
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[18px] text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRule} className="space-y-4">
              <div>
                <label className="text-[11px] uppercase font-semibold block mb-1" style={{ color: "var(--muted)" }}>
                  Rule Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Discretionary Inflow Ratio"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full text-[13px] px-3 py-2 rounded-[8px] outline-none"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                  required
                />
              </div>

              <div>
                <label className="text-[11px] uppercase font-semibold block mb-1" style={{ color: "var(--muted)" }}>
                  Calculation Formula
                </label>
                <input
                  type="text"
                  placeholder="e.g. (Total Inflows - Essential Expenses) / Total Inflows"
                  value={newRuleFormula}
                  onChange={(e) => setNewRuleFormula(e.target.value)}
                  className="w-full text-[13px] px-3 py-2 rounded-[8px] outline-none font-mono"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                  required
                />
              </div>

              <div>
                <label className="text-[11px] uppercase font-semibold block mb-1" style={{ color: "var(--muted)" }}>
                  Icon Emoji
                </label>
                <div className="flex items-center gap-2">
                  {["📐", "⚖️", "🛡️", "🏦", "📈", "🎯", "💡"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewRuleIcon(emoji)}
                      className="w-9 h-9 rounded-[8px] text-[16px] flex items-center justify-center border transition"
                      style={{
                        background: newRuleIcon === emoji ? "var(--green)" : "var(--bg)",
                        borderColor: newRuleIcon === emoji ? "var(--green)" : "var(--border)",
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-[8px] text-[12px] font-medium"
                  style={{ background: "transparent", color: "var(--muted)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-[8px] text-[12px] font-semibold text-white transition hover:opacity-95"
                  style={{ background: "var(--green)" }}
                >
                  {submitting ? "Saving..." : "Save Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
