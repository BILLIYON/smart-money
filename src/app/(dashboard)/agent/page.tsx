"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAgentStore, type AgentAction } from "@/store/agentStore";
import toast from "react-hot-toast";
import { popup } from "@/store/popupStore";

type Connection = {
  id: string;
  emoji: string;
  bg: string;
  name: string;
  status: string;
  detail: string;
};

// ── Ghost button ──────────────────────────────────────────
function GhostBtn({
  children,
  onClick,
  danger = false,
  small = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  small?: boolean;
}) {
  const size = small ? "px-3 py-[6px] text-[11px]" : "px-4 py-[9px] text-[12px]";
  return (
    <button
      onClick={onClick}
      className={`${size} font-medium rounded-[10px] border transition-all duration-150`}
      style={{
        color: danger ? "#E24B4A" : "var(--muted)",
        borderColor: danger ? "#E24B4A" : "var(--border)",
        background: "transparent",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = danger ? "#c03030" : "var(--green)";
        el.style.color = danger ? "#c03030" : "var(--green)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = danger ? "#E24B4A" : "var(--border)";
        el.style.color = danger ? "#E24B4A" : "var(--muted)";
      }}
    >
      {children}
    </button>
  );
}

function PrimaryBtn({
  children,
  onClick,
  flex1 = false,
  small = false,
  loading = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  flex1?: boolean;
  small?: boolean;
  loading?: boolean;
}) {
  const size = small ? "px-3 py-[7px] text-[11px]" : "px-4 py-[9px] text-[12px]";
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`${size} font-semibold rounded-[10px] transition-all duration-150 ${flex1 ? "flex-1" : ""}`}
      style={{ background: "var(--green)", color: "#fff", border: "none", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
      onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "var(--green2)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green)"; }}
    >
      {loading ? "Executing…" : children}
    </button>
  );
}

// ── Card wrapper ──────────────────────────────────────────
function Card({ children, fullSpan = false }: { children: React.ReactNode; fullSpan?: boolean }) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 20,
        gridColumn: fullSpan ? "1 / -1" : undefined,
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({
  icon,
  title,
  badge,
  badgeStyle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  badgeStyle?: React.CSSProperties;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
      <div className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "var(--text)" }}>
        {icon}
        {title}
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="text-[11px] font-semibold px-3 py-[3px] rounded-full" style={badgeStyle}>
            {badge}
          </span>
        )}
        {action}
      </div>
    </div>
  );
}

// ── Fund Wallet Modal ──────────────────────────────────────
function FundWalletModal({ onClose, onFund }: { onClose: () => void; onFund: (amtKobo: number) => void }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const presets = [5000, 10000, 25000, 50000];

  async function submit() {
    const n = parseFloat(amount);
    if (!n || n <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setLoading(true);
    const amtKobo = Math.round(n * 100);
    try {
      const res = await fetch("/api/agent/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amtKobo }),
      });
      setLoading(false);
      if (res.ok) {
        onFund(amtKobo);
        toast.success(`Successfully deposited ₦${n.toLocaleString()}`);
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to fund wallet");
      }
    } catch (e) {
      setLoading(false);
      toast.error("Network error funding wallet");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.55)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[360px] rounded-[18px] p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>Fund Smart Money Wallet</div>
          <button onClick={onClose} className="text-[18px] w-8 h-8 flex items-center justify-center rounded-full" style={{ color: "var(--muted)", background: "var(--bg)" }}>×</button>
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2" style={{ color: "var(--muted)" }}>Amount (₦)</div>
        <input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-4 py-3 rounded-[10px] text-[14px] mb-3 outline-none"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-sora)" }}
          autoFocus
        />
        <div className="flex gap-2 mb-5">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(String(p))}
              className="flex-1 py-[7px] rounded-[8px] text-[11px] font-semibold border transition-all duration-150"
              style={{
                background: amount === String(p) ? "var(--green)" : "var(--bg)",
                color: amount === String(p) ? "#fff" : "var(--muted)",
                borderColor: amount === String(p) ? "var(--green)" : "var(--border)",
              }}
            >
              ₦{(p).toLocaleString()}
            </button>
          ))}
        </div>
        <div className="text-[11px] px-3 py-2 rounded-[8px] mb-4" style={{ background: "rgba(0,196,140,.06)", color: "var(--muted)", border: "1px solid rgba(0,196,140,.15)" }}>
          🔒 Transfer from connected bank via Open Banking. Instant.
        </div>
        <div className="flex gap-2">
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={submit} flex1 loading={loading}>
            {loading ? "Transferring…" : "Confirm Transfer →"}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

