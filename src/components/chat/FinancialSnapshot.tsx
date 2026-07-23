"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import React, { useEffect, useState } from "react";

type ActiveSource = {
  label: string;
  sub: string;
  active: boolean;
};

// Map of database source IDs to clean display names & subtypes
const STATIC_SOURCE_MAP: Record<string, { label: string; sub: string }> = {
  // Banks
  gtbank: { label: "GTBank alerts", sub: "Open Banking" },
  access: { label: "Access Bank", sub: "Open Banking" },
  zenith: { label: "Zenith Bank", sub: "Open Banking" },
  uba: { label: "UBA", sub: "Open Banking" },
  stanbic: { label: "Stanbic IBTC", sub: "Open Banking" },
  firstbank: { label: "First Bank", sub: "Open Banking" },

  // News
  nairametrics: { label: "Nairametrics", sub: "News" },
  businessday: { label: "BusinessDay NG", sub: "News" },
  reuters: { label: "Reuters Finance", sub: "News" },
  coindesk: { label: "CoinDesk", sub: "News" },
  bloomberg: { label: "Bloomberg", sub: "News" },

  // Newsletters
  "stears-weekly": { label: "Stears Weekly", sub: "Newsletter" },
  techcabal: { label: "TechCabal Daily", sub: "Newsletter" },
  hustle: { label: "The Hustle", sub: "Newsletter" },

  // Podcasts
  "stears-podcast": { label: "The Stears Podcast", sub: "Podcast" },
  wedontdostocks: { label: "We Don't Do Stocks", sub: "Podcast" },
  "planet-money": { label: "Planet Money (NPR)", sub: "Podcast" },
  "invest-like-the-best": { label: "Invest Like the Best", sub: "Podcast" },
};

export function FinancialSnapshot() {
  const [sources, setSources] = useState<ActiveSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function loadActiveContext() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setSources([]);
          setLoading(false);
          return;
        }

        // Fetch user integrations, enabled signals, and statement uploads in parallel
        const [integrationsRes, signalsRes, uploadsRes] = await Promise.all([
          supabase.from("user_integrations").select("provider").eq("user_id", user.id),
          supabase.from("user_signal_sources").select("source_id").eq("user_id", user.id).eq("enabled", true),
          supabase.from("databank_entries").select("metadata").eq("user_id", user.id).eq("source", "upload").limit(3),
        ]);

        const activeList: ActiveSource[] = [];

        // 1. Gmail Sync
        const hasGmail = integrationsRes.data?.some(i => i.provider === "gmail");
        if (hasGmail) {
          activeList.push({ label: "Gmail Sync", sub: "Auto-synced alerts", active: true });
        }

        // 2. Uploaded Bank Statements
        if (uploadsRes.data && uploadsRes.data.length > 0) {
          const uniqueNames = new Set<string>();
          uploadsRes.data.forEach((row) => {
            const meta = row.metadata as { fileName?: string } | null;
            if (meta?.fileName) {
              const name = meta.fileName.length > 18 ? meta.fileName.substring(0, 15) + "..." : meta.fileName;
              uniqueNames.add(name);
            }
          });

          if (uniqueNames.size > 0) {
            Array.from(uniqueNames).forEach((name) => {
              activeList.push({ label: name, sub: "Uploaded statement", active: true });
            });
          } else {
            activeList.push({ label: "Bank Statement", sub: "Uploaded", active: true });
          }
        }

        // 3. Signal Sources / Connected Banks
        if (signalsRes.data && signalsRes.data.length > 0) {
          signalsRes.data.forEach((row) => {
            const mapped = STATIC_SOURCE_MAP[row.source_id];
            if (mapped) {
              activeList.push({ label: mapped.label, sub: mapped.sub, active: true });
            } else if (row.source_id.startsWith("custom-")) {
              const name = row.source_id.replace("custom-", "").split("-")[0].toUpperCase();
              activeList.push({ label: `Custom ${name}`, sub: "Live Signal", active: true });
            }
          });
        }

        setSources(activeList);
      } catch (err) {
        console.error("Error loading FinancialSnapshot active context:", err);
      } finally {
        setLoading(false);
      }
    }

    loadActiveContext();
  }, []);

  return (
    <div
      className="mx-[10px] mb-[6px] rounded-[10px] border px-[12px] py-[8px] flex-shrink-0 transition-all duration-200"
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
    >
      {/* Clickable Toggle Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between cursor-pointer outline-none select-none text-left"
      >
        <div className="flex items-center gap-1.5">
          <span
            className="w-[6px] h-[6px] rounded-full flex-shrink-0"
            style={{ background: sources.length > 0 ? "var(--green)" : "var(--border)" }}
          />
          <span className="text-[10px] font-semibold uppercase tracking-[.5px]" style={{ color: "var(--muted)" }}>
            Active Context ({sources.length})
          </span>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-[2px] rounded" style={{ color: "var(--green2)", background: "rgba(0,196,140,0.1)" }}>
          {expanded ? "Hide ▲" : "Show ▼"}
        </span>
      </button>

      {/* Expandable Context List */}
      {expanded && (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          {loading ? (
            <div className="text-[11px] text-gray-400 py-1">Loading context...</div>
          ) : sources.length === 0 ? (
            <div className="flex items-center gap-[7px] py-[3px]">
              <span
                className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                style={{ background: "var(--border)" }}
              />
              <span className="text-[11px]" style={{ color: 'var(--muted)', opacity: 0.5 }}>
                <strong style={{ color: "var(--muted)", fontWeight: 500 }}>No active context</strong>
                {" · "}Go to Databank
              </span>
            </div>
          ) : (
            <div className="max-h-[160px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
              {sources.map((src, i) => (
                <div key={`${src.label}-${i}`} className="flex items-center gap-[7px] py-[3px]">
                  <span
                    className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                    style={{ background: src.active ? "var(--green)" : "var(--border)" }}
                  />
                  <span
                    className="text-[11px] truncate max-w-[170px]"
                    style={{ color: "var(--muted)", opacity: src.active ? 1 : 0.5 }}
                    title={`${src.label} · ${src.sub}`}
                  >
                    <strong style={{ color: src.active ? "var(--text)" : "var(--muted)", fontWeight: 500 }}>
                      {src.label}
                    </strong>
                    {" · "}{src.sub}
                  </span>
                </div>
              ))}
            </div>
          )}

          <Link
            href="/databank"
            className="block w-full mt-[8px] py-[6px] rounded-[8px] text-center text-[11px] border transition-colors duration-200"
            style={{ color: "var(--muted)", borderColor: "var(--border)", background: "transparent" }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.borderColor = "var(--green)";
              el.style.color = "var(--green)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.borderColor = "var(--border)";
              el.style.color = "var(--muted)";
            }}
          >
            Manage DataBank →
          </Link>
        </div>
      )}
    </div>
  );
}
