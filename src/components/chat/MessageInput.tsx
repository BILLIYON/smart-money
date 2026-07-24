"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useChatStore, GROUPS } from "@/store/chatStore";
import { getBuddy } from "@/lib/buddies";
import { createClient } from "@/lib/supabase/client";

const INVESTING_SUGGESTIONS = [
  "How should I allocate my salary?",
  "Review my portfolio",
  "Best investment for ₦500k now",
  "What should I do with my next salary?",
  "Am I on track to meet my goals?",
];

const BUDGETING_SUGGESTIONS = [
  "Where am I overspending?",
  "Help me make a budget",
  "How do I start an emergency fund?",
  "What should I do with my next salary?",
  "Am I on track to meet my goals?",
];

const SUGGESTIONS_GROUP = [
  "After debt — what do both of you recommend?",
  "Do you agree on the subscription audit?",
  "@ Buffett: T-bills vs equities right now?",
  "What's the next priority after debt payoff?",
];

const DATABANK_CTX =
  "Monthly income: ₦450,000 (GTBank). Recent spend: Food & Dining ₦82k, Subscriptions ₦34k, Transport ₦28k. Active debt: credit card ₦95k at 24% APR. Savings: ₦200k idle. Goals: emergency fund (₦900k target), investment portfolio.";

async function streamToStore(
  res: Response,
  onToken: (t: string) => void,
  onDone: () => void,
  onError: () => void
) {
  if (!res.ok || !res.body) { onError(); return; }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onToken(decoder.decode(value, { stream: true }));
    }
    onDone();
  } catch {
    onError();
  }
}