// ── Agent Limits Modal ────────────────────────────────────
function AgentLimitsModal({ onClose }: { onClose: () => void }) {
  const limits = useAgentStore((s) => s.limits);
  const saveLimits = useAgentStore((s) => s.saveLimits);

  const [perAction, setPerAction] = useState("");
  const [daily, setDaily] = useState("");
  const [monthly, setMonthly] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (limits) {
      setPerAction(String(Math.round(limits.perAction / 100)));
      setDaily(String(Math.round(limits.daily / 100)));
      setMonthly(String(Math.round(limits.monthly / 100)));
    } else {
      setPerAction("50000");
      setDaily("150000");
      setMonthly("500000");
    }
  }, [limits]);

  async function handleSave() {
    const pa = Math.round(parseFloat(perAction) * 100);
    const da = Math.round(parseFloat(daily) * 100);
    const ma = Math.round(parseFloat(monthly) * 100);

    if (isNaN(pa) || isNaN(da) || isNaN(ma) || pa < 0 || da < 0 || ma < 0) {
      toast.error("Please enter valid positive numbers for all limits");
      return;
    }

    setSaving(true);
    const success = await saveLimits({ perAction: pa, daily: da, monthly: ma });
    setSaving(false);
    if (success) {
      toast.success("Agent limits saved successfully");
      onClose();
    } else {
      toast.error("Failed to save agent limits");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.55)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[380px] rounded-[18px] p-6" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-5">
          <div className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>⚙ Agent Limits</div>
          <button onClick={onClose} className="text-[18px] w-8 h-8 flex items-center justify-center rounded-full" style={{ color: "var(--muted)", background: "var(--bg)" }}>×</button>
        </div>
        <div className="text-[12px] mb-5" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Your buddy can never exceed these limits — even with your approval. Think of them as a safety ceiling.
        </div>
        {[
          { label: "Per-Action Limit (₦)", value: perAction, set: setPerAction, hint: "Max any single execution can move" },
          { label: "Daily Limit (₦)", value: daily, set: setDaily, hint: "Max across all actions in one day" },
          { label: "Monthly Limit (₦)", value: monthly, set: setMonthly, hint: "Hard monthly ceiling across all actions" },
        ].map((row) => (
          <div key={row.label} className="mb-4">
            <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-1" style={{ color: "var(--muted)" }}>{row.label}</div>
            <input
              type="number"
              value={row.value}
              onChange={(e) => row.set(e.target.value)}
              className="w-full px-4 py-[10px] rounded-[10px] text-[13px] mb-1 outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-sora)" }}
            />
            <div className="text-[10px]" style={{ color: "var(--muted)" }}>{row.hint}</div>
          </div>
        ))}
        <div className="flex gap-2 mt-1">
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={handleSave} flex1 loading={saving}>Save Limits</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function AgentPage() {
  const router = useRouter();

  const pending = useAgentStore((s) => s.pendingActions);
  const history = useAgentStore((s) => s.history);
  const walletBalance = useAgentStore((s) => s.walletBalance);
  const limits = useAgentStore((s) => s.limits);
  const isLoading = useAgentStore((s) => s.isLoading);

  const loadPending = useAgentStore((s) => s.loadPending);
  const loadHistory = useAgentStore((s) => s.loadHistory);
  const fetchWalletBalance = useAgentStore((s) => s.fetchWalletBalance);
  const fetchLimits = useAgentStore((s) => s.fetchLimits);
  const executeAction = useAgentStore((s) => s.executeAction);
  const declineAction = useAgentStore((s) => s.declineAction);

  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);

  useEffect(() => {
    loadPending();
    loadHistory();
    fetchWalletBalance();
    fetchLimits();
    fetch("/api/agent/connections")
      .then((r) => r.json())
      .then((d) => {
        setConnections(d);
        setLoadingConnections(false);
      });
  }, [loadPending, loadHistory, fetchWalletBalance, fetchLimits]);

  function handleApprove(action: AgentAction) {
    const displayAmount = action.amount ? `₦${(Number(action.amount) / 100).toLocaleString()}` : "N/A";
    popup.confirm(
      "Approve & Execute Action",
      `Approve and execute:\n"${action.description}"\n\nAmount: ${displayAmount}\n\nThis action cannot be undone.`,
      async () => {
        setExecutingId(action.id);
        try {
          await executeAction(action.id);
          toast.success("Action executed successfully!");
          loadHistory();
        } catch (err: any) {
          toast.error(err.message || "Failed to execute action");
        } finally {
          setExecutingId(null);
        }
      },
      { confirmText: "Approve & Execute", type: "confirm" }
    );
  }

  async function handleDecline(actionId: string) {
    try {
      await declineAction(actionId);
      toast.success("Action declined.");
      loadHistory();
    } catch (e) {
      toast.error("Failed to decline action");
    }
  }

  // Calculate dynamic stats
  const executedThisMonthKobo = history
    .filter((h) => h.status === "done")
    .reduce((sum, h) => sum + Number((h as any).amount || 0), 0);
  const executedThisMonthText = `₦${(executedThisMonthKobo / 100).toLocaleString()}`;
  const executedActionsCount = history.filter((h) => h.status === "done").length;

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="px-4 py-6 sm:px-6 lg:px-8 w-full">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="text-[22px] font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
            ⚡ <em style={{ fontFamily: "var(--font-dm-serif)", fontStyle: "italic" }}>Agentic Actions</em>
          </div>
          <GhostBtn onClick={() => router.push("/databank")}>Manage DataBank</GhostBtn>
        </div>

        {/* ── Trust Hierarchy ── */}
        <div
          className="relative overflow-hidden rounded-[16px] p-6 mb-6"
          style={{ background: "linear-gradient(135deg,var(--navy),var(--navy2))" }}
        >
          <div
            className="absolute pointer-events-none"
            style={{ right: -30, top: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(0,196,140,.08)" }}
          />
          <div className="text-[11px] uppercase tracking-[2px] mb-4" style={{ color: "rgba(255,255,255,.4)" }}>
            How Agentic Actions Work
          </div>
          <div className="flex items-center flex-wrap gap-3">
            <div className="flex items-center gap-3 px-4 py-[10px] rounded-[10px]" style={{ background: "rgba(255,255,255,.06)" }}>
              <span className="text-[18px]">👁️</span>
              <div>
                <div className="text-[12px] font-semibold text-white">Read</div>
                <div className="text-[10px]" style={{ color: "rgba(255,255,255,.4)" }}>Buddy sees your data</div>
              </div>
            </div>

            <span className="text-[18px]" style={{ color: "rgba(255,255,255,.2)" }}>→</span>

            <div className="flex items-center gap-3 px-4 py-[10px] rounded-[10px]" style={{ background: "rgba(255,255,255,.06)" }}>
              <span className="text-[18px]">💬</span>
              <div>
                <div className="text-[12px] font-semibold text-white">Recommend</div>
                <div className="text-[10px]" style={{ color: "rgba(255,255,255,.4)" }}>Buddy advises you</div>
              </div>
            </div>

            <span className="text-[18px]" style={{ color: "rgba(255,255,255,.2)" }}>→</span>

            <div
              className="flex items-center gap-3 px-4 py-[10px] rounded-[10px]"
              style={{ background: "rgba(0,196,140,.15)", border: "1px solid rgba(0,196,140,.3)" }}
            >
              <span className="text-[18px]">⚡</span>
              <div>
                <div className="text-[12px] font-semibold" style={{ color: "var(--green)" }}>Execute</div>
                <div className="text-[10px]" style={{ color: "rgba(255,255,255,.4)" }}>Buddy acts with your approval</div>
              </div>
            </div>

            <div className="ml-auto text-[12px] max-w-[240px]" style={{ color: "rgba(255,255,255,.4)", lineHeight: 1.6 }}>
              Every execution requires your explicit confirmation. Your buddy never moves money without your tap.
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 460px), 1fr))" }}>

          {/* Smart Money Wallet — full span */}
          <Card fullSpan>
            <CardHeader
              icon={
                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: "var(--green)", fill: "none", strokeWidth: 2 }}>
                  <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              }
              title="Smart Money Wallet"
              badge="Active"
              badgeStyle={{ background: "rgba(0,196,140,.1)", color: "var(--green2)", border: "1px solid rgba(0,196,140,.25)" }}
            />

            <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
              <div className="rounded-[12px] p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2" style={{ color: "var(--muted)" }}>Wallet Balance</div>
                <div className="text-[22px] font-semibold mb-1" style={{ color: "var(--green2)", fontFamily: "var(--font-dm-serif)" }}>
                  ₦{(walletBalance / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px]" style={{ color: "var(--green2)" }}>Available for agent actions</div>
              </div>

              <div className="rounded-[12px] p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2" style={{ color: "var(--muted)" }}>Executed This Month</div>
                <div className="text-[22px] font-semibold mb-1" style={{ color: "var(--text)", fontFamily: "var(--font-dm-serif)" }}>
                  {executedThisMonthText}
                </div>
                <div className="text-[11px]" style={{ color: "var(--muted)" }}>{executedActionsCount} actions · all approved</div>
              </div>

              <div
                className="rounded-[12px] p-4 cursor-pointer transition-all duration-150"
                style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                onClick={() => setShowLimitsModal(true)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--green)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2" style={{ color: "var(--muted)" }}>Per-Action Limit</div>
                <div className="text-[22px] font-semibold mb-1" style={{ color: "var(--text)", fontFamily: "var(--font-dm-serif)" }}>
                  ₦{limits ? (limits.perAction / 100).toLocaleString() : "50,000"}
                </div>
                <div className="text-[11px]" style={{ color: "var(--muted)" }}>Tap to adjust ⚙</div>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <PrimaryBtn onClick={() => setShowFundModal(true)}>+ Fund Wallet</PrimaryBtn>
              <GhostBtn>Withdraw to Bank</GhostBtn>
              <GhostBtn onClick={() => setShowLimitsModal(true)}>⚙ Agent Limits</GhostBtn>
            </div>
          </Card>

          {/* Pending Approval */}
          <Card>
            <CardHeader
              icon={
                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: "var(--gold)", fill: "none", strokeWidth: 2 }}>
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              }
              title="Pending Your Approval"
              badge={pending.length > 0 ? `${pending.length} waiting` : "All clear"}
              badgeStyle={
                pending.length > 0
                  ? { background: "rgba(245,166,35,.12)", color: "#C47F00", border: "1px solid rgba(245,166,35,.3)" }
                  : { background: "rgba(0,196,140,.1)", color: "var(--green2)", border: "1px solid rgba(0,196,140,.2)" }
              }
            />

            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[0, 1].map((i) => (
                  <div key={i} className="rounded-[12px] p-4 animate-pulse" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-[34px] h-[34px] rounded-[9px] flex-shrink-0" style={{ background: "var(--border)" }} />
                      <div className="flex-1">
                        <div className="h-3 w-40 rounded mb-2" style={{ background: "var(--border)" }} />
                        <div className="h-3 w-full rounded mb-1" style={{ background: "var(--border)" }} />
                        <div className="h-3 w-3/4 rounded" style={{ background: "var(--border)" }} />
                      </div>
                    </div>
                    <div className="h-3 w-48 rounded mb-3" style={{ background: "var(--border)" }} />
                    <div className="h-7 w-24 rounded-full" style={{ background: "var(--border)" }} />
                  </div>
                ))}
              </div>
            ) : pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-[40px] mb-3">⚡</div>
                <div className="text-[13px] font-semibold mb-2" style={{ color: "var(--text)" }}>No pending actions</div>
                <div className="text-[12px] max-w-[260px]" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                  When your buddy recommends a financial move, it will appear here for your approval before anything happens.
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pending.map((action) => {
                  const executing = executingId === action.id;
                  const displayAmount = action.amount ? `₦${(Number(action.amount) / 100).toLocaleString()}` : "Free";
                  
                  // Compute fallbacks for reasoning/benefit/accounts
                  const fallbackReasoning = action.action_type.includes("investment") 
                    ? "Based on high inflation in Nigeria, it is wise to allocate idle cash into high-yield mutual funds."
                    : action.action_type.includes("cancellation")
                    ? "You are paying for a service you haven't used this month. Cancelling it saves recurring fees."
                    : "Optimises monthly cash flow and helps meet savings goals.";
                    
                  const displayReasoning = fallbackReasoning;
                  const displayBenefit = action.action_type.includes("investment")
                    ? "Yields ~15% annually"
                    : action.action_type.includes("cancellation")
                    ? "Saves recurring fees monthly"
                    : "Boosts financial health";

                  const fromAccount = action.from_account || "Smart Money Wallet";
                  const toAccount = action.to_account || (action.action_type.includes("investment") ? "Mutual Fund" : "Service Provider");

                  return (
                    <div
                      key={action.id}
                      className="rounded-[12px] p-4 transition-all duration-300 border rgba(245,166,35,0.25)"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                    >
                      {/* Buddy row */}
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="flex items-center justify-center rounded-[9px] text-[16px] flex-shrink-0"
                          style={{ width: 34, height: 34, background: action.buddyBg || "var(--border)" }}
                        >
                          {action.buddyEmoji || "⚡"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold mb-1" style={{ color: "var(--text)" }}>
                            {action.description}
                          </div>
                          <div className="text-[11px]" style={{ color: "var(--muted)", lineHeight: 1.5 }}>
                            Suggested by {action.buddyName || "Buddy"}. &ldquo;{displayReasoning}&rdquo;
                          </div>
                        </div>
                      </div>

                      {/* Detail row */}
                      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                        <div className="text-[10px]" style={{ color: "var(--muted)" }}>
                          From: {fromAccount} · To: {toAccount} · Amount: {displayAmount}
                        </div>
                        <div className="text-[10px] font-semibold" style={{ color: "var(--gold)" }}>
                          Requested {new Date(action.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Benefit chip */}
                      <div
                        className="inline-flex items-center gap-1 px-[8px] py-[3px] rounded-full text-[10px] font-semibold mb-3"
                        style={{ background: "rgba(0,196,140,.1)", color: "var(--green2)", border: "1px solid rgba(0,196,140,.2)" }}
                      >
                        ✦ {displayBenefit}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <PrimaryBtn
                          onClick={() => handleApprove(action)}
                          flex1
                          loading={executing}
                        >
                          ✓ Approve &amp; Execute
                        </PrimaryBtn>
                        <GhostBtn
                          small
                          onClick={() => handleDecline(action.id)}
                        >
                          Decline
                        </GhostBtn>
                        <GhostBtn small onClick={() => router.push("/chat")}>Discuss →</GhostBtn>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Execution History */}
          <Card>
            <CardHeader
              icon={
                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: "var(--green)", fill: "none", strokeWidth: 2 }}>
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              }
              title="Execution History"
              badge="This month"
              badgeStyle={{ background: "var(--bg)", color: "var(--muted)", border: "1px solid var(--border)" }}
            />

            {history.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="text-[40px] mb-3">📋</div>
                <div className="text-[13px] font-semibold mb-2" style={{ color: "var(--text)" }}>No actions executed yet</div>
                <div className="text-[12px] max-w-[260px]" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                  Every approved or declined action will be logged here for your records.
                </div>
              </div>
            ) : (
              <div>
                {history.map((row, i) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-3 py-3"
                    style={{ borderBottom: i < history.length - 1 ? "1px solid var(--border)" : "none" }}
                  >
                    <div
                      className="flex items-center justify-center rounded-[8px] text-[14px] flex-shrink-0"
                      style={{
                        width: 32,
                        height: 32,
                        background: row.status === "done" ? "rgba(0,196,140,.1)" : "rgba(226,75,74,.1)",
                      }}
                    >
                      {row.status === "done" ? "✅" : "❌"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium truncate" style={{ color: "var(--text)" }}>
                        {row.title}
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                        {row.date} · {row.status === "done" ? "Approved" : "Declined"} · {row.buddy}
                        {row.outcome ? ` · ${row.outcome}` : ""}
                      </div>
                    </div>
                    <div
                      className="text-[11px] font-semibold whitespace-nowrap flex-shrink-0"
                      style={{ color: row.status === "done" ? "var(--green2)" : "var(--muted)" }}
                    >
                      {row.status === "done" ? "Done" : "Declined"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Bank & Investment Connections — full span */}
          <Card fullSpan>
            <CardHeader
              icon={
                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: "var(--green)", fill: "none", strokeWidth: 2 }}>
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              }
              title="Bank &amp; Investment Connections"
              action={<PrimaryBtn small>+ Connect Account</PrimaryBtn>}
            />

            {loadingConnections ? (
              <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                {[0, 1].map((i) => (
                  <div key={i} className="rounded-[12px] p-4 animate-pulse" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-[10px] flex-shrink-0" style={{ background: "var(--border)" }} />
                      <div>
                        <div className="h-3 w-24 rounded mb-2" style={{ background: "var(--border)" }} />
                        <div className="h-3 w-16 rounded" style={{ background: "var(--border)" }} />
                      </div>
                    </div>
                    <div className="h-3 w-full rounded mb-1" style={{ background: "var(--border)" }} />
                    <div className="h-3 w-4/5 rounded mb-4" style={{ background: "var(--border)" }} />
                  </div>
                ))}
              </div>
            ) : connections.length === 0 ? (
              <div className="rounded-[12px] p-8 text-center mb-5" style={{ background: "var(--bg)", border: "1px dashed var(--border)" }}>
                <div className="text-[28px] mb-2">⚡</div>
                <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>0 Connected Bank or Investment Accounts</div>
                <div className="text-[11px] mt-1 mb-4" style={{ color: "var(--muted)" }}>Connect your Gmail Bank Alerts or Bank Statement on the DataBank page to enable automated agent execution!</div>
                <PrimaryBtn onClick={() => router.push("/databank")} small>
                  Go to DataBank to Connect Account →
                </PrimaryBtn>
              </div>
            ) : (
              <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="rounded-[12px] p-4"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="flex items-center justify-center rounded-[10px] text-[18px] flex-shrink-0"
                        style={{ width: 36, height: 36, background: conn.bg }}
                      >
                        {conn.emoji}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{conn.name}</div>
                        <div className="text-[11px] font-medium" style={{ color: "var(--green2)" }}>● {conn.status}</div>
                      </div>
                    </div>
                    <div className="text-[11px] mb-4" style={{ color: "var(--muted)", lineHeight: 1.5 }}>
                      {conn.detail}
                    </div>
                    <div className="flex gap-2">
                      <GhostBtn small>Adjust Limits</GhostBtn>
                      <GhostBtn small danger>Disconnect</GhostBtn>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Security strip */}
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-[10px] text-[12px]"
              style={{ background: "rgba(0,196,140,.05)", border: "1px solid rgba(0,196,140,.15)", color: "var(--muted)", lineHeight: 1.6 }}
            >
              <span className="text-[16px] flex-shrink-0">🔐</span>
              <div>
                <strong style={{ color: "var(--text)" }}>Security model: </strong>
                All connections use bank-grade OAuth — we never store your login credentials. Every agent action requires your explicit in-app confirmation before execution. You can set per-action limits, daily limits, and instantly freeze agent access at any time. Your buddy can recommend, but only you can approve.
              </div>
            </div>
          </Card>

        </div>
      </div>

      {showFundModal && (
        <FundWalletModal
          onClose={() => setShowFundModal(false)}
          onFund={async () => {
            await fetchWalletBalance();
          }}
        />
      )}
      {showLimitsModal && <AgentLimitsModal onClose={() => setShowLimitsModal(false)} />}
    </div>
  );
}
