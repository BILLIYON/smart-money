"use client";

import { useState, useEffect } from "react";
import { calculateOpportunityStats, type Opportunity } from "@/types/opportunities";
import { OpportunityCard } from "./OpportunityCard";

function StatCard({ label, value, change, changeUp }: { label: string; value: string; change: string; changeUp?: boolean }) {
  return (
    <div className="rounded-[14px] p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="text-[26px] font-bold mb-1" style={{ color: "var(--text)", fontFamily: "var(--font-dm-serif)" }}>{value}</div>
      <div className="text-[11px] font-medium" style={{ color: changeUp ? "var(--green2)" : "var(--muted)" }}>{change}</div>
    </div>
  );
}

function OpportunitySkeleton() {
  return (
    <div
      className="rounded-[14px] p-5 animate-pulse"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-[9px] bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 w-1/4 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-2 w-1/6 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
      <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
      <div className="h-12 rounded bg-slate-200 dark:bg-slate-700 mb-3" />
      <div className="flex justify-between items-center">
        <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}

export function OpportunitiesPanel() {
  const [oppList, setOppList] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadOpportunities() {
      try {
        const res = await fetch("/api/opportunities");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setOppList(Array.isArray(data.opportunities) ? data.opportunities : []);
          }
        }
      } catch (err) {
        console.warn("[OpportunitiesPanel] Error fetching opportunities:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadOpportunities();
    return () => {
      isMounted = false;
    };
  }, []);

  const stats = calculateOpportunityStats(oppList);
  const active = oppList.filter((o) => o.status === "active");
  const resolved = oppList.filter((o) => o.status !== "active");

  const handleUpdateStatus = async (id: string, newStatus: "acted" | "dismissed") => {
    // Optimistic update
    setOppList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    try {
      await fetch(`/api/opportunities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error("[OpportunitiesPanel] Failed to update opportunity status:", err);
    }
  };

  return (
    <div>
      <div
        className="inline-flex items-center gap-2 px-3 py-[6px] rounded-full text-[12px] font-medium mb-6"
        style={{ background: "rgba(74,144,217,.1)", border: "1px solid rgba(74,144,217,.25)", color: "#4A90D9" }}
      >
        💡 Your wealth advisors and AI buddies surface time-sensitive opportunities here — T-bills, MMF tranches, and equity ideas matching your portfolio
      </div>

      <div className="grid gap-4 mb-7" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        <StatCard label="Active Opportunities" value={String(stats.active)} change={stats.active > 0 ? "Waiting on you" : "None right now"} changeUp={stats.active > 0} />
        <StatCard label="Acted On" value={String(stats.acted)} change="This tracking period" changeUp={stats.acted > 0} />
        <StatCard label="Missed" value={String(stats.missed)} change={stats.missed > 0 ? "Window closed before you acted" : "None missed"} />
        <StatCard label="Total Surfaced" value={String(stats.total)} change="From partners & AI" />
      </div>

      {loading ? (
        <div className="space-y-4">
          <OpportunitySkeleton />
          <OpportunitySkeleton />
        </div>
      ) : oppList.length === 0 ? (
        <div
          className="rounded-[16px] p-10 text-center border"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="text-[32px] mb-3">💡</div>
          <div className="text-[15px] font-semibold mb-1" style={{ color: "var(--text)" }}>
            No Opportunities Surfaced Yet
          </div>
          <div className="text-[12px] max-w-[420px] mx-auto leading-relaxed" style={{ color: "var(--muted)" }}>
            Your AI financial buddies and connected partner advisors analyze your transactions, savings rates, and market yields in real-time. When timely opportunities match your financial goals, they will appear here.
          </div>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <>
              <div className="text-[13px] font-semibold uppercase tracking-[.5px] mb-3" style={{ color: "var(--muted)" }}>
                Needs Your Attention
              </div>
              <div className="flex flex-col gap-4 mb-8">
                {active.map((o) => (
                  <OpportunityCard key={o.id} opp={o} onUpdateStatus={handleUpdateStatus} />
                ))}
              </div>
            </>
          )}

          {resolved.length > 0 && (
            <>
              <div className="text-[13px] font-semibold uppercase tracking-[.5px] mb-3" style={{ color: "var(--muted)" }}>
                History
              </div>
              <div className="flex flex-col gap-4">
                {resolved.map((o) => (
                  <OpportunityCard key={o.id} opp={o} onUpdateStatus={handleUpdateStatus} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
