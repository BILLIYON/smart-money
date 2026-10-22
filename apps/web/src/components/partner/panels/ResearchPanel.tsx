"use client";

import { useState } from "react";
import { SectionHeader } from "../shared";

const RESEARCH_MODELS = ["Claude 3.5 Sonnet", "GPT-4o", "Gemini 2.5 Flash", "Groq Llama 3.3 70B"];

const RESEARCH_QUICK_PROMPTS = [
  { label: "MMF Comparison", prompt: "Compare ARM Money Market Fund vs Stanbic IBTC MMF vs Cowrywise Dollar Fund returns for 2026 YTD. Include current yield rates and liquidity terms." },
  { label: "Macro Brief", prompt: "What are the key macroeconomic signals in Nigeria right now that a wealth advisor should be discussing with clients? Include CBN rate decisions, inflation trend, and naira stability." },
  { label: "Lagos Property", prompt: "Summarise the current Lagos real estate market: price trends by area (Ikoyi, Lekki, VI, Ajah), rental yields, and outlook for 2026. Use recent data." },
];

export function ResearchPanel() {
  const [model, setModel] = useState(RESEARCH_MODELS[0]);
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [briefing, setBriefing] = useState<any | null>(null);

  const handleRunResearch = async () => {
    if (!prompt.trim()) return;

    setRunning(true);
    try {
      const res = await fetch("/api/partner/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model }),
      });

      const data = await res.json();
      if (res.ok && data.briefing) {
        setBriefing(data.briefing);
      }
    } catch (err) {
      console.error("[ResearchPanel] Research execution error:", err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <SectionHeader
        title="🔬 AI"
        emphasis="Research Workspace"
        action={<div className="text-[12px]" style={{ color: "var(--muted)" }}>Your private institutional AI co-pilot for macro and portfolio research</div>}
      />

      <div className="rounded-[16px] p-5 mb-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="mb-[14px]">
          <div className="text-[12px] font-semibold uppercase tracking-[.5px] mb-2" style={{ color: "var(--muted)" }}>Select AI Model</div>
          <div className="flex gap-2 flex-wrap">
            {RESEARCH_MODELS.map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className="px-[14px] py-[6px] rounded-full text-[12px] font-semibold border cursor-pointer transition-all"
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
              disabled={running || !prompt.trim()}
              onClick={handleRunResearch}
              className="px-5 py-[8px] rounded-[8px] text-[12px] font-semibold text-white border-none cursor-pointer hover:bg-emerald-600 transition-all shadow"
              style={{ background: "var(--green)" }}
            >
              {running ? "Analyzing Market Data..." : "Run Research →"}
            </button>
            {RESEARCH_QUICK_PROMPTS.map((q) => (
              <button
                key={q.label}
                onClick={() => setPrompt(q.prompt)}
                className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold border cursor-pointer hover:bg-neutral-800 transition-all"
                style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {briefing && (
        <div className="rounded-[16px] p-6 border animate-in fade-in duration-300" style={{ background: "var(--navy2)", borderColor: "rgba(0,196,140,.35)" }}>
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[18px]">📊</span>
              <h4 className="text-[15px] font-bold text-white">{briefing.title}</h4>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">
              {briefing.model}
            </span>
          </div>

          <p className="text-[13px] text-zinc-300 leading-relaxed mb-4 italic">
            &ldquo;{briefing.summary}&rdquo;
          </p>

          <div className="mb-4">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-2">
              Key Institutional Findings
            </h5>
            <div className="flex flex-col gap-2">
              {briefing.keyFindings.map((finding: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2 p-2.5 rounded-[8px] text-[12px] text-zinc-200" style={{ background: "var(--bg)" }}>
                  <span className="text-emerald-400 font-bold">#{idx + 1}</span>
                  <span>{finding}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-[10px] bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
              Actionable Portfolio Recommendation
            </span>
            <div className="text-[13px] text-white font-medium">
              {briefing.actionableRecommendation}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
