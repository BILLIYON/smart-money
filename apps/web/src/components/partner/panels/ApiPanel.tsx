"use client";

import { useState } from "react";
import { SectionHeader, comingSoon } from "../shared";
import { API_ENDPOINTS, type ApiEndpoint } from "../mockData";

const METHOD_STYLES: Record<ApiEndpoint["method"], { bg: string; color: string }> = {
  GET: { bg: "rgba(0,196,140,.12)", color: "var(--green2)" },
  POST: { bg: "rgba(74,144,217,.12)", color: "#4A90D9" },
  PATCH: { bg: "rgba(245,166,35,.12)", color: "#C47F00" },
};

function EndpointCard({ ep }: { ep: ApiEndpoint }) {
  const [open, setOpen] = useState(false);
  const m = METHOD_STYLES[ep.method];
  return (
    <div className="rounded-[12px] overflow-hidden mb-[10px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div onClick={() => setOpen(!open)} className="flex items-center gap-3 px-4 py-[14px] cursor-pointer">
        <span className="px-[9px] py-1 rounded-[6px] text-[11px] font-bold" style={{ background: m.bg, color: m.color, fontFamily: "monospace" }}>{ep.method}</span>
        <span className="text-[13px] font-semibold" style={{ color: "var(--text)", fontFamily: "monospace" }}>{ep.path}</span>
        <span className="text-[12px] ml-auto" style={{ color: "var(--muted)" }}>{ep.desc}</span>
        <span style={{ color: "var(--muted)", fontSize: 16 }}>{open ? "˅" : "›"}</span>
      </div>
      {open && (
        <div className="px-[18px] py-4" style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
          <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2" style={{ color: "var(--muted)" }}>
            {ep.method === "GET" ? "Query Parameters" : ep.path.includes("webhooks") ? "Available Event Types" : "Request Body"}
          </div>
          {ep.params.map((p) => (
            <div key={p.name} className="flex flex-wrap items-start gap-[10px] py-[7px] text-[12px]" style={{ borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#4A90D9", minWidth: 150 }}>{p.name}</span>
              <span style={{ color: "var(--gold)", minWidth: 60 }}>{p.type}</span>
              {p.req && <span style={{ color: "#E24B4A", fontSize: 10, fontWeight: 600, minWidth: 50 }}>{p.req}</span>}
              <span style={{ color: "var(--muted)", flex: 1 }}>{p.desc}</span>
            </div>
          ))}
          {ep.example && (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-[.5px] mt-3 mb-2" style={{ color: "var(--muted)" }}>Example Response</div>
              <div className="rounded-[8px] px-[14px] py-3 text-[12px] overflow-x-auto" style={{ background: "var(--card)", border: "1px solid var(--border)", fontFamily: "monospace", color: "var(--text)" }}>
                {ep.example}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ApiPanel() {
  return (
    <div>
      <SectionHeader
        title="📡 API &"
        emphasis="Documentation"
        action={
          <div className="flex gap-2">
            <button onClick={() => comingSoon("Opening full API docs")} className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold border" style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}>Full Docs ↗</button>
            <button onClick={() => comingSoon("Generating an API key")} className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold text-white border-none" style={{ background: "var(--green)" }}>Generate API Key</button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div className="rounded-[12px] px-4 py-[14px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="text-[11px] uppercase tracking-[.5px] mb-[6px]" style={{ color: "var(--muted)" }}>Your API Key</div>
          <div className="text-[13px] mb-2" style={{ fontFamily: "monospace", color: "var(--text)" }}>Not generated yet</div>
          <button onClick={() => comingSoon("Generating an API key")} className="px-3 py-[6px] rounded-[8px] text-[11px] font-semibold border" style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}>Generate</button>
        </div>
        <div className="rounded-[12px] px-4 py-[14px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="text-[11px] uppercase tracking-[.5px] mb-[6px]" style={{ color: "var(--muted)" }}>Base URL</div>
          <div className="text-[13px] mb-2" style={{ fontFamily: "monospace", color: "var(--text)" }}>https://api.smartmoney.technology/v1/partner/</div>
          <div className="text-[11px]" style={{ color: "var(--muted)" }}>Rate limit: 1,000 req/min · Auth: Bearer token</div>
        </div>
      </div>

      <div className="text-[13px] font-semibold mb-3" style={{ color: "var(--text)" }}>Endpoints</div>
      {API_ENDPOINTS.map((ep) => <EndpointCard key={ep.path + ep.method} ep={ep} />)}
    </div>
  );
}
