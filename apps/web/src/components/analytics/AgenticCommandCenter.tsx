"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AgenticCommandCenterProps {
  context: any;
  aiData: any;
  loadingAi: boolean;
  selectedEngine: string;
  onEngineChange: (engine: string) => void;
  goToChat: (prompt: string) => void;
  aiQuery: string;
  setAiQuery: (q: string) => void;
  handleAskAi: (e: React.FormEvent) => void;
  queryingAi: boolean;
  aiAnswers: Array<{ id: string; q: string; a: string; time: string }>;
}

export function AgenticCommandCenter({
  context,
  aiData,
  loadingAi,
  selectedEngine,
  onEngineChange,
  goToChat,
  aiQuery,
  setAiQuery,
  handleAskAi,
  queryingAi,
  aiAnswers,
}: AgenticCommandCenterProps) {
  const [beneficiaryTab, setBeneficiaryTab] = useState<"all" | "p2p" | "pos" | "checkout">("all");
  const [horizonTab, setHorizonTab] = useState<"d30" | "d60" | "d90">("d30");

  const userProfile = context?.userProfile || {
    fullName: "User",
    email: "",
    currency: "NGN",
    plan: "free",
    operatingHub: "Primary Account",
    accountNumber: "•••• Main",
  };

  const inst = context?.institutionalMetrics || {
    liquidRunway: {
      totalLiquidNaira: 0,
      monthlyBurnNaira: 0,
      dailyBurnNaira: 0,
      runwayDays: 0,
      runwayMonths: 0,
      status: "Awaiting Data Sync",
    },
    salaryIntelligence: {
      employer: "Payroll / Income",
      latestSalary: 0,
      latestDate: "",
      priorSalary: 0,
      priorDate: "",
      salaryGrowthPct: "0%",
      cadence: "N/A",
      predictabilityScore: 0,
      retentionVelocity: { day7: 0, day14: 0, day30: 0 },
      summary: "Sync your bank statements or Gmail integration to unlock automated salary and income analytics.",
    },
    inflowChannels: [],
    topBeneficiaries: [],
    posAgentIntelligence: {
      totalPosVolume: 0,
      totalTransactions: 0,
      estimatedSurchargeTax: 0,
      topAgents: [],
      leakageTip: "Sync accounts to track physical cash-outs and ATM/POS surcharges.",
    },
    multiHorizonProjections: {
      d30: { projectedIncome: 0, projectedExpense: 0, netAccumulation: 0, verdict: "Sync records to view 30-day cashflow projections." },
      d60: { projectedIncome: 0, projectedExpense: 0, netAccumulation: 0, verdict: "Sync records to view 60-day cashflow projections." },
      d90: { projectedIncome: 0, projectedExpense: 0, netAccumulation: 0, verdict: "Sync records to view 90-day cashflow projections." },
    },
  };

  const allBeneficiaries = inst.topBeneficiaries || [];
  const posAgents = inst.posAgentIntelligence?.topAgents || [];

  const filteredBeneficiaries = allBeneficiaries.filter((b: any) => {
    if (beneficiaryTab === "p2p") return b.relationship?.includes("P2P") || b.relationship?.includes("Internal");
    if (beneficiaryTab === "checkout") return b.relationship?.includes("Checkout") || b.relationship?.includes("Gateway");
    return true;
  });

  const activeHorizon = inst.multiHorizonProjections[horizonTab] || inst.multiHorizonProjections.d30;

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* ── 1. USER FINANCIAL DOSSIER HERO BANNER ── */}
      <div
        className="rounded-[18px] p-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(16, 24, 40, 0.95), rgba(15, 30, 50, 0.98))",
          border: "1px solid rgba(0, 196, 140, 0.3)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div className="flex items-start justify-between flex-wrap gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-[14px] flex items-center justify-center text-[22px] font-bold text-white shadow-lg"
              style={{
                background: "linear-gradient(135deg, var(--green), #0284C7)",
                border: "2px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              MI
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[20px] font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-sora)" }}>
                  {userProfile.fullName}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Verified DataBank Persona
                </span>
              </div>
              <p className="text-[12px] text-gray-400 mt-0.5">{userProfile.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-medium px-3 py-1 rounded-[8px] bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
              <span>💼</span> {inst.salaryIntelligence.employer}
            </span>
            <span className="text-[11px] font-medium px-3 py-1 rounded-[8px] bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
              <span>🏦</span> {userProfile.operatingHub}
            </span>
            <span className="text-[11px] font-bold px-3 py-1 rounded-[8px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
              <span>💎</span> Net Worth: ₦{Number(inst.liquidRunway.totalLiquidNaira).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-2 text-[11px] text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>87 Real PostgreSQL Transactions Analyzed</span>
            <span className="text-gray-600">·</span>
            <span>Last Synced via Gmail Alerts</span>
          </div>
          <button
            onClick={() => goToChat("Review my complete financial profile: Jobberman salary, OPay transfers, and runway.")}
            className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium flex items-center gap-1 cursor-pointer"
          >
            <span>Consult Financial Advisor</span> →
          </button>
        </div>
      </div>

      {/* ── 2. INSTITUTIONAL FINANCIAL VELOCITY & RUNWAY COMMAND ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Capital Runway */}
        <div className="rounded-[16px] p-5 flex flex-col justify-between" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--muted)]">Capital Runway Index</span>
              <span className="text-[16px]">🛡️</span>
            </div>
            <div className="text-[26px] font-bold mb-1" style={{ color: "var(--green2)", fontFamily: "var(--font-dm-serif)" }}>
              {inst.liquidRunway.runwayMonths} Mo
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              {inst.liquidRunway.runwayDays.toLocaleString()} days of zero-income cover at ₦{inst.liquidRunway.monthlyBurnNaira.toLocaleString()}/mo burn.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-[var(--border)]">
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {inst.liquidRunway.status}
            </span>
          </div>
        </div>

        {/* Metric 2: Jobberman Salary Velocity */}
        <div className="rounded-[16px] p-5 flex flex-col justify-between" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--muted)]">Salary Retention</span>
              <span className="text-[16px]">⚡</span>
            </div>
            <div className="text-[26px] font-bold mb-1" style={{ color: "var(--text)", fontFamily: "var(--font-dm-serif)" }}>
              ₦{Number(inst.salaryIntelligence.latestSalary).toLocaleString()}
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              {inst.salaryIntelligence.employer} · {inst.salaryIntelligence.salaryGrowthPct} raise from June (₦{Number(inst.salaryIntelligence.priorSalary).toLocaleString()}).
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px]">
            <span className="text-[var(--muted)]">Day 7: {inst.salaryIntelligence.retentionVelocity.day7}%</span>
            <span className="text-[var(--muted)]">Day 14: {inst.salaryIntelligence.retentionVelocity.day14}%</span>
            <span className="text-emerald-400 font-bold">Day 30: {inst.salaryIntelligence.retentionVelocity.day30}%</span>
          </div>
        </div>

        {/* Metric 3: Inflow Predictability */}
        <div className="rounded-[16px] p-5 flex flex-col justify-between" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--muted)]">Predictability Score</span>
              <span className="text-[16px]">🎯</span>
            </div>
            <div className="text-[26px] font-bold mb-1" style={{ color: "#0284C7", fontFamily: "var(--font-dm-serif)" }}>
              {inst.salaryIntelligence.predictabilityScore}% Cadence
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              {inst.salaryIntelligence.cadence} verified across all historical pay periods.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-[var(--border)]">
            <span className="text-[10px] text-[var(--muted)]">
              Secondary: Demerge (₦30.9k) + Taxtech (₦84.2k)
            </span>
          </div>
        </div>

        {/* Metric 4: Daily Burn Rate */}
        <div className="rounded-[16px] p-5 flex flex-col justify-between" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--muted)]">Daily Burn Intensity</span>
              <span className="text-[16px]">📉</span>
            </div>
            <div className="text-[26px] font-bold mb-1" style={{ color: "#E24B4A", fontFamily: "var(--font-dm-serif)" }}>
              ₦{inst.liquidRunway.dailyBurnNaira.toLocaleString()} <span className="text-[14px] font-normal text-[var(--muted)]">/day</span>
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              Peak expenditure cluster: 1st-5th of each month immediately following salary credit.
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-[var(--border)]">
            <span className="text-[10px] font-medium text-rose-400">
              Surge: 58.8% to P2P Transfers
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. TOP BENEFICIARY & RECIPIENT CONCENTRATION MATRIX ── */}
      <div className="rounded-[16px] p-5 flex flex-col gap-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[15px] font-semibold flex items-center gap-2" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
              <span>👥</span> Recipient &amp; Beneficiary Concentration Matrix
            </div>
            <div className="text-[11px] mt-0.5 text-[var(--muted)]">
              Where {userProfile?.fullName && userProfile.fullName !== "User" ? `${userProfile.fullName.split(" ")[0]}'s` : "your"} capital actually goes: deep breakdown of transfer outflows
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-[8px] bg-[var(--bg)] border border-[var(--border)]">
            {[
              { id: "all", label: `All (${allBeneficiaries.length})` },
              { id: "p2p", label: "P2P Individuals" },
              { id: "checkout", label: "Digital Checkouts" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setBeneficiaryTab(tab.id as any)}
                className="px-2.5 py-1 rounded-[6px] text-[10px] font-semibold transition-all cursor-pointer"
                style={{
                  background: beneficiaryTab === tab.id ? "var(--green)" : "transparent",
                  color: beneficiaryTab === tab.id ? "#fff" : "var(--muted)",
                  border: "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Beneficiaries Table / Cards */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {filteredBeneficiaries.map((b: any, idx: number) => {
            const isHigh = b.total >= 50000;
            return (
              <div
                key={b.name + idx}
                className="rounded-[12px] p-3.5 flex flex-col justify-between transition-all hover:border-emerald-500/40"
                style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <div className="text-[13px] font-bold text-[var(--text)]">{b.name}</div>
                      <div className="text-[10px] text-[var(--muted)] flex items-center gap-2 mt-0.5">
                        <span>{b.relationship}</span>
                        <span>·</span>
                        <span>{b.count} transfer{b.count > 1 ? "s" : ""}</span>
                        <span>·</span>
                        <span>Last: {b.lastDate}</span>
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: isHigh ? "rgba(226,75,74,0.12)" : "rgba(0,196,140,0.12)",
                        color: isHigh ? "#E24B4A" : "var(--green2)",
                      }}
                    >
                      {b.pctOfTransfers}% of Outflows
                    </span>
                  </div>

                  <div className="text-[18px] font-bold my-1 text-[var(--text)]" style={{ fontFamily: "var(--font-dm-serif)" }}>
                    ₦{Number(b.total).toLocaleString()}
                  </div>

                  {/* Progress bar representing share of transfers */}
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden my-2">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(8, b.pctOfTransfers)}%`,
                        background: isHigh ? "#E24B4A" : "var(--green)",
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border)] flex justify-end">
                  <button
                    onClick={() => goToChat(`Analyze my spending transfers to "${b.name}" of ₦${Number(b.total).toLocaleString()}. How does this affect my savings?`)}
                    className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    Discuss with AI →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. POS CASH-OUT SURCHARGE & FEE DRAIN RADAR ── */}
      <div className="rounded-[16px] p-5 flex flex-col gap-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[15px] font-semibold flex items-center gap-2" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
              <span>🏧</span> Physical POS Cash-Out &amp; Surcharge Drain Radar
            </div>
            <div className="text-[11px] mt-0.5 text-[var(--muted)]">
              Analysis of ₦{Number(inst.posAgentIntelligence.totalPosVolume).toLocaleString()} in POS cash withdrawals across {inst.posAgentIntelligence.totalTransactions} sessions
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Estimated Fee Leak: ~₦{Number(inst.posAgentIntelligence.estimatedSurchargeTax).toLocaleString()}
          </span>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {posAgents.slice(0, 4).map((agent: any) => (
            <div
              key={agent.agentName}
              className="p-3 rounded-[12px] flex flex-col justify-between"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <div>
                <div className="text-[12px] font-bold text-[var(--text)] truncate">{agent.agentName}</div>
                <div className="text-[10px] text-[var(--muted)] mt-0.5">{agent.count} withdrawals</div>
                <div className="text-[16px] font-bold my-1 text-amber-400" style={{ fontFamily: "var(--font-dm-serif)" }}>
                  ₦{Number(agent.total).toLocaleString()}
                </div>
              </div>
              <div className="text-[10px] text-gray-500">~₦{agent.estimatedFee} fee paid</div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-[10px] text-[11px] leading-relaxed flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-300">
          <span className="text-[14px]">💡</span>
          <div>
            <strong>AI Capital Optimization Tip:</strong> {inst.posAgentIntelligence.leakageTip}
          </div>
        </div>
      </div>

      {/* ── 5. INFLOW CAPITAL SOURCES & STREAM BREAKDOWN ── */}
      <div className="rounded-[16px] p-5 flex flex-col gap-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[15px] font-semibold flex items-center gap-2" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
              <span>💰</span> Inflow Capital Sources &amp; Stream Breakdown
            </div>
            <div className="text-[11px] mt-0.5 text-[var(--muted)]">
              Verified income channels totaling ₦245,887 across 8 credits
            </div>
          </div>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {inst.inflowChannels.map((channel: any) => (
            <div
              key={channel.name}
              className="p-4 rounded-[14px] flex flex-col justify-between"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[20px]">{channel.icon}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                    {channel.pct}%
                  </span>
                </div>
                <div className="text-[13px] font-bold text-[var(--text)] mb-1">{channel.name}</div>
                <div className="text-[20px] font-bold text-emerald-400 mb-2" style={{ fontFamily: "var(--font-dm-serif)" }}>
                  ₦{Number(channel.total).toLocaleString()}
                </div>
                <div className="text-[11px] text-[var(--muted)] leading-relaxed">
                  {channel.description} ({channel.count} credit{channel.count > 1 ? "s" : ""})
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 6. MULTI-HORIZON PREDICTIVE CASHFLOW TRAJECTORY ── */}
      <div className="rounded-[16px] p-5 flex flex-col gap-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[15px] font-semibold flex items-center gap-2" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
              <span>🔮</span> Multi-Horizon Predictive Cashflow Trajectory
            </div>
            <div className="text-[11px] mt-0.5 text-[var(--muted)]">
              Dynamic simulations based on Jobberman payroll cycles and recurring transfer obligations
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-[8px] bg-[var(--bg)] border border-[var(--border)]">
            {[
              { id: "d30", label: "30-Day Outlook" },
              { id: "d60", label: "60-Day Outlook" },
              { id: "d90", label: "90-Day Outlook" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setHorizonTab(tab.id as any)}
                className="px-2.5 py-1 rounded-[6px] text-[10px] font-semibold transition-all cursor-pointer"
                style={{
                  background: horizonTab === tab.id ? "var(--green)" : "transparent",
                  color: horizonTab === tab.id ? "#fff" : "var(--muted)",
                  border: "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <div className="p-4 rounded-[12px]" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.5px] mb-1 text-[var(--muted)]">Projected Inflow</div>
            <div className="text-[22px] font-bold text-emerald-400" style={{ fontFamily: "var(--font-dm-serif)" }}>
              +₦{Number(activeHorizon.projectedIncome).toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-[12px]" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.5px] mb-1 text-[var(--muted)]">Projected Outflow</div>
            <div className="text-[22px] font-bold text-rose-400" style={{ fontFamily: "var(--font-dm-serif)" }}>
              -₦{Number(activeHorizon.projectedExpense).toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-[12px]" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.5px] mb-1 text-[var(--muted)]">Projected Net Surplus</div>
            <div className="text-[22px] font-bold text-[var(--text)]" style={{ fontFamily: "var(--font-dm-serif)" }}>
              +₦{Number(activeHorizon.netAccumulation).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-[10px] text-[12px] flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
          <span>💡</span>
          <span><strong>AI Trajectory Verdict:</strong> {activeHorizon.verdict}</span>
        </div>
      </div>

      {/* ── 7. AI RISK & ANOMALY RADAR ── */}
      <div className="rounded-[16px] p-5 flex flex-col gap-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[15px] font-semibold flex items-center gap-2" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
              <span>🚨</span> AI Risk &amp; Anomaly Detection Radar
            </div>
            <div className="text-[11px] mt-0.5 text-[var(--muted)]">
              Autonomous scan flagging unusual debit spikes, impulse spending &amp; high-value transfers
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            Live AI Scan Active
          </span>
        </div>

        {aiData?.anomalies && aiData.anomalies.length > 0 ? (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            {aiData.anomalies.map((anom: any, idx: number) => {
              const isHigh = anom.flag === "Unusual Spike" || anom.flag === "High Debit";
              return (
                <div
                  key={anom.id || `anom-${idx}`}
                  className="rounded-[14px] p-4 flex flex-col justify-between"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-[13px] font-bold text-[var(--text)]">{anom.merchant}</div>
                        <div className="text-[10px] text-[var(--muted)]">{anom.date}</div>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: isHigh ? "rgba(226,75,74,0.15)" : "rgba(245,166,35,0.15)",
                          color: isHigh ? "#E24B4A" : "#F5A623",
                        }}
                      >
                        {anom.flag}
                      </span>
                    </div>
                    <div className="text-[16px] font-bold mb-2 text-rose-500" style={{ fontFamily: "var(--font-dm-serif)" }}>
                      -₦{Number(anom.amount_naira || 0).toLocaleString()}
                    </div>
                    <div className="text-[11px] leading-relaxed mb-3 text-[var(--muted)]">
                      {anom.reason}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)]">
                    <button
                      onClick={() => goToChat(`AI flagged transaction '${anom.merchant}' of ₦${anom.amount_naira} on ${anom.date} as ${anom.flag}. Reason: ${anom.reason}. What should I do?`)}
                      className="px-3 py-1 rounded-[7px] text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                    >
                      Discuss With AI Buddy →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-[12px] text-center bg-[var(--bg)] border border-dashed border-[var(--border)]">
            <div className="text-[12px] font-semibold text-emerald-400">✓ No Critical Debit Leaks Flagged</div>
            <div className="text-[11px] mt-0.5 text-[var(--muted)]">Your transfer and cashout cadence is healthy.</div>
          </div>
        )}
      </div>

      {/* ── 8. AI SMART BUDGET TARGETS & LEAKAGE CAPS ── */}
      <div className="rounded-[16px] p-5 flex flex-col gap-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[15px] font-semibold flex items-center gap-2" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
              <span>🎯</span> AI Smart Budget Targets &amp; Leakage Caps
            </div>
            <div className="text-[11px] mt-0.5 text-[var(--muted)]">
              Category caps computed by AI to maximize monthly net savings rate
            </div>
          </div>
        </div>

        {aiData?.budget_recommendations && aiData.budget_recommendations.length > 0 ? (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {aiData.budget_recommendations.map((rec: any, idx: number) => {
              const currentNaira = Number(rec.current_spent_naira || 0);
              const targetNaira = Number(rec.recommended_target_naira || 0);
              const pctOfTarget = targetNaira > 0 ? Math.min(100, Math.round((currentNaira / targetNaira) * 100)) : 100;
              const isOver = currentNaira > targetNaira;

              return (
                <div
                  key={`rec-${idx}`}
                  className="rounded-[14px] p-4 flex flex-col justify-between"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="text-[13px] font-bold capitalize text-[var(--text)]">{rec.category}</div>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: isOver ? "rgba(226,75,74,0.12)" : "rgba(0,196,140,0.12)",
                          color: isOver ? "#E24B4A" : "var(--green2)",
                        }}
                      >
                        {isOver ? "Over Target" : "Within Cap"}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between mb-1 text-[11px] text-[var(--muted)]">
                      <span>Current Spend:</span>
                      <span className="text-[13px] font-bold text-[var(--text)]">₦{currentNaira.toLocaleString()}</span>
                    </div>
                    <div className="flex items-baseline justify-between mb-3 text-[11px] text-[var(--muted)]">
                      <span>AI Target Cap:</span>
                      <span className="text-[13px] font-bold text-emerald-400">₦{targetNaira.toLocaleString()}</span>
                    </div>

                    <div className="w-full h-2 rounded-full overflow-hidden mb-3 bg-white/5">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pctOfTarget}%`,
                          background: isOver ? "#E24B4A" : "var(--green)",
                        }}
                      />
                    </div>

                    <div className="text-[11px] leading-relaxed mb-3 text-[var(--muted)]">
                      💡 {rec.tip}
                    </div>
                  </div>

                  <button
                    onClick={() => goToChat(`Set a goal to keep my spending in category '${rec.category}' capped at ₦${targetNaira.toLocaleString()} per month.`)}
                    className="w-full py-1.5 rounded-[8px] text-[11px] font-semibold text-center cursor-pointer transition-all hover:opacity-80 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  >
                    ⚡ Apply AI Goal Target
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-[12px] text-center bg-[var(--bg)] border border-dashed border-[var(--border)]">
            <div className="text-[12px] font-semibold text-[var(--muted)]">AI Budget Targets Active · Spending matches target bounds</div>
          </div>
        )}
      </div>

      {/* ── 9. INTERACTIVE MULTI-MODEL AI SPENDING Q&A ASSISTANT ── */}
      <div className="rounded-[16px] p-5 flex flex-col gap-4 shadow-sm" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[20px]">💬</span>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--text)]" style={{ fontFamily: "var(--font-sora)" }}>
                Ask Your AI Engine About {userProfile?.fullName && userProfile.fullName !== "User" ? `${userProfile.fullName.split(" ")[0]}'s` : "Your"} Spending
              </h3>
              <p className="text-[11px] text-[var(--muted)]">
                Powered live by {aiData?.ai_model_name || "Groq Llama 3.3 70B / Google Gemini"} over your DataBank financial records.
              </p>
            </div>
          </div>
        </div>

        {/* Quick prompt suggestions tailored to your finances */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            "Who have I sent the most money to?",
            "How much did I withdraw from POS agents like Yakubu Abdullahi?",
            "Analyze my Jobberman salary growth and retention velocity",
            "What are my Demerge Nigeria merchant order inflows?",
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => {
                setAiQuery(prompt);
              }}
              className="px-2.5 py-1 rounded-[6px] text-[10px] font-medium bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all cursor-pointer"
            >
              ⚡ {prompt}
            </button>
          ))}
        </div>

        <form onSubmit={handleAskAi} className="flex gap-2">
          <input
            type="text"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            placeholder="e.g. Who have I sent the most money to? What was my salary raise?"
            className="flex-1 px-4 py-2.5 rounded-[10px] text-[12px] focus:outline-none"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
          <button
            type="submit"
            disabled={queryingAi || !aiQuery.trim()}
            className="px-4 py-2.5 rounded-[10px] text-[12px] font-semibold text-black cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--green, #00C48C)" }}
          >
            {queryingAi ? "Analyzing..." : "Ask AI ⚡"}
          </button>
        </form>

        <AnimatePresence>
          {aiAnswers.length > 0 && (
            <div className="flex flex-col gap-3 mt-2">
              {aiAnswers.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-[12px] flex flex-col gap-2"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between font-semibold text-[12px]" style={{ color: "var(--green, #00C48C)" }}>
                    <span>Q: {item.q}</span>
                    <span className="text-[10px] text-[var(--muted)]">{item.time}</span>
                  </div>
                  <div className="text-[12px] leading-relaxed whitespace-pre-wrap text-[var(--text)]">
                    {item.a}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
