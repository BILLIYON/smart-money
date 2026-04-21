"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useChatStore, GROUPS } from "@/store/chatStore";
import { getBuddy } from "@/lib/buddies";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    if (isGroup) await sendGroup(text);
    else await send1to1(text);
  }, [input, isStreaming, isGroup, send1to1, sendGroup]);

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
    </div>
  );
}
