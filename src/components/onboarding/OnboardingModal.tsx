"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Goal = {
  id: string;
  icon: string;
  iconBg: string;
  label: string;
  sub: string;
};

type Buddy = {
  id: string;
  initials: string;
  name: string;
  tag: string;
  isCeleb: boolean;
  isSerif: boolean;
};

type Source = {
  id: string;
  icon: string;
  iconBg: string;
  label: string;
  sub: string;
  btnLabel: string;
};

export type OnboardingResult = {
  goal: string;
  buddyId: string;
  connectedSources: string[];
};

export type RestoredState = {
  initialStep?: 1 | 2 | 3;
  initialGoal?: string | null;
  initialBuddy?: string;
  initialConnected?: string[];
};

// ─── Data ────────────────────────────────────────────────────────────────────

const GOALS: Goal[] = [
  { id: "savings",    icon: "💰", iconBg: "#E8F5E9", label: "Build savings & emergency fund",  sub: "Start a financial safety net" },
  { id: "invest",     icon: "📈", iconBg: "#E3F2FD", label: "Invest and grow my wealth",        sub: "Put money into assets that work" },
  { id: "property",   icon: "🏠", iconBg: "#FFF3E0", label: "Buy property or land",             sub: "Plan and save for real estate" },
  { id: "debt",       icon: "✂️", iconBg: "#FCE4EC", label: "Cut spending and pay off debt",    sub: "Free up money and reduce obligations" },
  { id: "custom",     icon: "✨", iconBg: "#F3E5F5", label: "Other / Custom Goal",              sub: "Define your own unique financial target" },
];

const CELEB_BUDDIES: Buddy[] = [
  { id: "buffett",  initials: "WB", name: "Warren Buffett",   tag: "Value Investing · ₦3k/mo · Fan Sim",      isCeleb: true, isSerif: true },
  { id: "kiyosaki", initials: "RK", name: "Robert Kiyosaki",  tag: "Assets vs Liabilities · ₦2k/mo · Fan Sim", isCeleb: true, isSerif: true },
  { id: "cardone",  initials: "GC", name: "Grant Cardone",    tag: "10X Growth · ₦2.5k/mo · Fan Sim",          isCeleb: true, isSerif: true },
  { id: "ramsey",   initials: "DR", name: "Dave Ramsey",      tag: "Debt Freedom · ₦1.5k/mo · Fan Sim",        isCeleb: true, isSerif: true },
];

const ARCHETYPE_BUDDIES: Buddy[] = [
  { id: "contrarian", initials: "🎯", name: "The Contrarian",    tag: "Value · Long-term · Free",    isCeleb: false, isSerif: false },
  { id: "lagos",      initials: "🏙️", name: "Street Smart Lagos", tag: "Nigerian Market · ₦2.5k/mo", isCeleb: false, isSerif: false },
];