export function MessageInput() {
  const {
    chatMode,
    activeBuddyId, threads,
    addMessage, appendToken, finalizeStream,
    activeGroupId, groupThreads,
    addGroupMessage, appendGroupToken, finalizeGroupStream,
    isStreaming, setStreaming,
    pendingInput, clearPendingInput,
    suggestions, setSuggestions,
  } = useChatStore();

  const [input, setInput] = useState("");
  const [atOpen, setAtOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userGoals, setUserGoals] = useState<any[]>([]);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthenticated(!!data.user);
    });
    fetch("/api/goals/list")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setUserGoals(d);
      })
      .catch(() => {});
  }, []);

  function handleSelectGoalRef(goal: any) {
    const refText = `[Referencing Goal: "${goal.title}" - Target: ₦${goal.target.toLocaleString()}, Saved: ₦${goal.current.toLocaleString()}] `;
    setInput((prev) => refText + prev);
    setShowGoalPicker(false);
  }

  const getGuestMessageCount = useCallback(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("smart_money_guest_messages_sent") || "0", 10);
  }, []);

  const incrementGuestMessageCount = useCallback(() => {
    if (typeof window === "undefined") return;
    const current = getGuestMessageCount();
    localStorage.setItem("smart_money_guest_messages_sent", (current + 1).toString());
  }, [getGuestMessageCount]);

  const isGroup = chatMode === "group";
  const buddy = getBuddy(activeBuddyId);

  // Buddies available for @ mention in the active group
  const groupDef = GROUPS.find((g) => g.id === activeGroupId);
  const mentionBuddies = (groupDef?.buddyIds ?? []).map((id) => getBuddy(id)).filter(Boolean) as NonNullable<ReturnType<typeof getBuddy>>[];

  // Populate input when "Discuss first" pre-fills it from an agent card
  useEffect(() => {
    if (!pendingInput) return;
    setInput(pendingInput);
    clearPendingInput();
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [pendingInput, clearPendingInput]);

  // Set context-aware suggestions whenever the active buddy changes
  useEffect(() => {
    if (isGroup) return;
    const b = getBuddy(activeBuddyId);
    const isBudgeting = b?.categories.includes("Budgeting") ?? false;
    setSuggestions(isBudgeting ? BUDGETING_SUGGESTIONS : INVESTING_SUGGESTIONS);
  }, [activeBuddyId, isGroup, setSuggestions]);

  const currentMessages = isGroup
    ? (groupThreads[activeGroupId] ?? [])
    : (threads[activeBuddyId] ?? []);
  const showSuggestions = currentMessages.length === 0;
  const activeChips = isGroup ? SUGGESTIONS_GROUP : suggestions;

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  }

  // ── 1:1 send ────────────────────────────────────────────
  const send1to1 = useCallback(async (text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const userMsgId = `u-${Date.now()}`;
    const aiMsgId = `a-${Date.now()}`;

    addMessage(activeBuddyId, { id: userMsgId, role: "user", content: text, time });
    addMessage(activeBuddyId, { id: aiMsgId, role: "ai", content: "", time, streaming: true });
    setStreaming(true);

    try {
      const history = (threads[activeBuddyId] ?? [])
        .filter((m) => !m.streaming && m.content && m.buddyId !== "__system__")
        .slice(-20)
        .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }));
      history.push({ role: "user", content: text });

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buddyId: activeBuddyId, messages: history, databankContext: DATABANK_CTX }),
      });

      await streamToStore(
        res,
        (t) => appendToken(activeBuddyId, aiMsgId, t),
        () => finalizeStream(activeBuddyId, aiMsgId),
        () => { appendToken(activeBuddyId, aiMsgId, "\n\n[Connection error]"); finalizeStream(activeBuddyId, aiMsgId); }
      );
    } catch {
      appendToken(activeBuddyId, aiMsgId, "\n\n[Connection error]");
      finalizeStream(activeBuddyId, aiMsgId);
    } finally {
      setStreaming(false);
    }
  }, [activeBuddyId, threads, addMessage, appendToken, finalizeStream, setStreaming]);

  // ── Group send (staggered, one per buddy) ───────────────
  const sendGroup = useCallback(async (text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const userMsgId = `gu-${Date.now()}`;

    addGroupMessage(activeGroupId, { id: userMsgId, role: "user", content: text, time });
    setStreaming(true);

    // Collect unique buddy IDs from the thread
    const msgs = groupThreads[activeGroupId] ?? [];
    const buddyIds = Array.from(
      new Set(msgs.filter((m) => m.role === "ai" && m.buddyId && m.buddyId !== "__system__").map((m) => m.buddyId!))
    );
    if (!buddyIds.length) buddyIds.push("contrarian", "buffett");

    const history = msgs
      .filter((m) => !m.streaming && m.content && m.buddyId !== "__system__")
      .slice(-20)
      .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content }));
    history.push({ role: "user", content: text });

    try {
      // Fire each buddy with a 1.1s stagger
      for (let i = 0; i < buddyIds.length; i++) {
        const bid = buddyIds[i];
        if (i > 0) await new Promise((r) => setTimeout(r, 1100));

        const replyId = `ga-${Date.now()}-${bid}`;
        const replyTime = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        addGroupMessage(activeGroupId, { id: replyId, role: "ai", buddyId: bid, content: "", time: replyTime, streaming: true });

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ buddyId: bid, messages: history, databankContext: DATABANK_CTX }),
        });

        await streamToStore(
          res,
          (t) => appendGroupToken(activeGroupId, replyId, t),
          () => finalizeGroupStream(activeGroupId, replyId),
          () => { appendGroupToken(activeGroupId, replyId, "[Connection error]"); finalizeGroupStream(activeGroupId, replyId); }
        );
      }
    } finally {
      setStreaming(false);
    }
  }, [activeGroupId, groupThreads, addGroupMessage, appendGroupToken, finalizeGroupStream, setStreaming]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    if (isAuthenticated === false) {
      const guestCount = getGuestMessageCount();
      if (guestCount >= 3) {
        setShowAuthModal(true);
        return;
      }
      incrementGuestMessageCount();
    }

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    if (isGroup) await sendGroup(text);
    else await send1to1(text);
  }, [input, isStreaming, isGroup, send1to1, sendGroup, isAuthenticated, getGuestMessageCount, incrementGuestMessageCount]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function fillSuggestion(text: string) {
    setInput(text);
    textareaRef.current?.focus();
  }

  const placeholder = isGroup
    ? "Ask your council anything… use @ to direct at a specific buddy"
    : `Ask ${buddy?.name ?? "your buddy"} anything about your finances…`;

  return (
    <div
      className="flex-shrink-0 px-5 py-[14px]"
      style={{ background: "var(--card)", borderTop: "1px solid var(--border)" }}
    >
      {/* Suggestion chips */}
      {showSuggestions && activeChips.length > 0 && (
      <div className="flex gap-2 overflow-x-auto mb-[10px]" style={{ scrollbarWidth: "none" }}>
        {activeChips.map((s) => (
          <button
            key={s}
            onClick={() => fillSuggestion(s)}
            className="px-3 py-[5px] rounded-full text-[11px] border cursor-pointer transition-all duration-150 whitespace-nowrap"
            style={{ background: "var(--input-bg)", borderColor: "var(--border)", color: "var(--muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--green)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--green)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
            }}
          >
            {s.length > 32 ? s.slice(0, 32) + "…" : s}
          </button>
        ))}
      </div>
      )}

      {/* @ mention dropdown */}
      {atOpen && isGroup && mentionBuddies.length > 0 && (
        <div
          className="mb-2 rounded-[12px] border overflow-hidden"
          style={{ background: "var(--card)", borderColor: "var(--border)", boxShadow: "0 4px 20px rgba(0,0,0,.12)" }}
        >
          {mentionBuddies.map((b) => (
            <button
              key={b.id}
              onMouseDown={(e) => {
                e.preventDefault();
                const ta = textareaRef.current;
                if (!ta) return;
                const pos = ta.selectionStart;
                const atIdx = input.lastIndexOf("@", pos - 1);
                const before = input.slice(0, atIdx);
                const after = input.slice(pos);
                const inserted = `@${b.name} `;
                const next = before + inserted + after;
                setInput(next);
                setAtOpen(false);
                setTimeout(() => {
                  ta.focus();
                  const cur = before.length + inserted.length;
                  ta.setSelectionRange(cur, cur);
                }, 0);
              }}
              className="flex items-center gap-[10px] w-full px-4 py-[9px] text-left transition-colors duration-150"
              style={{ background: "transparent", border: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0 rounded-[8px]"
                style={{
                  width: 26, height: 26,
                  background: b.avatarBg,
                  fontSize: b.avatarIsSerif ? "10px" : "14px",
                  ...(b.avatarIsSerif ? { fontFamily: "var(--font-dm-serif)", color: "rgba(255,255,255,.9)" } : {}),
                }}
              >
                {b.avatarContent}
              </div>
              <span className="text-[12px] font-medium" style={{ color: "var(--text)" }}>{b.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Goal Reference Toolbar */}
      {userGoals.length > 0 && (
        <div className="relative mb-1.5 flex items-center justify-between px-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowGoalPicker(!showGoalPicker)}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 cursor-pointer transition-all hover:border-emerald-400"
              style={{ background: "rgba(0,196,140,0.08)", borderColor: "rgba(0,196,140,0.25)", color: "var(--green2)" }}
            >
              <span>🎯 Reference Goal</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
                {userGoals.length}
              </span>
            </button>

            {showGoalPicker && (
              <div
                className="absolute bottom-full left-0 mb-2 w-72 rounded-[14px] p-2 shadow-2xl border z-50 flex flex-col gap-1 max-h-60 overflow-y-auto"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-1" style={{ color: "var(--muted)" }}>
                  Select Goal to Reference in Chat
                </div>
                {userGoals.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleSelectGoalRef(g)}
                    className="flex items-center justify-between p-2 rounded-[8px] text-left cursor-pointer hover:bg-emerald-500/10 transition-all border border-transparent hover:border-emerald-500/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold truncate" style={{ color: "var(--text)" }}>
                        {g.emoji || "🎯"} {g.title}
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--muted)" }}>
                        Saved: ₦{g.current.toLocaleString()} / ₦{g.target.toLocaleString()}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      + Select
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-[10px] items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            const val = e.target.value;
            setInput(val);
            autoResize();
            if (isGroup) {
              const pos = e.target.selectionStart;
              const atIdx = val.lastIndexOf("@", pos - 1);
              setAtOpen(atIdx !== -1 && !val.slice(atIdx, pos).includes(" "));
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setAtOpen(false);
            handleKey(e);
          }}
          placeholder={placeholder}
          aria-label={isGroup ? "Message your finance council" : "Message your finance buddy"}
          rows={1}
          className="flex-1 resize-none rounded-[12px] px-[15px] py-[11px] text-[13px] outline-none transition-all duration-200"
          style={{
            background: "var(--input-bg)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            fontFamily: "var(--font-sora)",
            minHeight: 44,
            maxHeight: 100,
          }}
          onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "var(--green)"; }}
          onBlur={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "var(--border)"; }}
        />

        <button
          onClick={send}
          disabled={isStreaming || !input.trim()}
          aria-label="Send message"
          className="flex items-center justify-center rounded-[11px] flex-shrink-0 transition-all duration-200"
          style={{
            width: 42, height: 42,
            background: isStreaming || !input.trim() ? "var(--border)" : "var(--green)",
            border: "none",
            cursor: isStreaming || !input.trim() ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (!isStreaming && input.trim())
              (e.currentTarget as HTMLButtonElement).style.background = "var(--green2)";
          }}
          onMouseLeave={(e) => {
            if (!isStreaming && input.trim())
              (e.currentTarget as HTMLButtonElement).style.background = "var(--green)";
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: 17, height: 17, stroke: "#fff", fill: "none", strokeWidth: 2 }}>
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      {/* Premium Auth Intercept Modal */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-[280] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowAuthModal(false)}
        >
          <div
            className="overflow-hidden"
            style={{
              background: "var(--card)",
              borderRadius: 20,
              width: 440,
              maxWidth: "92vw",
              boxShadow: "0 20px 60px rgba(0,0,0,.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="px-[26px] py-[24px] relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,var(--navy),var(--navy2))" }}
            >
              <span
                className="pointer-events-none absolute -right-[20px] -top-[20px] w-[100px] h-[100px] rounded-full"
                style={{ background: "rgba(0,196,140,.12)" }}
              />
              <div className="flex items-center gap-3 mb-2 relative z-[1]">
                <div
                  className="flex items-center justify-center rounded-lg text-lg flex-shrink-0"
                  style={{ width: 34, height: 34, background: "rgba(255,255,255,.1)" }}
                >
                  🔒
                </div>
                <h3
                  className="text-[20px] text-white font-semibold"
                  style={{ fontFamily: "var(--font-dm-serif)" }}
                >
                  Unlock Full Access
                </h3>
              </div>
              <p className="relative z-[1] text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,.6)" }}>
                You have reached the guest limit of 3 free messages. Sign up or log in to keep chatting with your Finance buddies.
              </p>
            </div>

            {/* Body */}
            <div className="px-[26px] py-[22px]">
              <div className="flex flex-col gap-3 mb-5">
                {[
                  "Retain your full conversation history",
                  "Connect bank details and statement files to your DataBank",
                  "Form customized budgets and execute agentic actions",
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-[12px]" style={{ color: "var(--muted)" }}>
                    <span style={{ color: "var(--green)", fontWeight: 700 }}>✓</span>
                    <span className="leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-[10px]">
                <a
                  href="/login?next=/chat"
                  className="flex-1 flex items-center justify-center py-[11px] rounded-[10px] text-[13px] font-semibold text-white transition-all duration-200"
                  style={{ background: "var(--green)", textDecoration: "none" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--green2)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--green)"; }}
                >
                  Log In / Sign Up →
                </a>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="px-4 py-[11px] rounded-[10px] text-[13px] border cursor-pointer transition-colors duration-200"
                  style={{ color: "var(--muted)", borderColor: "var(--border)", background: "transparent" }}
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
