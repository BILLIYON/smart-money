"use client";

import { useState, useEffect } from "react";
import type { CommunityBuddyRow } from "@/lib/db";

export type OnboardingResult = {
  selectedGoal: string | null;
  selectedBuddy: string;
  connectedSources: string[];
};

export type RestoredState = {
  initialStep: 1 | 2 | 3;
  initialGoal: string | null;
  initialBuddy: string;
  initialConnected: string[];
};

type Goal = {
  id: string;
  icon: string;
  iconBg: string;
  label: string;
  sub: string;
};

type Source = {
  id: string;
  icon: string;
  iconBg: string;
  label: string;
  sub: string;
  btnLabel: string;
};

const GOALS: Goal[] = [
  { id: "budget",     icon: "📊", iconBg: "#FFF8E7", label: "Gain control of my monthly spending", sub: "Track naira out, find leaks, stop overspending" },
  { id: "savings",    icon: "💰", iconBg: "#E8F5E9", label: "Build savings & emergency fund",  sub: "Start a financial safety net" },
  { id: "invest",     icon: "📈", iconBg: "#E3F2FD", label: "Invest and grow my wealth",        sub: "Put money into assets that work" },
  { id: "property",   icon: "🏠", iconBg: "#FFF3E0", label: "Buy property or land",             sub: "Plan and save for real estate" },
  { id: "debt",       icon: "✂️", iconBg: "#FCE4EC", label: "Cut spending and pay off debt",    sub: "Free up money and reduce obligations" },
  { id: "custom",     icon: "✨", iconBg: "#F3E5F5", label: "Other / Custom Goal",              sub: "Define your own unique financial target" },
];

const SOURCES: Source[] = [
  { id: "gmail", icon: "📧", iconBg: "#FEE8E6", label: "Connect Gmail",        sub: "Read-only · Bank alerts, receipts, subscriptions", btnLabel: "Connect" },
  { id: "bank",  icon: "🏦", iconBg: "#E8F5E9", label: "Upload Bank Statement", sub: "PDF or CSV · Any Nigerian bank",                   btnLabel: "Upload"  },
  { id: "news",  icon: "📰", iconBg: "#E3F2FD", label: "Live News Feed",        sub: "Optional · Market & economic updates",             btnLabel: "Enable"  },
];

function PipTrack({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-[5px] mb-4 relative z-[1]">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="h-[3px] rounded-[2px] flex-1 transition-all duration-300"
          style={{
            background:
              n < step ? "var(--green)"
              : n === step ? "#fff"
              : "rgba(255,255,255,.2)",
          }}
        />
      ))}
    </div>
  );
}

function ModalHeader({ step, title, sub }: { step: 1 | 2 | 3; title: string; sub: string }) {
  return (
    <div
      className="px-8 pt-7 pb-6 relative overflow-hidden flex-shrink-0"
      style={{ background: "var(--navy)" }}
    >
      <span
        className="absolute -right-10 -top-10 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: "rgba(0,196,140,.1)" }}
      />
      <PipTrack step={step} />
      <h2
        className="text-[21px] text-white mb-[5px] relative z-[1]"
        style={{ fontFamily: "var(--font-dm-serif)" }}
      >
        {title}
      </h2>
      <p className="text-[13px] leading-relaxed relative z-[1]" style={{ color: "rgba(255,255,255,.6)" }}>
        {sub}
      </p>
    </div>
  );
}

