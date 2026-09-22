"use client";

import { OPPORTUNITIES, opportunityStats } from "./mockData";
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

export function OpportunitiesPanel() {
  const stats = opportunityStats(OPPORTUNITIES);
  const active = OPPORTUNITIES.filter((o) => o.status === "active");
  const resolved = OPPORTUNITIES.filter((o) => o.status !== "active");

  return (
    <div>
      <div
        className="inline-flex items-center gap-2 px-3 py-[5px] rounded-full text-[11px] font-medium mb-6"
        style={{ background: "rgba(74,144,217,.1)", border: "1px solid rgba(74,144,217,.25)", color: "#4A90D9" }}
      >
        💡 Your AI buddies and partners surface time-sensitive opportunities here — investments, rate windows, deals matching what you've discussed
      </div>

      <div className="grid gap-4 mb-7" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        <StatCard label="Active Opportunities" value={String(stats.active)} change={stats.active > 0 ? "Waiting on you" : "None right now"} changeUp={stats.active > 0} />
        <StatCard label="Acted On" value={String(stats.acted)} change="This tracking period" changeUp={stats.acted > 0} />
        <StatCard label="Missed" value={String(stats.missed)} change={stats.missed > 0 ? "Window closed before you acted" : "None missed"} />
        <StatCard label="Total Surfaced" value={String(stats.total)} change="From buddies & partners" />
      </div>

      {active.length > 0 && (
        <>
          <div className="text-[13px] font-semibold uppercase tracking-[.5px] mb-3" style={{ color: "var(--muted)" }}>
            Needs Your Attention
          </div>
          <div className="flex flex-col gap-4 mb-8">
            {active.map((o) => <OpportunityCard key={o.id} opp={o} />)}
          </div>
        </>
      )}

      <div className="text-[13px] font-semibold uppercase tracking-[.5px] mb-3" style={{ color: "var(--muted)" }}>
        History
      </div>
      <div className="flex flex-col gap-4">
        {resolved.map((o) => <OpportunityCard key={o.id} opp={o} />)}
      </div>
    </div>
  );
}
