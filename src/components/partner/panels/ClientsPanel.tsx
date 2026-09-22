"use client";

import { useState } from "react";
import { SectionHeader, Avatar, StatusPill, comingSoon, Card } from "../shared";
import { CLIENTS, type ClientRow } from "../mockData";

function HealthBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-[6px] w-20 rounded-[3px] overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-[3px]" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[12px] font-semibold" style={{ color }}>{score}</span>
    </div>
  );
}

export function ClientsPanel() {
  const [selected, setSelected] = useState<ClientRow | null>(null);

  return (
    <div>
      <SectionHeader
        title="All"
        emphasis="Clients"
        action={
          <div className="flex gap-2">
            <div
              className="flex items-center gap-2 rounded-[10px] px-[14px] py-2 w-[220px]"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <span style={{ color: "var(--muted)" }}>🔍</span>
              <input
                placeholder="Search clients..."
                className="border-none bg-transparent text-[13px] outline-none w-full"
                style={{ color: "var(--text)" }}
              />
            </div>
            <button
              onClick={() => comingSoon("Inviting a client")}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold text-white border-none"
              style={{ background: "var(--green)" }}
            >
              + Invite Client
            </button>
          </div>
        }
      />

      <div className="rounded-[16px] overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
              {["Client", "Health Score", "Net Worth", "Last Activity", "Data Shared", "Buddy", "Status", ""].map((h) => (
                <th key={h} className="text-[10px] font-bold uppercase tracking-[.5px] px-[14px] py-[10px] text-left whitespace-nowrap" style={{ color: "var(--muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CLIENTS.map((c) => (
              <tr key={c.name} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-[14px] py-3">
                  <div className="flex items-center gap-[10px]">
                    <Avatar initials={c.initials} color={c.color} />
                    <div>
                      <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{c.name}</div>
                      <div className="text-[11px]" style={{ color: "var(--muted)" }}>{c.joined}</div>
                    </div>
                  </div>
                </td>
                <td className="px-[14px] py-3"><HealthBar score={c.healthScore} color={c.healthColor} /></td>
                <td className="px-[14px] py-3 text-[13px] font-semibold" style={{ color: "var(--text)" }}>{c.netWorth}</td>
                <td className="px-[14px] py-3 text-[12px]" style={{ color: "var(--muted)" }}>{c.lastActivity}</td>
                <td className="px-[14px] py-3"><StatusPill label={c.dataShared} tone={c.dataShared === "Full access" ? "active" : "pending"} /></td>
                <td className="px-[14px] py-3 text-[12px]" style={{ color: "var(--text)" }}>{c.buddy}</td>
                <td className="px-[14px] py-3"><StatusPill label={c.status} tone={c.status === "Active" ? "active" : "pending"} /></td>
                <td className="px-[14px] py-3">
                  <button
                    onClick={() => setSelected(selected?.name === c.name ? null : c)}
                    className="px-[10px] py-[6px] rounded-[8px] text-[11px] font-semibold border"
                    style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="mt-6 rounded-[16px] overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div
            className="flex items-center gap-4 px-6 py-5"
            style={{ background: "linear-gradient(135deg,var(--navy),var(--navy2))" }}
          >
            <div className="rounded-full flex items-center justify-center font-bold text-white" style={{ width: 48, height: 48, background: "rgba(255,255,255,.15)", fontSize: 16 }}>
              {selected.initials}
            </div>
            <div className="flex-1">
              <div className="text-[18px] font-bold text-white">{selected.name}</div>
              <div className="text-[12px] mt-[2px]" style={{ color: "rgba(255,255,255,.5)" }}>
                {selected.joined} · Active {selected.lastActivity}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => comingSoon("Joining a client's chat")}
                className="px-3 py-[7px] rounded-[8px] text-[12px] font-semibold border"
                style={{ borderColor: "rgba(255,255,255,.2)", color: "rgba(255,255,255,.7)" }}
              >
                Join Chat
              </button>
              <button
                onClick={() => comingSoon("Writing a client goal")}
                className="px-3 py-[7px] rounded-[8px] text-[12px] font-semibold text-white border-none"
                style={{ background: "var(--green)" }}
              >
                Write Goal
              </button>
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-[7px] rounded-[8px] text-[12px] font-semibold border"
                style={{ borderColor: "rgba(255,255,255,.2)", color: "rgba(255,255,255,.7)" }}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-[16px] p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="text-[11px] uppercase tracking-[.5px] mb-1" style={{ color: "var(--muted)" }}>Health Score</div>
              <div className="text-[28px]" style={{ fontFamily: "var(--font-dm-serif)", color: "var(--green2)" }}>{selected.healthScore}</div>
            </div>
            <div className="rounded-[16px] p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="text-[11px] uppercase tracking-[.5px] mb-1" style={{ color: "var(--muted)" }}>Net Worth</div>
              <div className="text-[28px]" style={{ fontFamily: "var(--font-dm-serif)", color: "var(--text)" }}>{selected.netWorth}</div>
            </div>
            <div className="rounded-[16px] p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="text-[11px] uppercase tracking-[.5px] mb-1" style={{ color: "var(--muted)" }}>Data Shared</div>
              <div className="text-[16px] font-semibold mt-1" style={{ color: "var(--text)" }}>{selected.dataShared}</div>
            </div>
          </div>

          <div className="px-6 pb-6">
            <Card style={{ background: "var(--bg)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Advisor Notes</div>
                <span className="text-[10px] font-normal" style={{ color: "var(--muted)" }}>Private · Not visible to client</span>
              </div>
              <textarea
                placeholder="Add a note about this client..."
                className="w-full rounded-[8px] px-3 py-[9px] text-[13px] outline-none"
                style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", minHeight: 60 }}
              />
              <button
                onClick={() => comingSoon("Saving advisor notes")}
                className="mt-2 px-4 py-[7px] rounded-[8px] text-[12px] font-semibold text-white border-none"
                style={{ background: "var(--green)" }}
              >
                Save Note
              </button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