function Actions({
  leftLabel,
  leftAction,
  rightLabel,
  rightAction,
  rightDisabled,
}: {
  leftLabel: string;
  leftAction: () => void;
  rightLabel: string;
  rightAction: () => void;
  rightDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={leftAction}
        className="text-[12px] transition-colors duration-150"
        style={{ color: "var(--muted)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; }}
      >
        {leftLabel}
      </button>

      <button
        onClick={rightAction}
        disabled={rightDisabled}
        className="px-6 py-[10px] rounded-[10px] text-[13px] font-semibold text-white border-none cursor-pointer transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: "var(--green)" }}
        onMouseEnter={(e) => {
          if (!rightDisabled) (e.currentTarget as HTMLButtonElement).style.background = "#00A677";
        }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green)"; }}
      >
        {rightLabel}
      </button>
    </div>
  );
}

export function OnboardingModal({
  onComplete,
  onClose,
  restored,
}: {
  onComplete: (result: OnboardingResult) => void;
  onClose: () => void;
  restored?: RestoredState | null;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(restored?.initialStep ?? 1);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(restored?.initialGoal ?? null);
  const [customGoalText, setCustomGoalText] = useState("");
  const [selectedBuddy, setSelectedBuddy] = useState<string>(restored?.initialBuddy ?? "buffett");
  const [connected, setConnected] = useState<Set<string>>(new Set(restored?.initialConnected ?? []));
  const [connecting, setConnecting] = useState<string | null>(null);
  const [dbBuddies, setDbBuddies] = useState<CommunityBuddyRow[]>([]);

  useEffect(() => {
    fetch("/api/studio")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDbBuddies(data);
      })
      .catch(() => {});
  }, []);

  async function handleConnect(sourceId: string) {
    if (connected.has(sourceId) || connecting) return;

    if (sourceId === "gmail") {
      setConnecting("gmail");
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        "/api/auth/gmail",
        "gmail_oauth",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const checkTimer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkTimer);
          setConnecting(null);
          fetch("/api/databank/gmail/status")
            .then((r) => r.json())
            .then((status) => {
              if (status.connected) {
                setConnected((prev) => new Set([...prev, "gmail"]));
              }
            })
            .catch(() => {});
        }
      }, 500);
    } else {
      setConnected((prev) => new Set([...prev, sourceId]));
    }
  }

  function handleFinish() {
    const finalGoal = selectedGoal === "custom" && customGoalText.trim()
      ? customGoalText.trim()
      : selectedGoal;

    onComplete({
      selectedGoal: finalGoal,
      selectedBuddy,
      connectedSources: Array.from(connected),
    });
  }

  const celebBuddies = dbBuddies.filter((b) => b.is_fan_sim);
  const archetypeBuddies = dbBuddies.filter((b) => !b.is_fan_sim);

  const step1 = (
    <>
      <ModalHeader
        step={1}
        title="What is your primary financial goal?"
        sub="Smart Money will tailor recommendations, insights, and buddy advice to what matters most to you right now."
      />
      <div className="px-8 pt-6 pb-7">
        <div className="flex flex-col gap-[9px] mb-[22px]">
          {GOALS.map((g) => {
            const isSelected = selectedGoal === g.id;
            return (
              <div key={g.id}>
                <div
                  onClick={() => setSelectedGoal(g.id)}
                  className="flex items-center gap-[14px] p-3 rounded-[12px] cursor-pointer transition-all duration-200 border"
                  style={
                    isSelected
                      ? { background: "rgba(0,196,140,.08)", borderColor: "var(--green)" }
                      : { background: "var(--bg)", borderColor: "var(--border)" }
                  }
                >
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[18px] flex-shrink-0"
                    style={{ background: g.iconBg }}
                  >
                    {g.icon}
                  </div>

                  <div className="flex-grow">
                    <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                      {g.label}
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                      {g.sub}
                    </div>
                  </div>

                  <div
                    className="w-[18px] h-[18px] rounded-full border-[2px] flex items-center justify-center flex-shrink-0 transition-all duration-200"
                    style={
                      isSelected
                        ? { borderColor: "var(--green)", background: "var(--green)" }
                        : { borderColor: "var(--border)" }
                    }
                  >
                    {isSelected && <span className="text-white text-[10px]">✓</span>}
                  </div>
                </div>

                {g.id === "custom" && isSelected && (
                  <input
                    type="text"
                    placeholder="Describe your financial goal..."
                    value={customGoalText}
                    onChange={(e) => setCustomGoalText(e.target.value)}
                    className="mt-[9px] w-full px-[14px] py-[9px] rounded-[10px] text-[13px] outline-none border transition-colors duration-150"
                    style={{
                      background: "var(--bg)",
                      borderColor: "var(--border)",
                      color: "var(--text)",
                    }}
                    autoFocus
                  />
                )}
              </div>
            );
          })}
        </div>

        <Actions
          leftLabel="Skip onboarding"
          leftAction={onClose}
          rightLabel="Next →"
          rightAction={() => setStep(2)}
          rightDisabled={!selectedGoal || (selectedGoal === "custom" && !customGoalText.trim())}
        />
      </div>
    </>
  );

  const step2 = (
    <>
      <ModalHeader
        step={2}
        title="Pick your first Finance Buddy"
        sub="Chat with legendary investors or choose a specialist archetype. You can add more anytime."
      />
      <div className="px-8 pt-6 pb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2" style={{ color: "var(--muted)" }}>
          ⭐ Popular · Celebrity Simulations
        </p>
        <div className="grid grid-cols-2 gap-[9px] mb-[4px] max-h-[160px] overflow-y-auto">
          {celebBuddies.map((b) => {
            const isSelected = selectedBuddy === b.id;
            return (
              <div
                key={b.id}
                onClick={() => setSelectedBuddy(b.id)}
                className="flex items-center gap-[10px] p-[10px] rounded-[12px] cursor-pointer border transition-all duration-150"
                style={
                  isSelected
                    ? { background: "rgba(0,196,140,.08)", borderColor: "var(--green)" }
                    : { background: "var(--bg)", borderColor: "var(--border)" }
                }
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] flex-shrink-0 overflow-hidden"
                  style={{ background: b.avatar_bg || "#1A3A6E", color: "white" }}
                >
                  {b.avatar_content && (b.avatar_content.startsWith("http") || b.avatar_content.startsWith("data:")) ? (
                    <img src={b.avatar_content} alt={b.name} className="w-full h-full object-cover" />
                  ) : (
                    b.avatar_content || "WB"
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="text-[12px] font-semibold truncate" style={{ color: "var(--text)" }}>{b.name}</div>
                  <div className="text-[10px] truncate" style={{ color: "var(--muted)" }}>{b.tag}</div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2 mt-3" style={{ color: "var(--muted)" }}>
          Or try an Archetype
        </p>
        <div className="grid grid-cols-2 gap-[9px] mb-3 max-h-[140px] overflow-y-auto">
          {archetypeBuddies.map((b) => {
            const isSelected = selectedBuddy === b.id;
            return (
              <div
                key={b.id}
                onClick={() => setSelectedBuddy(b.id)}
                className="flex items-center gap-[10px] p-[10px] rounded-[12px] cursor-pointer border transition-all duration-150"
                style={
                  isSelected
                    ? { background: "rgba(0,196,140,.08)", borderColor: "var(--green)" }
                    : { background: "var(--bg)", borderColor: "var(--border)" }
                }
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] flex-shrink-0 overflow-hidden"
                  style={{ background: b.avatar_bg || "#1A3A6E", color: "white" }}
                >
                  {b.avatar_content && (b.avatar_content.startsWith("http") || b.avatar_content.startsWith("data:")) ? (
                    <img src={b.avatar_content} alt={b.name} className="w-full h-full object-cover" />
                  ) : (
                    b.avatar_content || "🎯"
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="text-[12px] font-semibold truncate" style={{ color: "var(--text)" }}>{b.name}</div>
                  <div className="text-[10px] truncate" style={{ color: "var(--muted)" }}>{b.tag}</div>
                </div>
              </div>
            );
          })}
        </div>

        <Actions
          leftLabel="← Back"
          leftAction={() => setStep(1)}
          rightLabel="Next →"
          rightAction={() => setStep(3)}
        />
      </div>
    </>
  );

  const step3 = (
    <>
      <ModalHeader
        step={3}
        title="Connect your financial data"
        sub="Give your AI Buddy context to calculate real figures. Data is stored locally on your device and encrypted."
      />
      <div className="px-8 pt-6 pb-7">
        <div className="flex flex-col gap-[10px] mb-[22px]">
          {SOURCES.map((s) => {
            const isConn = connected.has(s.id);
            const isConnThis = connecting === s.id;
            return (
              <div
                key={s.id}
                className="flex items-center gap-[14px] p-3 rounded-[12px] border"
                style={{ background: "var(--bg)", borderColor: "var(--border)" }}
              >
                <div
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[18px] flex-shrink-0"
                  style={{ background: s.iconBg }}
                >
                  {s.icon}
                </div>

                <div className="flex-grow">
                  <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                    {s.label}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                    {s.sub}
                  </div>
                </div>

                <button
                  onClick={() => handleConnect(s.id)}
                  disabled={isConn || Boolean(connecting)}
                  className="px-3 py-1.5 rounded-[8px] text-[11px] font-semibold border-none cursor-pointer flex-shrink-0 transition-all duration-150"
                  style={
                    isConn
                      ? { background: "rgba(0,196,140,.12)", color: "#00A677", border: "1px solid rgba(0,196,140,.3)" }
                      : isConnThis
                      ? { background: "var(--border)", color: "var(--muted)" }
                      : { background: "var(--navy)", color: "white" }
                  }
                >
                  {isConn ? "✓ Connected" : isConnThis ? "Connecting..." : s.btnLabel}
                </button>
              </div>
            );
          })}
        </div>

        <Actions
          leftLabel="← Back"
          leftAction={() => setStep(2)}
          rightLabel="Get Started →"
          rightAction={handleFinish}
        />
      </div>
    </>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-[500px] rounded-[20px] overflow-hidden relative shadow-2xl border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        {step === 1 && step1}
        {step === 2 && step2}
        {step === 3 && step3}
      </div>
    </div>
  );
}
