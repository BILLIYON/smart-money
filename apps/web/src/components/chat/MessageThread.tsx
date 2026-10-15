"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore, GROUPS, type ChatMessage, type GoalCardData } from "@/store/chatStore";
import { getBuddy, ALL_BUDDIES, getAllBuddies, type Buddy } from "@/lib/buddies";
import { isImageAvatar } from "@/lib/utils";
import { InChatGoalCard } from "./InChatGoalCard";
import { InChatAgentCard } from "./InChatAgentCard";
import { InChatDatabankWriteCard } from "./InChatDatabankWriteCard";
import { SignalAlertCard } from "./SignalAlertCard";
import { useUserInitials } from "@/lib/hooks/useUserInitials";
import { useDataSources } from "@/lib/hooks/useDataSources";
import { useMilestoneToast } from "@/components/ui/MilestoneToast";
import { popup } from "@/store/popupStore";
import { useDatabankStore } from "@/store/databankStore";
import toast from "react-hot-toast";



// ── Message Actions ────────────────────────────────────────
function MessageActions({ msg, threadKey, isGroup }: { msg: ChatMessage; threadKey: string; isGroup: boolean }) {
  const { updateMessage, updateGroupMessage } = useChatStore();
  const [savedFeedback, setSavedFeedback] = useState(false);

  function patch(p: Partial<ChatMessage>) {
    if (isGroup) updateGroupMessage(threadKey, msg.id, p);
    else updateMessage(threadKey, msg.id, p);
  }

  function handleSave() {
    popup.success("Saved to DataBank 💾", "Response bookmarked to your financial DataBank.");
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ text: msg.content }).catch(() => {});
    } else {
      navigator.clipboard.writeText(msg.content).catch(() => {});
      popup.success("Copied", "Message copied to clipboard.");
    }
  }

  function handleSaveAsGoal() {
    if (!msg.goalCardData) {
      const amountMatch = msg.content.match(/₦\s*([\d,]+)/i) || msg.content.match(/([\d,]+)\s*(naira|k)/i);
      const extractedAmount = amountMatch ? `₦${amountMatch[1]}` : "₦100,000";
      const goalTitle = msg.content.slice(0, 42).replace(/\n/g, " ").trim() + "...";

      const synthesizedGoal: GoalCardData = {
        name: goalTitle,
        amount: extractedAmount,
        date: "Dec 2026",
        buddyName: getBuddy(threadKey)?.name ?? "AI Buddy",
      };

      patch({
        goalCardData: synthesizedGoal,
        goalCardOpen: true,
      });
    } else {
      patch({ goalCardOpen: !msg.goalCardOpen });
    }
  }

  function handleIWillDoThis() {
    patch({
      showFollowUp: true,
      followUpDone: false,
    });
    popup.success("Action Committed! ⚡", "Registered in your 48-Hour Accountability Tracker.");
  }

  const actions = [
    { label: savedFeedback ? "✓ Saved!" : "💾 Save", onClick: handleSave, show: msg.content.trim() !== "" },
    {
      label: msg.goalCardDone ? "✅ Saved to Goals" : "🎯 Save as Goal",
      onClick: handleSaveAsGoal,
      show: msg.content.trim() !== "" && !msg.goalCardDone,
    },
    {
      label: msg.followUpDone ? "✓ Action Completed" : "⚡ I Will Do This",
      onClick: handleIWillDoThis,
      show: msg.content.trim() !== "" && !msg.followUpDone,
    },
    {
      label: "⚡ Execute Transfer",
      onClick: () => patch({ agentCardOpen: !msg.agentCardOpen }),
      show: !!msg.agentCardData,
    },
    { label: "📤 Share", onClick: handleShare, show: msg.content.trim() !== "" },
  ].filter((a) => a.show);

  if (actions.length === 0) return null;

  return (
    <div className="flex gap-[6px] mt-[7px] flex-wrap">
      {actions.map((a) => (
        <button
          key={a.label}
          onClick={a.onClick}
          className="px-[10px] py-1 rounded-full text-[10px] font-semibold border cursor-pointer transition-all duration-150"
          style={{
            color: a.label.includes("I Will Do") || a.label.includes("Goal") ? "var(--green2)" : "var(--muted)",
            borderColor: a.label.includes("I Will Do") || a.label.includes("Goal") ? "rgba(0,196,140,0.4)" : "var(--border)",
            background: a.label.includes("I Will Do") ? "rgba(0,196,140,0.08)" : "transparent",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--green)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--green)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              a.label.includes("I Will Do") || a.label.includes("Goal") ? "rgba(0,196,140,0.4)" : "var(--border)";
            (e.currentTarget as HTMLButtonElement).style.color =
              a.label.includes("I Will Do") || a.label.includes("Goal") ? "var(--green2)" : "var(--muted)";
          }}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

// ── Follow-up card with 48-Hour Accountability Timer ───────────
function FollowUpCard({
  threadKey,
  msgId,
  isGroup = false,
}: {
  threadKey: string;
  msgId: string;
  isGroup?: boolean;
}) {
  const { updateMessage, updateGroupMessage, addMessage } = useChatStore();
  const { show: showToast } = useMilestoneToast();
  const buddy = getBuddy(threadKey);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    // 48 hours countdown from now
    const expiresAt = Date.now() + 48 * 3600 * 1000;
    const interval = setInterval(() => {
      const remainingMs = expiresAt - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft("Timer expired (48h limit reached)");
        clearInterval(interval);
      } else {
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${mins}m ${secs}s remaining`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function handle(outcome: "yes" | "partial" | "no") {
    if (isGroup) {
      updateGroupMessage(threadKey, msgId, { showFollowUp: false, followUpDone: true });
    } else {
      updateMessage(threadKey, msgId, { showFollowUp: false, followUpDone: true });
    }

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const content =
      outcome === "yes"
        ? "🎯 Outstanding! You completed your 48-hour action commitment. I've marked this task as complete and stopped sending reminders for it!"
        : outcome === "partial"
        ? "Partial action is still action — most people do nothing at all. What stopped you from completing the rest, and what does that tell you?"
        : "Honesty is the first step. What got in the way? Let's look at the real obstacle and decide if the plan needs adjusting.";

    if (outcome === "yes") {
      showToast(
        "Action Completed! 🎯",
        "You executed your financial plan within 48 hours. Reminders stopped!",
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
      <div className="flex items-center justify-between gap-2 mb-[10px]">
        <div className="flex items-center gap-2">
          <span className="text-[16px]">⏳</span>
          <span className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>
            48-Hour Action Commitment Tracker
          </span>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20">
          {timeLeft || "48h 00m remaining"}
        </span>
      </div>

      <p className="text-[11px] leading-[1.5] mb-3" style={{ color: "var(--muted)" }}>
        You committed: &ldquo;I Will Do This&rdquo; for this financial advice. Have you completed it yet?
      </p>

      <div className="flex gap-2 flex-wrap">
        {([
          { label: "✓ Yes, I've Done It", color: "var(--green)", hoverBg: "rgba(0,196,140,.08)", outcome: "yes" as const },
          { label: "~ Partially", color: "#C47F00", hoverBg: "rgba(245,166,35,.06)", outcome: "partial" as const },
          { label: "✗ Not yet", color: "#E24B4A", hoverBg: "rgba(226,75,74,.06)", outcome: "no" as const },
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

// ── Typing indicator ──────────────────────────────────────
function TypingIndicator({ buddyName }: { buddyName?: string }) {
  return (
    <div className="flex items-center gap-2.5 py-0.5">
      <div className="flex items-center gap-1.5">
        <motion.span
          className="w-[7px] h-[7px] rounded-full inline-block"
          style={{ background: "var(--green)" }}
          animate={{ y: [0, -5, 0], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0 }}
        />
        <motion.span
          className="w-[7px] h-[7px] rounded-full inline-block"
          style={{ background: "var(--green)" }}
          animate={{ y: [0, -5, 0], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />
        <motion.span
          className="w-[7px] h-[7px] rounded-full inline-block"
          style={{ background: "var(--green)" }}
          animate={{ y: [0, -5, 0], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
        />
      </div>
      <span className="text-[12px] font-medium animate-pulse" style={{ color: "var(--muted)" }}>
        {buddyName ? `${buddyName} is analyzing DataBank & typing...` : "Searching DataBank & typing..."}
      </span>
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

  async function confirmGoal(data: GoalCardData) {
    // Parse the amount string (e.g. "₦500,000" or "500000") into kobo
    const rawAmount = String(data.amount ?? "0").replace(/[^\d.]/g, "");
    const amountNaira = parseFloat(rawAmount) || 0;
    const amountKobo = Math.round(amountNaira * 100);

    // Parse target date — if it's a month+year like "Dec 2026", convert to ISO
    let targetDate: string | undefined;
    try {
      const parsed = new Date(data.date);
      if (!isNaN(parsed.getTime())) targetDate = parsed.toISOString().split("T")[0];
    } catch { /* leave undefined */ }

    try {
      await fetch("/api/goals/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.name,
          target_amount: amountKobo,
          current_amount: 0,
          target_date: targetDate,
          buddy_id: threadKey,
        }),
      });
    } catch { /* non-blocking */ }
    patch({ goalCardDone: true, goalCardOpen: false });
  }

  async function executeAgent() {
    try {
      const rawAmt = msg.agentCardData?.amount || "0";
      const amountNum = parseFloat(String(rawAmt).replace(/[^0-9.]/g, "")) || 0;
      const amountKobo = Math.round(amountNum * 100);

      const res = await fetch("/api/agent/execute-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: msg.agentCardData?.title || "Agent Action",
          action_type: msg.agentCardData?.action || "transfer",
          amount: amountKobo,
          buddy_id: threadKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to execute agent action");
        return;
      }

      patch({
        agentCardDone: true,
        agentCardOpen: true,
        agentCardRef: data.reference || ("SM" + Date.now().toString(36).toUpperCase()),
      });

      toast.success("Agent Action Executed & Saved to DataBank!");
      useDatabankStore.getState().loadContext().catch(() => {});
    } catch {
      toast.error("Failed to execute agent action");
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

  const isWaiting = msg.streaming && (!msg.content || !msg.content.trim());

  return (
    <div className="flex gap-2 sm:gap-[10px]" style={{ maxWidth: "92%" }}>
      {/* Avatar */}
      <div
        className="flex items-center justify-center flex-shrink-0 rounded-[10px] overflow-hidden"
        style={{
          width: 34, height: 34,
          background: avatarBg,
          fontSize: avatarIsSerif ? "12px" : "16px",
          ...(avatarIsSerif ? { fontFamily: "var(--font-dm-serif)", color: "rgba(255,255,255,.9)" } : {}),
        }}
      >
        {isImageAvatar(avatarContent) ? (
          <img src={avatarContent} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          avatarContent
        )}
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
          {isWaiting ? (
            <TypingIndicator buddyName={buddyLabel ?? (msg.buddyId ? getBuddy(msg.buddyId)?.name : undefined)} />
          ) : (
            <>
              {msg.content.split("\n").map((line, i, arr) => (
                <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
              ))}
              {msg.insightHighlight && <InsightBlock label={msg.insightHighlight.label} text={msg.insightHighlight.text} />}
              {msg.spendChart && <SpendChartBlock title={msg.spendChart.title} bars={msg.spendChart.bars} />}
              {msg.streaming && (
                <span className="inline-block w-[2px] h-[14px] ml-[2px] align-middle animate-pulse" style={{ background: "var(--green)" }} />
              )}
            </>
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
            onConfirm={(d) => confirmGoal(d)}
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

        {/* Databank Write card */}
        {msg.databankWriteData && (
          <InChatDatabankWriteCard
            data={msg.databankWriteData}
            done={!!msg.databankWriteDone}
            onDismiss={() => patch({ databankWriteData: undefined })}
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
    <div className="flex gap-2 sm:gap-[10px] self-end flex-row-reverse" style={{ maxWidth: "92%" }}>
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

function resolveAvatar(buddyId: string, communityBuddies: Buddy[] = []) {
  const b = communityBuddies.find((x) => x.id === buddyId) || getBuddy(buddyId);
  if (b) return { bg: b.avatarBg, content: b.avatarContent, serif: b.avatarIsSerif, name: b.name };
  return { bg: "var(--navy)", content: "🤖", serif: false, name: "AI" };
}

// ── Chat History Modal ──────────────────────────────────────
function ChatHistoryModal({
  onClose,
  sessions,
  activeSessionId,
  activeBuddyId,
  onSelectSession,
  onDeleteSession,
}: {
  onClose: () => void;
  sessions: any[];
  activeSessionId: string | null;
  activeBuddyId: string;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [showAllBuddies, setShowAllBuddies] = useState(false);

  const activeBuddy = getBuddy(activeBuddyId);

  const buddySessions = sessions.filter((s) =>
    showAllBuddies ? true : (s.buddy_ids?.includes(activeBuddyId) || !s.buddy_ids?.length)
  );

  const filtered = buddySessions.filter((s) =>
    (s.session_name || "Saved Conversation").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-[520px] rounded-[18px] p-6 shadow-2xl flex flex-col max-h-[85vh]"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[20px]">📜</span>
            <div>
              <div className="text-[16px] font-bold" style={{ color: "var(--text)" }}>
                Chat History for {activeBuddy?.name || "Buddy"}
              </div>
              <div className="text-[11px]" style={{ color: "var(--muted)" }}>Click any saved topic to resume your conversation</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[18px] cursor-pointer"
            style={{ background: "var(--bg)", color: "var(--muted)" }}
          >
            ×
          </button>
        </div>

        {/* Filter Toggle Switch */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <input
            type="text"
            placeholder="Search past conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 rounded-[10px] text-[12px] outline-none border"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
          />
          <button
            onClick={() => setShowAllBuddies(!showAllBuddies)}
            className="text-[11px] font-semibold px-3 py-2 rounded-[10px] border whitespace-nowrap cursor-pointer transition-all"
            style={{
              background: showAllBuddies ? "rgba(0,196,140,0.15)" : "var(--bg)",
              borderColor: showAllBuddies ? "var(--green)" : "var(--border)",
              color: showAllBuddies ? "var(--green2)" : "var(--muted)",
            }}
          >
            {showAllBuddies ? "🌐 All Buddies" : `👤 ${activeBuddy?.name || "Active Buddy"}`}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-[220px]" style={{ scrollbarWidth: "thin" }}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: "var(--muted)" }}>
              <div className="text-[32px] mb-2">💬</div>
              <div className="text-[13px] font-semibold">No matching chat history found</div>
              <div className="text-[11px]">Start a new conversation to save your financial topics.</div>
            </div>
          ) : (
            filtered.map((sess) => {
              const isActive = sess.id === activeSessionId;
              const dateStr = sess.last_message_at
                ? new Date(sess.last_message_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                : "Saved session";

              return (
                <div
                  key={sess.id}
                  onClick={() => onSelectSession(sess.id)}
                  className="flex items-center justify-between p-3.5 rounded-[12px] border cursor-pointer transition-all hover:scale-[1.01]"
                  style={{
                    background: isActive ? "rgba(0,196,140,0.1)" : "var(--bg)",
                    borderColor: isActive ? "rgba(0,196,140,0.4)" : "var(--border)",
                  }}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div
                      className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[16px] flex-shrink-0"
                      style={{ background: "rgba(0,196,140,0.15)", color: "var(--green2)" }}
                    >
                      💬
                    </div>
                    <div className="overflow-hidden min-w-0">
                      <div className="text-[13px] font-semibold truncate" style={{ color: "var(--text)" }}>
                        {sess.session_name || "Saved Conversation"}
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--muted)" }}>
                        Last active: {dateStr}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        background: isActive ? "var(--green)" : "rgba(255,255,255,0.06)",
                        color: isActive ? "#fff" : "var(--green2)",
                      }}
                    >
                      {isActive ? "Active Thread" : "Resume ▶"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(sess.id);
                      }}
                      className="text-[12px] p-1 text-red-400 hover:text-red-500 cursor-pointer"
                      title="Delete chat"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Chat header ────────────────────────────────────────────
function ChatHeader({ buddy }: { buddy?: any }) {
  const { chips, noData } = useDataSources();
  const { sessions, activeSessionId, activeBuddyId, enableCrossSessionMemory, loadSessionMessages, deleteSession, renameSession, setMobileView } = useChatStore();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const displayTitle = activeSession?.session_name || (buddy?.name ? `${buddy.name} Strategy` : "Finance Discussion");

  function handleStartEdit() {
    setTitleInput(displayTitle);
    setIsEditingTitle(true);
  }

  async function handleSaveEdit() {
    if (activeSessionId && titleInput.trim()) {
      await renameSession(activeSessionId, titleInput.trim());
    }
    setIsEditingTitle(false);
  }

  return (
    <>
      <div
        className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-[12px] flex-shrink-0"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
      >
        <button
          onClick={() => setMobileView("list")}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 mr-1 transition-colors hover:bg-white/10"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div
          className="flex items-center justify-center flex-shrink-0 rounded-[10px] text-[18px] overflow-hidden"
          style={{
            width: 38,
            height: 38,
            background: buddy?.avatarBg ?? "var(--navy)",
            fontSize: buddy?.avatarIsSerif ? "14px" : "18px",
            ...(buddy?.avatarIsSerif ? { fontFamily: "var(--font-dm-serif)", color: "rgba(255,255,255,.9)" } : {}),
          }}
        >
          {isImageAvatar(buddy?.avatarContent) ? (
            <img src={buddy.avatarContent} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            buddy?.avatarContent ?? "🤖"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-[14px] font-semibold truncate" style={{ color: "var(--text)" }}>
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

            {/* Conversation Topic Name Badge */}
            {isEditingTitle ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                  className="px-2 py-[2px] text-[11px] rounded bg-black/20 text-white outline-none border border-emerald-500"
                  autoFocus
                />
                <button onClick={handleSaveEdit} className="text-[10px] bg-emerald-500 text-white px-2 py-[2px] rounded font-bold">
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={handleStartEdit}
                title="Click to rename conversation topic"
                className="text-[11px] font-medium px-2 py-[2px] rounded-md truncate max-w-[220px] flex items-center gap-1 transition-all hover:bg-emerald-500/20 cursor-pointer"
                style={{ background: "rgba(0,196,140,0.12)", color: "var(--green2)", border: "1px solid rgba(0,196,140,0.25)" }}
              >
                <span>💬 {displayTitle}</span>
                <span className="opacity-60 text-[10px]">✏️</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--green)" }}>
            <span className="inline-block w-[6px] h-[6px] rounded-full" style={{ background: "var(--green)" }} />
            <span>Live · Watching your data</span>
            {enableCrossSessionMemory && (
              <span className="ml-2 text-[10px] font-medium text-emerald-400 opacity-90" title="Cross-Session AI Memory Enabled">
                🧠 Memory Active
              </span>
            )}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 cursor-pointer transition-all hover:border-emerald-500"
            style={{ background: "rgba(0,196,140,0.08)", borderColor: "rgba(0,196,140,0.3)", color: "var(--green2)" }}
          >
            <span>📜 Chat History</span>
            <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
              {sessions.length}
            </span>
          </button>

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

      {showHistoryModal && (
        <ChatHistoryModal
          onClose={() => setShowHistoryModal(false)}
          sessions={sessions}
          activeSessionId={activeSessionId}
          activeBuddyId={activeBuddyId}
          onSelectSession={(id) => {
            loadSessionMessages(id);
            setShowHistoryModal(false);
          }}
          onDeleteSession={deleteSession}
        />
      )}
    </>
  );
}

// ── DataBank nudge card ────────────────────────────────────
function DatabankNudge({ onDismiss, onUseMyData }: { onDismiss: () => void; onUseMyData: () => void }) {
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
          ⚡
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-semibold mb-1" style={{ color: "var(--text)" }}>
            Connect your financial data &amp; goals
          </div>
          <p className="text-[12px] leading-[1.6] mb-4" style={{ color: "var(--muted)" }}>
            Your buddy can give much sharper advice when it can see your real transactions, balances, wallet info, goals, and saved notes.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onUseMyData}
              className="px-4 py-[7px] rounded-[10px] text-[12px] font-semibold text-white cursor-pointer transition-all duration-150 flex items-center gap-1.5"
              style={{ background: "var(--green)" }}
            >
              <span>Use My Data ⚡</span>
            </button>
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
            <span className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>{bar.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 1:1 thread ─────────────────────────────────────────────
export function MessageThread() {
  const {
    activeBuddyId,
    threads,
    hasConnectedDatabank,
    setShowDatabankNudge,
    showDatabankNudge,
    setHasConnectedDatabank,
    addMessage,
    signalAlerts,
    dismissSignalAlert,
    communityBuddies,
  } = useChatStore();

  const ALL_BUDDY_LIST = getAllBuddies(communityBuddies);
  const buddy = ALL_BUDDY_LIST.find((b) => b.id === activeBuddyId) ?? ALL_BUDDY_LIST[0];
  const messages = threads[activeBuddyId] ?? [];
  const bottomRef = useRef<HTMLDivElement>(null);
  const showNudge = messages.length === 0 && !hasConnectedDatabank && !showDatabankNudge;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  const handleUseMyData = async () => {
    setShowDatabankNudge(true);
    setHasConnectedDatabank(true);
    popup.success("Data Connected ⚡", `Connecting your Wallet, Goals & DataBank to ${buddy?.name || "your AI Buddy"}...`);

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const buddyName = buddy?.name ?? "Your AI Buddy";

    let contextData: any = null;
    try {
      const res = await fetch("/api/databank/context");
      if (res.ok) {
        contextData = await res.json();
      }
    } catch { /* fallback */ }

    const hasEntries = (contextData?.recentTransactions?.length ?? 0) > 0;
    const hasGoals = (contextData?.activeGoals?.length ?? 0) > 0;
    const hasCategories = (contextData?.topCategories?.length ?? 0) > 0;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

    if (!hasEntries && !hasGoals && !hasCategories) {
      const emptyMessage: ChatMessage = {
        id: `proactive-${Date.now()}`,
        role: "ai",
        content: isMobile
          ? `📊 **DataBank Review by ${buddyName}:**\nYou currently have **0 transactions** and **0 active goals**.\n\nTo unlock charts, analytics, and advice, click **DataBank** to sync your account or upload a statement!`
          : `📊 **DataBank Review by ${buddyName}:**\nYou currently have **0 connected bank transactions** and **0 active goals** in your account.\n\nTo unlock personalized spending charts, budget analytics, and automated goal recommendations, click **DataBank** in the sidebar to sync your Gmail account or upload a bank statement!`,
        time,
        showActions: true,
      };
      addMessage(activeBuddyId, emptyMessage);
      return;
    }

    const totalIncomeNaira = Math.round((contextData.monthlySummary?.totalIncome || 0) / 100).toLocaleString();
    const totalExpensesNaira = Math.round((contextData.monthlySummary?.totalExpenses || 0) / 100).toLocaleString();
    const savingsRatePct = Math.round((contextData.monthlySummary?.savingsRate || 0) * 100);

    const bars = (contextData.topCategories || []).map((c: any, i: number) => {
      const amountNaira = Math.round(c.total / 100).toLocaleString();
      const colors = ["var(--gold)", "var(--green)", "#C47F00", "#2B79B4", "#9B59B6"];
      return {
        label: c.category,
        width: `${Math.max(10, c.percentage)}%`,
        color: colors[i % colors.length],
        amount: `₦${amountNaira}`,
      };
    });

    const firstGoal = contextData.activeGoals?.[0];
    const goalCardData = firstGoal ? {
      name: firstGoal.title,
      amount: `₦${Math.round(firstGoal.targetAmount / 100).toLocaleString()}`,
      date: firstGoal.targetDate ? new Date(firstGoal.targetDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Dec 2026",
      buddyName,
    } : undefined;

    const proactiveMessage: ChatMessage = {
      id: `proactive-${Date.now()}`,
      role: "ai",
      content: isMobile
        ? `📊 **DataBank Review by ${buddyName}:**\n• **Income**: ₦${totalIncomeNaira} | **Outflow**: ₦${totalExpensesNaira}\n• **Savings Rate**: ${savingsRatePct}% | **Goals**: ${contextData.activeGoals?.length || 0}\n\nLet's optimize your financial plan!`
        : `📊 **Real-Time DataBank Review by ${buddyName}:**\nBased on your connected transactions and active records:\n• **Monthly Income**: ₦${totalIncomeNaira}\n• **Monthly Outflow**: ₦${totalExpensesNaira}\n• **Savings Rate**: ${savingsRatePct}%\n• **Active Goals**: ${contextData.activeGoals?.length || 0} active target(s)\n\n${contextData.topCategories?.length ? `Your largest spending category is **${contextData.topCategories[0].category}** (${contextData.topCategories[0].percentage}% of outflow).` : ""} Let's optimize your financial plan!`,
      time,
      showActions: true,
      insightHighlight: {
        label: "DataBank Strategy Insight",
        text: `From your DataBank: Your net savings rate is at ${savingsRatePct}%. Maintaining consistent allocations accelerates your goals.`,
      },
      spendChart: bars.length > 0 ? {
        title: "Your Connected Spending Breakdown",
        bars,
      } : undefined,
      goalCardData,
      goalCardOpen: !isMobile && !!goalCardData,
    };

    addMessage(activeBuddyId, proactiveMessage);
  };

  const SIGNAL_SHOWN = activeBuddyId === "contrarian";

  return (
    <>
      <ChatHeader buddy={buddy} />
      <div
        className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 sm:py-5 flex flex-col gap-[14px] sm:gap-[18px]"
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
            onYes={() => {
              useChatStore.getState().preFillInput("Let's discuss the signal: Lagos Real Estate Radar Flat for ₦185M");
            }}
            onMore={() => {
              useChatStore.getState().preFillInput("Tell me more about the Banana Island Roadflat listing.");
            }}
            onDismiss={() => {}}
          />
        )}

        {/* Dynamic signal alerts */}
        {signalAlerts
          .filter((alert) => alert.buddyId === activeBuddyId)
          .map((alert) => (
            <SignalAlertCard
              key={alert.id}
              sourceLabel={`⚡ Signal · ${alert.sourceName}`}
              buddyAv={buddy?.avatarContent ?? "🤖"}
              buddyBg={buddy?.avatarBg ?? "var(--navy)"}
              buddyIsSerif={buddy?.avatarIsSerif}
              buddyName={buddy?.name ?? "Your Buddy"}
              pastContextQuote={`💬 Past context quote from ${alert.sourceName} signal tracking:`}
              signalText={alert.body}
              dataChips={[{ label: alert.headline }]}
              manageHref="/databank"
              onYes={() => {
                useChatStore.getState().preFillInput(`Let's discuss the signal from ${alert.sourceName}: "${alert.headline}"`);
                dismissSignalAlert(alert.id);
              }}
              onMore={() => {
                useChatStore.getState().preFillInput(`Tell me more about this alert: "${alert.headline}"`);
                dismissSignalAlert(alert.id);
              }}
              onDismiss={() => {
                dismissSignalAlert(alert.id);
              }}
            />
          ))}

        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5" style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>
            {showNudge && (
              <DatabankNudge
                onDismiss={() => setShowDatabankNudge(true)}
                onUseMyData={handleUseMyData}
              />
            )}
            <div className="text-center">
              {isImageAvatar(buddy?.avatarContent) ? (
                <div className="flex items-center justify-center rounded-[10px] overflow-hidden mb-3 mx-auto" style={{ width: 64, height: 64, background: buddy?.avatarBg ?? "var(--navy)" }}>
                  <img src={buddy?.avatarContent} alt="avatar" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="text-[32px] mb-3">{buddy?.avatarContent ?? "💬"}</div>
              )}
              <div className="text-[14px] font-semibold mb-1" style={{ color: "var(--text)" }}>
                Start a conversation with {buddy?.name ?? "your buddy"}
              </div>
              <div className="text-[12px] mb-4" style={{ color: "var(--muted)" }}>
                Ask about your finances, goals, or get proactive advice.
              </div>
              <button
                onClick={handleUseMyData}
                className="px-5 py-2.5 rounded-full text-[12px] font-semibold text-white cursor-pointer transition-all duration-150 shadow-md flex items-center justify-center gap-2 mx-auto"
                style={{ background: "var(--green)" }}
              >
                <span>Use My Data ⚡</span>
              </button>
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
  const { activeGroupId, groupThreads, setMobileView, communityBuddies, groups } = useChatStore();
  const messages = groupThreads[activeGroupId] ?? [];
  const bottomRef = useRef<HTMLDivElement>(null);
  const { chips: groupChips, noData: groupNoData } = useDataSources();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  const groupDef = groups.find((g) => g.id === activeGroupId) || GROUPS.find((g) => g.id === activeGroupId);
  const groupName = groupDef?.name ?? "Group Chat";
  const buddyCount = groupDef?.buddyIds?.length ?? groupDef?.avatars.length ?? 2;
  // For avatar stacks, use council buddyIds or fall back to deriving from thread messages
  const threadBuddyIds = Array.from(new Set(messages.filter((m) => m.role === "ai" && m.buddyId && m.buddyId !== "__system__").map((m) => m.buddyId!)));
  const avatarIds = groupDef?.buddyIds?.length ? groupDef.buddyIds : (threadBuddyIds.length > 0 ? threadBuddyIds : ["contrarian", "buffett"]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">
      {/* Header */}
      <div
        className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-[12px] flex-shrink-0"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
      >
        <button
          onClick={() => setMobileView("list")}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 mr-1 transition-colors hover:bg-white/10"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        {/* Stacked avatars */}
        <div className="flex items-center flex-shrink-0" style={{ marginRight: 4 }}>
          {avatarIds.slice(0, 3).map((bid, i) => {
            const av = resolveAvatar(bid, communityBuddies);
            return (
              <div
                key={bid}
                className="flex items-center justify-center rounded-[8px] overflow-hidden"
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
                {isImageAvatar(av.content) ? (
                  <img src={av.content} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  av.content
                )}
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
        className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 sm:py-5 flex flex-col gap-[14px] sm:gap-[18px]"
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
            const av = msg.buddyId ? resolveAvatar(msg.buddyId, communityBuddies) : { bg: "var(--navy)", content: "🤖", serif: false, name: "AI" };
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
    </div>
  );
}
