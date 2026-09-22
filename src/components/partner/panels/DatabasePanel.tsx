"use client";

import { SectionHeader, comingSoon } from "../shared";
import { BYOD_CONNECTION } from "../mockData";

export function DatabasePanel() {
  return (
    <div>
      <SectionHeader
        title="🗄️"
        emphasis="Database (BYOD)"
        action={
          <button
            onClick={() => comingSoon("Connecting a database")}
            className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold text-white border-none"
            style={{ background: "var(--green)" }}
          >
            + Connect Database
          </button>
        }
      />

      <div className="rounded-[10px] px-4 py-[14px] mb-5" style={{ background: "rgba(74,144,217,.05)", border: "1px solid rgba(74,144,217,.2)" }}>
        <div className="text-[13px] font-semibold mb-[6px]" style={{ color: "var(--text)" }}>Bring Your Own Database</div>
        <div className="text-[12px] leading-relaxed" style={{ color: "var(--muted)" }}>
          Your client financial data can live in your own infrastructure instead of shared Smart Money storage.
          Connections are encrypted and scoped to your organization only. Full data residency options (dedicated
          schema, dedicated instance) are on the roadmap — this panel shows what that configuration will look like.
        </div>
      </div>

      <div className="rounded-[12px] px-4 py-[14px] mb-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-[10px] mb-[6px]">
          <div className="rounded-[9px] flex items-center justify-center text-[16px]" style={{ width: 36, height: 36, background: "var(--navy)" }}>🐘</div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{BYOD_CONNECTION.name}</div>
            <div className="text-[10px]" style={{ color: "var(--muted)", fontFamily: "monospace" }}>{BYOD_CONNECTION.hostMasked}</div>
          </div>
          <span className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[11px] font-semibold" style={{ background: "rgba(0,196,140,.1)", color: "var(--green2)" }}>
            <span className="w-[7px] h-[7px] rounded-full animate-pulse" style={{ background: "var(--green)" }} />
            {BYOD_CONNECTION.status}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-[10px] mt-[10px]">
          <div className="rounded-[8px] px-[10px] py-2 text-[11px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div style={{ color: "var(--muted)" }}>Latency</div>
            <div className="font-semibold" style={{ color: "var(--green2)" }}>{BYOD_CONNECTION.latency}</div>
          </div>
          <div className="rounded-[8px] px-[10px] py-2 text-[11px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div style={{ color: "var(--muted)" }}>Records</div>
            <div className="font-semibold" style={{ color: "var(--text)" }}>{BYOD_CONNECTION.records}</div>
          </div>
          <div className="rounded-[8px] px-[10px] py-2 text-[11px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div style={{ color: "var(--muted)" }}>Last sync</div>
            <div className="font-semibold" style={{ color: "var(--text)" }}>{BYOD_CONNECTION.lastSync}</div>
          </div>
        </div>
        <div className="flex gap-2 mt-[10px]">
          <button onClick={() => comingSoon("Testing the connection")} className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold border" style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}>Test Connection</button>
          <button onClick={() => comingSoon("Viewing connection logs")} className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold border" style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}>View Logs</button>
          <button onClick={() => comingSoon("Disconnecting a database")} className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold border" style={{ color: "#E24B4A", borderColor: "#E24B4A" }}>Disconnect</button>
        </div>
      </div>

      <div
        onClick={() => comingSoon("Connecting another database")}
        className="rounded-[12px] p-6 text-center cursor-pointer border border-dashed"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="text-[24px] mb-2">+</div>
        <div className="text-[13px] font-semibold" style={{ color: "var(--muted)" }}>Add Another Database</div>
        <div className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>PostgreSQL · MySQL · MongoDB · Supabase · Firebase · AWS RDS</div>
      </div>
    </div>
  );
}
