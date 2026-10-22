"use client";

import { useEffect, useState, useMemo } from "react";
import { SectionHeader, InfoBanner, Toggle } from "../shared";
import toast from "react-hot-toast";

interface FeatureItem {
  id?: string;
  key: string;
  name: string;
  description: string;
  isEnabled: boolean;
}

const FEATURE_ICONS: Record<string, string> = {
  celebrity_simulations: "⭐",
  agentic_actions: "⚡",
  spending_analytics: "📊",
  group_chat: "👥",
  open_banking: "🏦",
  custom_signals: "📡",
  ai_studio: "🤖",
  goal_tracker: "🎯",
  salary_moment: "🔔",
  white_label: "🎨",
  marketplace: "📋",
  gamification: "🕹️",
};

export function FeatureControlPanel() {
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  useEffect(() => {
    async function loadFeatures() {
      try {
        setLoading(true);
        const res = await fetch("/api/partner/features");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.features)) {
            setFeatures(data.features);
          }
        }
      } catch (err) {
        console.error("Failed to load partner features:", err);
      } finally {
        setLoading(false);
      }
    }

    loadFeatures();
  }, []);

  const handleToggle = async (f: FeatureItem) => {
    const nextState = !f.isEnabled;
    setTogglingKey(f.key);

    // Optimistic UI update
    setFeatures((prev) =>
      prev.map((item) => (item.key === f.key ? { ...item, isEnabled: nextState } : item))
    );

    try {
      const res = await fetch("/api/partner/features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: f.key, isEnabled: nextState }),
      });

      if (!res.ok) {
        throw new Error("Failed to update feature");
      }

      toast.success(`${f.name} ${nextState ? "enabled" : "disabled"}`, {
        icon: nextState ? "✅" : "⚪",
      });
    } catch (err) {
      console.error(err);
      // Revert optimistic update
      setFeatures((prev) =>
        prev.map((item) => (item.key === f.key ? { ...item, isEnabled: !nextState } : item))
      );
      toast.error(`Could not update ${f.name}`);
    } finally {
      setTogglingKey(null);
    }
  };

  const filteredFeatures = useMemo(() => {
    if (!search.trim()) return features;
    const q = search.toLowerCase();
    return features.filter(
      (f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
    );
  }, [features, search]);

  const enabledCount = features.filter((f) => f.isEnabled).length;

  return (
    <div>
      <SectionHeader
        title="🎛️"
        emphasis="Feature Control"
        action={
          <div className="flex items-center gap-3">
            <span
              className="px-[10px] py-[3px] rounded-full text-[11px] font-semibold"
              style={{ background: "rgba(0,196,140,.1)", color: "var(--green2)" }}
            >
              {enabledCount} of {features.length} features active
            </span>
            <input
              type="text"
              placeholder="Search features..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-[12px] px-3 py-[6px] rounded-[8px] outline-none"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
        }
      />

      <InfoBanner tone="blue">
        💡 These settings apply to <strong style={{ color: "var(--text)" }}>all your clients</strong>. Changes take
        effect immediately in their application session and buddy prompts.
      </InfoBanner>

      {loading ? (
        <div className="text-center py-10 text-[13px]" style={{ color: "var(--muted)" }}>
          Loading partner feature policies...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredFeatures.map((f) => {
            const icon = FEATURE_ICONS[f.key] || "⚙️";
            return (
              <div
                key={f.key}
                className="rounded-[12px] px-4 py-[14px] flex items-start gap-3 transition-colors duration-150"
                style={{
                  background: "var(--bg)",
                  border: `1px solid ${f.isEnabled ? "var(--border)" : "rgba(255,255,255,0.05)"}`,
                  opacity: f.isEnabled ? 1 : 0.7,
                }}
              >
                <div className="text-[20px] flex-shrink-0 mt-[2px]">{icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13px] font-semibold truncate" style={{ color: "var(--text)" }}>
                      {f.name}
                    </div>
                    <Toggle on={f.isEnabled} onToggle={() => handleToggle(f)} />
                  </div>
                  <div className="text-[11px] leading-relaxed mt-1" style={{ color: "var(--muted)" }}>
                    {f.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