const SOURCES: Source[] = [
  { id: "gmail", icon: "📧", iconBg: "#FEE8E6", label: "Connect Gmail",        sub: "Read-only · Bank alerts, receipts, subscriptions", btnLabel: "Connect" },
  { id: "bank",  icon: "🏦", iconBg: "#E8F5E9", label: "Upload Bank Statement", sub: "PDF or CSV · Any Nigerian bank",                   btnLabel: "Upload"  },
  { id: "news",  icon: "📰", iconBg: "#E3F2FD", label: "Live News Feed",        sub: "Optional · Market & economic updates",             btnLabel: "Enable"  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function ModalHeader({
  step,
  title,
  sub,
}: {
  step: 1 | 2 | 3;
  title: string;
  sub: string;
}) {
  return (
    <div
      className="relative overflow-hidden px-8 pt-7 pb-6"
      style={{ background: "linear-gradient(135deg,var(--navy),var(--navy2))" }}
    >
      {/* Decorative circle */}
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
        className="px-[18px] py-2 rounded-[10px] text-[13px] font-medium text-white transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: "var(--green)" }}
        onMouseEnter={(e) => {
          if (!rightDisabled) (e.currentTarget as HTMLButtonElement).style.background = "var(--green2)";
        }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green)"; }}
      >
        {rightLabel}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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

  async function handleConnect(sourceId: string) {
    if (connected.has(sourceId) || connecting) return;

    if (sourceId === "gmail") {
      setConnecting("gmail");
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        `/api/auth/gmail`,
        "Connect Gmail",
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
      );

      const handleOAuthMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === "GMAIL_CONNECTED") {
          setConnected((prev) => new Set([...prev, "gmail"]));
          setConnecting(null);
          window.removeEventListener("message", handleOAuthMessage);
        } else if (event.data?.type === "GMAIL_ERROR") {
          setConnecting(null);
          window.removeEventListener("message", handleOAuthMessage);
        }
      };

      window.addEventListener("message", handleOAuthMessage);

      const timer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(timer);
          setConnecting(null);
          window.removeEventListener("message", handleOAuthMessage);
        }
      }, 1000);

      return;
    }

    if (sourceId === "bank") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf,.csv";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        setConnecting("bank");
        const formData = new FormData();
        formData.append("file", file);
        try {
          const res = await fetch("/api/databank/upload", { method: "POST", body: formData });
          if (res.ok) setConnected((prev) => new Set([...prev, "bank"]));
        } finally {
          setConnecting(null);
        }
      };
      input.click();
      return;
    }

    if (sourceId === "news") {
      setConnecting("news");
      try {
        const res = await fetch("/api/signals/enable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId: "news" }),
        });
        if (res.ok) setConnected((prev) => new Set([...prev, "news"]));
      } finally {
        setConnecting(null);
      }
      return;
    }
  }

  async function handleFinish() {
    const finalGoal = selectedGoal === "custom" ? customGoalText.trim() : (selectedGoal ?? "");
    const result: OnboardingResult = {
      goal: finalGoal,
      buddyId: selectedBuddy,
      connectedSources: Array.from(connected),
    };
    onComplete(result);
  }

  // ─── Step 1 ───────────────────────────────────────────────────────────────
  const step1 = (
    <>
      <ModalHeader
        step={1}
        title="Welcome to Smart Money 👋"
        sub="Get advice that fits your actual financial life — not generic tips. Set up in 60 seconds."
      />
      <div className="px-8 pt-6 pb-7">
        <p className="text-[13px] font-semibold mb-[13px]" style={{ color: "var(--text)" }}>
          What&apos;s your main financial goal right now?
        </p>
        <div className="flex flex-col gap-[9px] mb-[22px]">
          {GOALS.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGoal(g.id)}
              className={cn(
                "flex items-center gap-[13px] px-[15px] py-[13px] rounded-xl border text-left transition-all duration-200",
                selectedGoal === g.id
                  ? "border-green bg-green/5"
                  : "hover:border-green"
              )}
              style={{ borderColor: selectedGoal === g.id ? "var(--green)" : "var(--border)", background: selectedGoal === g.id ? "rgba(0,196,140,.05)" : "var(--bg)" }}
            >
              <span
                className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-[19px] flex-shrink-0"
                style={{ background: g.iconBg }}
              >
                {g.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-semibold mb-[1px]" style={{ color: "var(--text)" }}>{g.label}</span>
                <span className="block text-[11px]" style={{ color: "var(--muted)" }}>{g.sub}</span>
              </span>
              {/* Check circle */}
              <span
                className="w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[10px] transition-all duration-200"
                style={{
                  borderColor: selectedGoal === g.id ? "var(--green)" : "var(--border)",
                  background: selectedGoal === g.id ? "var(--green)" : "transparent",
                  color: selectedGoal === g.id ? "#fff" : "transparent",
                }}
              >
                ✓
              </span>
            </button>
          ))}
          {selectedGoal === "custom" && (
            <div className="mt-1">
              <input
                type="text"
                value={customGoalText}
                onChange={(e) => setCustomGoalText(e.target.value)}
                placeholder="e.g. Save ₦2.5M for a Master's degree, start a bakery..."
                className="w-full px-[15px] py-3 rounded-xl border outline-none text-[13px] transition-colors"
                style={{
                  borderColor: "var(--green)",
                  background: "var(--bg)",
                  color: "var(--text)"
                }}
                maxLength={120}
              />
            </div>
          )}
        </div>
        <Actions
          leftLabel="Skip for now"
          leftAction={() => setStep(2)}
          rightLabel="Next →"
          rightAction={() => setStep(2)}
          rightDisabled={selectedGoal === "custom" && !customGoalText.trim()}
        />
      </div>
    </>
  );

  // ─── Step 2 ───────────────────────────────────────────────────────────────
  function BuddyCard({ buddy }: { buddy: Buddy }) {
    const active = selectedBuddy === buddy.id;
    return (
      <button
        onClick={() => setSelectedBuddy(buddy.id)}
        className="px-[13px] py-[13px] rounded-xl border text-left transition-all duration-200"
        style={{
          borderColor: active ? "var(--green)" : "var(--border)",
          background: active ? "rgba(0,196,140,.05)" : "var(--bg)",
        }}
      >
        <div
          className="mb-[5px] text-[22px]"
          style={buddy.isSerif ? { fontFamily: "var(--font-dm-serif)", fontSize: "18px", color: "var(--text)" } : {}}
        >
          {buddy.initials}
        </div>
        <div className="text-[13px] font-semibold mb-[2px]" style={{ color: "var(--text)" }}>{buddy.name}</div>
        <div className="text-[10px]" style={{ color: "var(--muted)" }}>{buddy.tag}</div>
      </button>
    );
  }

  const step2 = (
    <>
      <ModalHeader
        step={2}
        title="Pick your first Finance Buddy"
        sub="Chat with legendary investors or choose a specialist archetype. You can add more anytime."
      />
      <div className="px-8 pt-6 pb-7">
        {/* Celebrity section */}
        <p className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2" style={{ color: "var(--muted)" }}>
          ⭐ Popular · Celebrity Simulations
        </p>
        <div className="grid grid-cols-2 gap-[9px] mb-[4px]">
          {CELEB_BUDDIES.map((b) => <BuddyCard key={b.id} buddy={b} />)}
        </div>

        {/* Archetype section */}
        <p className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2 mt-3" style={{ color: "var(--muted)" }}>
          Or try an Archetype
        </p>
        <div className="grid grid-cols-2 gap-[9px] mb-3">
          {ARCHETYPE_BUDDIES.map((b) => <BuddyCard key={b.id} buddy={b} />)}
        </div>

        {/* Fan disclaimer */}
        <p className="text-[10px] leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
          ⚠️ Celebrity names are fan-created AI simulations, not affiliated with the real individuals.
        </p>

        <Actions
          leftLabel="← Back"
          leftAction={() => setStep(1)}
          rightLabel="Next →"
          rightAction={() => setStep(3)}
        />
      </div>
    </>
  );

  // ─── Step 3 ───────────────────────────────────────────────────────────────
  const step3 = (
    <>
      <ModalHeader
        step={3}
        title="Connect your financial data"
        sub="This is what makes advice specific to you. Delete anything anytime."
      />
      <div className="px-8 pt-6 pb-7">
        <div className="flex flex-col gap-[9px] mb-[22px]">
          {SOURCES.map((s) => {
            const isDone = connected.has(s.id);
            const isConnecting = connecting === s.id;
            return (
              <div
                key={s.id}
                className="flex items-center gap-[13px] px-[15px] py-[13px] rounded-xl border transition-all duration-200"
                style={{
                  borderColor: isDone ? "var(--green)" : "var(--border)",
                  background: isDone ? "rgba(0,196,140,.05)" : "var(--bg)",
                }}
              >
                <span
                  className="w-9 h-9 rounded-[9px] flex items-center justify-center text-[17px] flex-shrink-0"
                  style={{ background: s.iconBg }}
                >
                  {s.icon}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold" style={{ color: "var(--text)" }}>{s.label}</span>
                  <span className="block text-[11px]" style={{ color: "var(--muted)" }}>{s.sub}</span>
                </span>
                <button
                  onClick={() => handleConnect(s.id)}
                  disabled={isDone || isConnecting}
                  className="px-[13px] py-[6px] rounded-[8px] border text-[12px] whitespace-nowrap transition-all duration-200 disabled:cursor-default"
                  style={{
                    borderColor: isDone ? "var(--green)" : "var(--border)",
                    background: isDone ? "rgba(0,196,140,.07)" : "transparent",
                    color: isDone ? "var(--green)" : "var(--muted)",
                    fontFamily: "var(--font-sora)",
                  }}
                >
                  {isConnecting ? "..." : isDone ? "✓ Connected" : s.btnLabel}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] mb-5" style={{ color: "var(--muted)" }}>
          🔒 You can skip and connect later in DataBank
        </p>
        <Actions
          leftLabel="← Back"
          leftAction={() => setStep(2)}
          rightLabel="Start Chatting →"
          rightAction={handleFinish}
        />
      </div>
    </>
  );

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{
        background: "var(--onboard-overlay)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      {/* Modal */}
      <div
        className="relative w-[520px] max-w-[92vw] rounded-3xl overflow-hidden"
        style={{
          background: "var(--card)",
          boxShadow: "0 24px 80px rgba(0,0,0,.25)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-150"
          style={{ background: "rgba(255,255,255,.15)", color: "#fff" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,.25)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,.15)"; }}
          aria-label="Close"
        >
          ✕
        </button>
        {step === 1 && step1}
        {step === 2 && step2}
        {step === 3 && step3}
      </div>
    </div>
  );
}
