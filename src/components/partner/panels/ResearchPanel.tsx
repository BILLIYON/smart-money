"use client";

import { useState } from "react";
import { SectionHeader, comingSoon } from "../shared";
import { RESEARCH_MODELS, RESEARCH_QUICK_PROMPTS } from "../mockData";

export function ResearchPanel() {
  const [model, setModel] = useState(RESEARCH_MODELS[0]);
  const [prompt, setPrompt] = useState("");

  return (
    <div>
      <SectionHeader
        title="🔬 AI"
        emphasis="Research Workspace"
        action={<div className="text-[12px]" style={{ color: "var(--muted)" }}>Your private AI co-pilot for market research and client analysis</div>}
      />

      <div className="rounded-[16px] p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="mb-[14px]">
          <div className="text-[12px] font-semibold uppercase tracking-[.5px] mb-2" style={{ color: "var(--muted)" }}>Select AI Model</div>
          <div className="flex gap-2 flex-wrap">
            {RESEARCH_MODELS.map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className="px-[14px] py-[6px] rounded-full text-[12px] font-semibold border"
                style={
                  m === model
                    ? { borderColor: "var(--green)", color: "var(--green)", background: "rgba(0,196,140,.08)" }
                    : { background: "transparent", color: "var(--muted)", borderColor: "var(--border)" }
                }
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <div className="text-[12px] font-semibold uppercase tracking-[.5px] mb-2" style={{ color: "var(--muted)" }}>Research Prompt</div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="e.g. 'Analyse the current NGX banking sector — P/E ratios, dividend yields, YTD performance, and which stocks are undervalued vs the 5-year average.'"
            className="w-full rounded-[10px] px-[14px] py-3 text-[13px] outline-none resize-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
          />
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <button
              onClick={() => comingSoon("Running AI research")}
              className="px-4 py-[7px] rounded-[8px] text-[12px] font-semibold text-white border-none"
              style={{ background: "var(--green)" }}
            >
              Run Research →
            </button>
            {RESEARCH_QUICK_PROMPTS.map((q) => (
              <button
                key={q.label}
                onClick={() => setPrompt(q.prompt)}
                className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold border"
                style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
