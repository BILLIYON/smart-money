"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore, GROUPS, type ChatMessage } from "@/store/chatStore";
import { getBuddy } from "@/lib/buddies";
import { InChatGoalCard } from "./InChatGoalCard";
import { InChatAgentCard } from "./InChatAgentCard";
import { SignalAlertCard } from "./SignalAlertCard";
import { useUserInitials } from "@/lib/hooks/useUserInitials";
import { useDataSources } from "@/lib/hooks/useDataSources";
import { useMilestoneToast } from "@/components/ui/MilestoneToast";

// ── DataBank nudge card ────────────────────────────────────
function DatabankNudge({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="rounded-[16px] border px-5 py-5"
      style={{ background: "var(--card)", borderColor: "var(--border)", borderLeft: "3px solid var(--green)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center flex-shrink-0 rounded-[10px] text-[20px]"
          style={{ width: 42, height: 42, background: "rgba(0,196,140,.1)" }}
        >
          🔗
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-semibold mb-1" style={{ color: "var(--text)" }}>
            Connect your financial data
          </div>
          <p className="text-[12px] leading-[1.6] mb-4" style={{ color: "var(--muted)" }}>
            Your buddy can give much sharper advice when it can see your real transactions, balances, and spending patterns. Connect your DataBank to unlock personalised insights.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/databank"
              className="px-4 py-[7px] rounded-[10px] text-[12px] font-semibold text-white transition-all duration-150"
              style={{ background: "var(--green)" }}
            >
              Connect DataBank →
            </Link>
            <button
              onClick={onDismiss}
              className="px-4 py-[7px] rounded-[10px] text-[12px] border cursor-pointer transition-all duration-150"
              style={{ background: "transparent", borderColor: "var(--border)", color: "var(--muted)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--green)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--green)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; }}
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Inline blocks ─────────────────────────────────────────
function InsightBlock({ label, text }: { label: string; text: string }) {
  return (
    <div
      className="my-2 rounded-r-[8px] pl-3 pr-3 py-[10px] text-[12px]"
      style={{ background: "rgba(0,196,140,.08)", borderLeft: "3px solid var(--green)" }}
    >
      <strong className="block text-[10px] uppercase tracking-[.5px] mb-1" style={{ color: "#00A677" }}>
        {label}
      </strong>
      <span style={{ color: "var(--text)" }}>{text}</span>
    </div>
  );
}

function SpendChartBlock({ title, bars }: { title: string; bars: { label: string; width: string; color: string; amount: string }[] }) {
  return (
    <div className="my-[10px] rounded-[10px] border px-[14px] py-3" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
      <div className="text-[10px] font-semibold uppercase tracking-[.5px] mb-[10px]" style={{ color: "#00A677" }}>
        {title}
      </div>
      <div className="flex flex-col gap-[7px]">
        {bars.map((bar, i) => (
          <div key={bar.label} className="flex items-center gap-2">
            <span className="text-[11px] flex-shrink-0 overflow-hidden text-ellipsis whitespace-nowrap" style={{ color: "var(--muted)", width: 88 }}>
              {bar.label}
            </span>
            <div className="flex-1 rounded-[4px] overflow-hidden" style={{ height: 8, background: "var(--border)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: bar.width }}
                transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.07 }}
                style={{ height: "100%", background: bar.color, borderRadius: 4 }}
              />
            </div>
            <span className="text-[11px] font-semibold text-right flex-shrink-0" style={{ color: "var(--text)", width: 52 }}>
              {bar.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Message Actions ────────────────────────────────────────
function MessageActions({ msg, threadKey, isGroup }: { msg: ChatMessage; threadKey: string; isGroup: boolean }) {
  const { updateMessage, updateGroupMessage } = useChatStore();
  const [savedFeedback, setSavedFeedback] = useState(false);

  function patch(p: Partial<ChatMessage>) {
    if (isGroup) updateGroupMessage(threadKey, msg.id, p);
    else updateMessage(threadKey, msg.id, p);
  }

  function handleSave() {
    navigator.clipboard.writeText(msg.content).catch(() => {});
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ text: msg.content }).catch(() => {});
    } else {
      navigator.clipboard.writeText(msg.content).catch(() => {});
    }
  }

  return (
    <div className="flex gap-[6px] mt-[7px] flex-wrap">
      {[
        { label: savedFeedback ? "✓ Saved!" : "💾 Save", onClick: handleSave },
        {
          label: "🎯 Set as Goal",
          onClick: () => { if (msg.goalCardData) patch({ goalCardOpen: !msg.goalCardOpen }); },
          active: !!msg.goalCardData,
        },
        {
          label: "⚡ Execute This",
          onClick: () => { if (msg.agentCardData) patch({ agentCardOpen: !msg.agentCardOpen }); },
          active: !!msg.agentCardData,
        },
        { label: "📤 Share", onClick: handleShare },
      ].map((a) => (
        <button
          key={a.label}
          onClick={a.onClick}
          className="px-[10px] py-1 rounded-full text-[10px] border cursor-pointer transition-all duration-150"
          style={{
            color: "var(--muted)",
            borderColor: "var(--border)",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--green)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--green)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
          }}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

// ── Follow-up card ─────────────────────────────────────────
function FollowUpCard({ threadKey, msgId }: { threadKey: string; msgId: string }) {
  const { dismissFollowUp, addMessage } = useChatStore();
  const { show: showToast } = useMilestoneToast();
  const buddy = getBuddy(threadKey);

  function handle(outcome: "yes" | "partial" | "no") {
    dismissFollowUp(threadKey, msgId);
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const content =
      outcome === "yes"
        ? "That's exactly the kind of follow-through that separates people who talk about wealth from people who build it. What's next?"
        : outcome === "partial"
        ? "Partial action is still action — most people do nothing at all. What stopped you from completing the rest, and what does that tell you?"
        : "Honesty is the first step. What got in the way? Let's look at the real obstacle and decide if the plan needs adjusting or if it's a matter of commitment.";
    if (outcome === "yes") {
      showToast(
        "Follow-through! 🎯",
        "You executed your financial plan. That's how wealth is built.",
        buddy?.avatarContent ?? "🏆"
      );
    }
    addMessage(threadKey, { id: `fu-${Date.now()}`, role: "ai", content, time, showActions: true });
  }

  return (
    <div
      className="mt-3 rounded-[14px] border px-[18px] py-4 relative overflow-hidden"
      style={{ background: "var(--card)", borderColor: "var(--border)", borderLeft: "3px solid var(--gold)" }}
    >
      <div className="flex items-center gap-2 mb-[10px]">
        <span className="text-[16px]">🔁</span>
        <span className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>72hr Check-In — Did you act on this?</span>
      </div>
      <p className="text-[11px] leading-[1.5] mb-3" style={{ color: "var(--muted)" }}>
        Three days ago I suggested: audit subscriptions, pay ₦200k toward debt, park ₦150k in a T-bill. What happened?
      </p>
      <div className="flex gap-2 flex-wrap">
        {([
          { label: "✓ Yes, I did it", color: "var(--green)", hoverBg: "rgba(0,196,140,.08)",  outcome: "yes"     as const },
          { label: "~ Partially",     color: "#C47F00",      hoverBg: "rgba(245,166,35,.06)", outcome: "partial" as const },
          { label: "✗ Not yet",       color: "#E24B4A",      hoverBg: "rgba(226,75,74,.06)",  outcome: "no"      as const },
        ]).map((btn) => (
          <button
            key={btn.label}
            onClick={() => handle(btn.outcome)}
            className="px-[14px] py-[6px] rounded-full text-[12px] font-medium border cursor-pointer transition-all duration-200"
            style={{ color: btn.color, borderColor: btn.color, background: "transparent" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = btn.hoverBg; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Single AI message ─────────────────────────────────────
function AiMessage({
  msg,
  avatarBg,
  avatarContent,
  avatarIsSerif,
  buddyColor,
  buddyLabel,
  threadKey,
  isGroup,
}: {
  msg: ChatMessage;
  avatarBg: string;
  avatarContent: string;
  avatarIsSerif: boolean;
  buddyColor?: string;
  buddyLabel?: string;
  threadKey: string;
  isGroup: boolean;
}) {
  const { updateMessage, updateGroupMessage, preFillInput } = useChatStore();

  function patch(p: Partial<ChatMessage>) {
    if (isGroup) updateGroupMessage(threadKey, msg.id, p);
    else updateMessage(threadKey, msg.id, p);
  }

  async function confirmGoal(data: Parameters<typeof patch>[0] extends { goalCardData?: infer T } ? T : never) {
    try {
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch { /* non-blocking */ }
    patch({ goalCardDone: true, goalCardOpen: false });
  }

  async function executeAgent() {
    try {
      const res = await fetch("/api/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg.agentCardData),
      });
      const json = await res.json();
      patch({ agentCardDone: true, agentCardOpen: false, agentCardRef: json.ref });
    } catch {
      patch({ agentCardDone: true, agentCardOpen: false, agentCardRef: "SMxxxxxx" });
    }
  }

  // System message (group only)
  if (msg.buddyId === "__system__") {
    return (
      <div
        className="self-center text-center px-4 py-2 rounded-[8px] border text-[11px]"
        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--muted)" }}
      >
        {msg.content.replace("__system__", "")}
      </div>
    );
  }

  return (
    <div className="flex gap-[10px]" style={{ maxWidth: "80%" }}>
      {/* Avatar */}
      <div
        className="flex items-center justify-center flex-shrink-0 rounded-[10px]"
        style={{
          width: 34, height: 34,
          background: avatarBg,
          fontSize: avatarIsSerif ? "12px" : "16px",
          ...(avatarIsSerif ? { fontFamily: "var(--font-dm-serif)", color: "rgba(255,255,255,.9)" } : {}),
        }}
      >
        {avatarContent}
      </div>

      <div className="min-w-0">
        {/* Group buddy name tag */}
        {isGroup && buddyLabel && (
          <div className="text-[10px] font-semibold mb-1" style={{ color: buddyColor ?? "var(--green2)" }}>
            {buddyLabel}
          </div>
        )}

        {/* Bubble */}
        <div
          className="px-[15px] py-3 text-[13px] leading-[1.7]"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "4px 14px 14px 14px",
            color: "var(--text)",
          }}
        >
          {msg.content.split("\n").map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          ))}
          {msg.insightHighlight && <InsightBlock label={msg.insightHighlight.label} text={msg.insightHighlight.text} />}
          {msg.spendChart && <SpendChartBlock title={msg.spendChart.title} bars={msg.spendChart.bars} />}
          {msg.streaming && (
            <span className="inline-block w-[2px] h-[14px] ml-[2px] align-middle animate-pulse" style={{ background: "var(--green)" }} />
          )}
        </div>

        {/* Actions */}
        {msg.showActions && !msg.streaming && (
          <MessageActions msg={msg} threadKey={threadKey} isGroup={isGroup} />
        )}

        {/* Goal card */}
        {msg.goalCardData && msg.goalCardOpen && !msg.goalCardDone && (
          <InChatGoalCard
            data={msg.goalCardData}
            done={false}
            onConfirm={(d) => confirmGoal(d as never)}
            onDismiss={() => patch({ goalCardOpen: false })}
          />
        )}
        {msg.goalCardDone && msg.goalCardData && (
          <InChatGoalCard data={msg.goalCardData} done onConfirm={() => {}} onDismiss={() => {}} />
        )}

        {/* Agent card */}
        {msg.agentCardData && msg.agentCardOpen && !msg.agentCardDone && (
          <InChatAgentCard
            data={msg.agentCardData}
            done={false}
            onExecute={executeAgent}
            onDecline={() => patch({ agentCardOpen: false })}
            onDiscuss={(text) => {
              patch({ agentCardOpen: false });
              preFillInput(text);
            }}
          />
        )}
        {msg.agentCardDone && msg.agentCardData && (
          <InChatAgentCard
            data={msg.agentCardData}
            done
            refNumber={msg.agentCardRef}
            onExecute={() => {}}
            onDecline={() => {}}
            onDiscuss={() => {}}
          />
        )}

        {/* Timestamp */}
        {msg.time && (
          <div className="text-[10px] mt-1" style={{ color: "var(--muted)" }}>{msg.time}</div>
        )}

        {/* Follow-up */}
        {msg.showFollowUp && <FollowUpCard threadKey={threadKey} msgId={msg.id} />}
      </div>
    </div>
  );
}

// ── User message ───────────────────────────────────────────
function UserMessage({ msg }: { msg: ChatMessage }) {
  const initials = useUserInitials();
  return (
    <div className="flex gap-[10px] self-end flex-row-reverse" style={{ maxWidth: "80%" }}>
      <div
        className="flex items-center justify-center flex-shrink-0 rounded-[10px] text-[12px] font-semibold"
        style={{ width: 34, height: 34, background: "var(--gold)", color: "#fff" }}
      >
        {initials}
      </div>
      <div>
        <div
          className="px-[15px] py-3 text-[13px] leading-[1.7] text-white"
          style={{ background: "var(--navy)", borderRadius: "14px 4px 14px 14px" }}
        >
          {msg.content}
        </div>
        <div className="text-[10px] mt-1 text-right" style={{ color: "var(--muted)" }}>{msg.time}</div>
      </div>
    </div>
  );
}

// ── Resolve buddy display info ─────────────────────────────
const GROUP_BUDDY_COLORS: Record<string, string> = {
  buffett:    "#2D7A2D",
  contrarian: "var(--green2)",
  cardone:    "#7B3FC4",
  ramsey:     "#2B79B4",
  kiyosaki:   "#A01010",
  lagos:      "#2B79B4",
  academic:   "#4285F4",
  architect:  "#A0522D",
  closer:     "#2D8A2D",
  lynch:      "#2B5F9E",
  trump:      "#9A6A10",
};

function resolveAvatar(buddyId: string) {
  const b = getBuddy(buddyId);
  if (b) return { bg: b.avatarBg, content: b.avatarContent, serif: b.avatarIsSerif, name: b.name };
  return { bg: "var(--navy)", content: "🤖", serif: false, name: "AI" };
}

// ── Chat header ────────────────────────────────────────────
function ChatHeader({ buddy }: { buddy: ReturnType<typeof getBuddy> }) {
  const { chips, noData } = useDataSources();
  return (
    <div
      className="flex items-center gap-3 px-5 py-[14px] flex-shrink-0"
      style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0 rounded-[10px]"
        style={{
          width: 38, height: 38,
          background: buddy?.avatarBg ?? "var(--navy)",
          fontSize: buddy?.avatarIsSerif ? "14px" : "18px",
          ...(buddy?.avatarIsSerif ? { fontFamily: "var(--font-dm-serif)", color: "rgba(255,255,255,.9)" } : {}),
        }}
      >
        {buddy?.avatarContent ?? "🤖"}
      </div>
      <div className="flex-1">
        <div className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>
          {buddy?.name ?? "Finance Buddy"}
          {buddy?.isFanSim && (
            <span
              className="ml-2 text-[8px] px-2 py-[2px] rounded-full border uppercase tracking-[.5px] font-semibold"
              style={{ background: "rgba(245,166,35,.1)", borderColor: "rgba(245,166,35,.25)", color: "#C47F00" }}
            >
              Fan Sim
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--green)" }}>
          <span className="inline-block w-[6px] h-[6px] rounded-full" style={{ background: "var(--green)" }} />
          Live · Watching your data
        </div>
      </div>
      <div className="hidden md:flex items-center gap-2">
        {chips.map((chip) =>
          noData ? (
            <a
              key={chip}
              href="/databank"
              className="px-[10px] py-[4px] rounded-full text-[11px] border"
              style={{ background: "rgba(245,166,35,.08)", borderColor: "rgba(245,166,35,.3)", color: "#C47F00" }}
            >
              {chip}
            </a>
          ) : (
            <span key={chip} className="px-[10px] py-[4px] rounded-full text-[11px] border" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--muted)" }}>
              {chip}
            </span>
          )
        )}
      </div>
    </div>
  );
}

// ── 1:1 thread ─────────────────────────────────────────────
export function MessageThread() {
  const { activeBuddyId, threads, hasConnectedDatabank, setShowDatabankNudge, showDatabankNudge } = useChatStore();
  const buddy = getBuddy(activeBuddyId);
  const messages = threads[activeBuddyId] ?? [];
  const bottomRef = useRef<HTMLDivElement>(null);
  // showDatabankNudge acts as a "dismissed" flag; nudge shows when not connected and not dismissed
  const showNudge = messages.length === 0 && !hasConnectedDatabank && !showDatabankNudge;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  // The "signal alert" demo message — injected as a static card in the seed thread
  const SIGNAL_SHOWN = activeBuddyId === "contrarian";

  return (
    <>
      <ChatHeader buddy={buddy} />
      <div
        className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-[18px]"
        style={{ background: "var(--bg)", scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) =>
            msg.role === "user" ? (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <UserMessage msg={msg} />
              </motion.div>
            ) : (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <AiMessage
                  msg={msg}
                  avatarBg={buddy?.avatarBg ?? "var(--navy)"}
                  avatarContent={buddy?.avatarContent ?? "🤖"}
                  avatarIsSerif={buddy?.avatarIsSerif ?? false}
                  threadKey={activeBuddyId}
                  isGroup={false}
                />
              </motion.div>
            )
          )}
        </AnimatePresence>

        {/* Demo signal alert in contrarian thread */}
        {SIGNAL_SHOWN && (
          <SignalAlertCard
            sourceLabel="⚡ Signal · Lagos Real Estate Radar"
            buddyAv="WB"
            buddyBg="#2D5A2D"
            buddyIsSerif
            buddyName="Warren Buffett (Fan Sim)"
            pastContextQuote="💬 From our conversation on Mar 12: You told me you want to buy property in Ikoyi with a budget of ₦200M and a 3–5 year development horizon. I've been watching for this."
            signalText="A 3-bedroom flat on Banana Island Road, Ikoyi just listed at ₦185M asking — ₦15M inside your budget. Comparable sales in the area over 12 months averaged ₦200M. That's an 8% discount. The agent is Kunle Adeyemi at Jide Taiwo & Co. I think it's worth a conversation."
            dataChips={[
              { label: "📍 Banana Island Rd, Ikoyi" },
              { label: "💰 Asking:", highlight: "₦185M" },
              { label: "✅ Budget fit:", highlight: "₦15M headroom" },
              { label: "🕐 Listed:", highlight: "2hrs ago" },
            ]}
            manageHref="/databank"
            onYes={() => {}}
            onMore={() => {}}
            onDismiss={() => {}}
          />
        )}

        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5" style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>
            {showNudge && (
              <DatabankNudge onDismiss={() => setShowDatabankNudge(true)} />
            )}
            <div className="text-center">
              <div className="text-[32px] mb-3">{buddy?.avatarContent ?? "💬"}</div>
              <div className="text-[14px] font-semibold mb-1" style={{ color: "var(--text)" }}>
                Start a conversation with {buddy?.name ?? "your buddy"}
              </div>
              <div className="text-[12px]" style={{ color: "var(--muted)" }}>
                Ask about your finances, goals, or get advice.
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </>
  );
}

// ── Group thread ───────────────────────────────────────────
export function GroupMessageThread() {
  const { activeGroupId, groupThreads } = useChatStore();
  const messages = groupThreads[activeGroupId] ?? [];
  const bottomRef = useRef<HTMLDivElement>(null);
  const { chips: groupChips, noData: groupNoData } = useDataSources();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  const groupDef = GROUPS.find((g) => g.id === activeGroupId);
  const groupName = groupDef?.name ?? "Group Chat";
  const buddyCount = groupDef?.avatars.length ?? 2;
  // For avatar stacks, fall back to deriving from thread messages
  const threadBuddyIds = Array.from(new Set(messages.filter((m) => m.role === "ai" && m.buddyId && m.buddyId !== "__system__").map((m) => m.buddyId!)));
  const avatarIds = threadBuddyIds.length > 0 ? threadBuddyIds : (groupDef?.buddyIds ?? []);

  return (
    <>
      {/* Group header */}
      <div
        className="flex items-center gap-3 px-5 py-[14px] flex-shrink-0"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
      >
        {/* Stacked avatars */}
        <div className="flex items-center flex-shrink-0" style={{ marginRight: 4 }}>
          {avatarIds.slice(0, 3).map((bid, i) => {
            const av = resolveAvatar(bid);
            return (
              <div
                key={bid}
                className="flex items-center justify-center rounded-[8px]"
                style={{
                  width: 30, height: 30,
                  background: av.bg,
                  fontSize: av.serif ? "11px" : "14px",
                  ...(av.serif ? { fontFamily: "var(--font-dm-serif)", color: "rgba(255,255,255,.9)" } : {}),
                  marginLeft: i > 0 ? -8 : 0,
                  border: "2px solid var(--card)",
                  zIndex: 3 - i,
                  position: "relative",
                }}
              >
                {av.content}
              </div>
            );
          })}
        </div>

        <div className="flex-1">
          <div className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>
            {groupName}
          </div>
          <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--green)" }}>
            <span className="inline-block w-[6px] h-[6px] rounded-full" style={{ background: "var(--green)" }} />
            {buddyCount} buddies · {groupName}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          {groupChips.map((chip) =>
            groupNoData ? (
              <a
                key={chip}
                href="/databank"
                className="px-[10px] py-[4px] rounded-full text-[11px] border"
                style={{ background: "rgba(245,166,35,.08)", borderColor: "rgba(245,166,35,.3)", color: "#C47F00" }}
              >
                {chip}
              </a>
            ) : (
              <span key={chip} className="px-[10px] py-[4px] rounded-full text-[11px] border" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--muted)" }}>
                {chip}
              </span>
            )
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-[18px]"
        style={{ background: "var(--bg)", scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            if (msg.role === "user") {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <UserMessage msg={msg} />
                </motion.div>
              );
            }
            const av = msg.buddyId ? resolveAvatar(msg.buddyId) : { bg: "var(--navy)", content: "🤖", serif: false, name: "AI" };
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <AiMessage
                  msg={msg}
                  avatarBg={av.bg}
                  avatarContent={av.content}
                  avatarIsSerif={av.serif}
                  buddyColor={msg.buddyId ? GROUP_BUDDY_COLORS[msg.buddyId] : undefined}
                  buddyLabel={av.name}
                  threadKey={activeGroupId}
                  isGroup
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-[32px] mb-3">👥</div>
              <div className="text-[14px] font-semibold mb-1" style={{ color: "var(--text)" }}>Group chat ready</div>
              <div className="text-[12px]" style={{ color: "var(--muted)" }}>Ask your council anything. Use @ to direct at a specific buddy.</div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </>
  );
}
