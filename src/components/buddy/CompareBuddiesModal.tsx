"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ALL_BUDDIES, getBuddy } from "@/lib/buddies";
import { useCompareStore } from "@/store/compareStore";

// ── Types ──────────────────────────────────────────────────
type ColState = {
  text: string;
  streaming: boolean;
  error: string | null;
};

const EMPTY_COL: ColState = { text: "", streaming: false, error: null };

// ── Buddy Avatar ───────────────────────────────────────────
function BuddyAvatar({
  buddyId,
  size = 36,
}: {
  buddyId: string;
  size?: number;
}) {
  const b = getBuddy(buddyId);
  if (!b) return null;
  return (
    <div
      className="flex items-center justify-center flex-shrink-0 rounded-[10px]"
      style={{
        width: size,
        height: size,
        background: b.avatarBg,
        fontSize: b.avatarIsSerif ? size * 0.33 : size * 0.44,
        ...(b.avatarIsSerif
          ? { fontFamily: "var(--font-dm-serif)", color: "rgba(255,255,255,.9)" }
          : {}),
      }}
    >
      {b.avatarContent}
    </div>
  );
}

// ── Buddy Select ───────────────────────────────────────────
function BuddySelect({
  value,
  onChange,
  exclude,
  label,
}: {
  value: string;
  onChange: (id: string) => void;
  exclude: string;
  label: string;
}) {
  const buddy = getBuddy(value);

  return (
    <div className="flex-1 min-w-0">
      <div
        className="text-[10px] font-semibold uppercase tracking-[.6px] mb-2"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </div>

      <div className="flex items-center gap-3">
        <BuddyAvatar buddyId={value} size={38} />

        <div className="relative flex-1">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full appearance-none rounded-[10px] px-3 py-[10px] pr-8 text-[13px] font-medium outline-none cursor-pointer transition-colors duration-200"
            style={{
              background: "var(--input-bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              fontFamily: "var(--font-sora)",
            }}
          >
            {ALL_BUDDIES.filter((b) => b.id !== exclude).map((b) => (
              <option
                key={b.id}
                value={b.id}
                style={{
                  background: "var(--card)",
                  color: "var(--text)",
                }}
              >
                {b.name}
              </option>
            ))}
          </select>
          {/* Chevron */}
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px]"
            style={{ color: "var(--muted)" }}
          >
            ▾
          </span>
        </div>
      </div>

      {buddy && (
        <div className="mt-2 text-[11px]" style={{ color: "var(--muted)" }}>
          {buddy.tag}
        </div>
      )}
    </div>
  );
}

// ── Response Column ────────────────────────────────────────
function ResponseColumn({
  buddyId,
  col,
  side,
}: {
  buddyId: string;
  col: ColState;
  side: "left" | "right";
}) {
  const buddy = getBuddy(buddyId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll as text streams in
  useEffect(() => {
    if (col.streaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [col.text, col.streaming]);

  const isEmpty = !col.text && !col.streaming && !col.error;

  return (
    <div
      className="flex flex-col flex-1 min-w-0 rounded-[14px] overflow-hidden"
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Column header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}
      >
        <BuddyAvatar buddyId={buddyId} size={32} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold truncate" style={{ color: "var(--text)" }}>
            {buddy?.name ?? buddyId}
          </div>
          <div className="text-[10px]" style={{ color: "var(--muted)" }}>
            {buddy?.model ?? "AI"}
            {col.streaming && (
              <span
                className="ml-2 font-semibold"
                style={{ color: "var(--green)" }}
              >
                · Typing…
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Response body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 text-[13px] leading-[1.75]"
        style={{
          color: "var(--text)",
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border) transparent",
          minHeight: 180,
        }}
      >
        {isEmpty && (
          <div
            className="h-full flex items-center justify-center text-center"
            style={{ color: "var(--muted)" }}
          >
            <div>
              <div className="text-[28px] mb-2" style={{ opacity: 0.35 }}>
                {buddy?.avatarContent ?? "💬"}
              </div>
              <div className="text-[12px]">
                {buddy?.name ?? "Buddy"}&apos;s response will appear here
              </div>
            </div>
          </div>
        )}

        {col.error && (
          <div
            className="rounded-[10px] px-3 py-3 text-[12px]"
            style={{
              background: "rgba(226,75,74,.08)",
              border: "1px solid rgba(226,75,74,.2)",
              color: "#F87171",
            }}
          >
            ⚠ {col.error}
          </div>
        )}

        {col.text && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {col.text.split("\n").map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ))}
              {col.streaming && (
                <span
                  className="inline-block w-[2px] h-[14px] ml-[2px] align-middle animate-pulse"
                  style={{ background: side === "left" ? "var(--green)" : "var(--gold)" }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────
export function CompareBuddiesModal() {
  const open        = useCompareStore((s) => s.open);
  const closeCompare = useCompareStore((s) => s.closeCompare);

  const [buddyA, setBuddyA] = useState("contrarian");
  const [buddyB, setBuddyB] = useState("buffett");
  const [question, setQuestion] = useState("");
  const [colA, setColA] = useState<ColState>(EMPTY_COL);
  const [colB, setColB] = useState<ColState>(EMPTY_COL);
  const [asking, setAsking] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Abort in-flight requests when modal closes
  useEffect(() => {
    if (!open && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, [open]);

  const readStream = useCallback(
    async (
      res: Response,
      setter: React.Dispatch<React.SetStateAction<ColState>>,
      signal: AbortSignal
    ) => {
      if (!res.body) {
        setter((s) => ({ ...s, streaming: false }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          if (signal.aborted) break;
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            setter((s) => ({
              ...s,
              text: s.text + decoder.decode(value, { stream: true }),
            }));
          }
        }
      } catch (e) {
        if (!signal.aborted) {
          setter((s) => ({ ...s, error: "Stream interrupted." }));
        }
      } finally {
        setter((s) => ({ ...s, streaming: false }));
        reader.releaseLock();
      }
    },
    []
  );

  async function handleAsk() {
    if (!question.trim() || asking) return;

    // Abort any in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setAsking(true);
    setColA({ text: "", streaming: true, error: null });
    setColB({ text: "", streaming: true, error: null });

    const body = (buddyId: string) =>
      JSON.stringify({
        buddyId,
        messages: [{ role: "user", content: question }],
        databankContext: {},
      });

    try {
      // Start both fetches simultaneously
      const [resA, resB] = await Promise.all([
        fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body(buddyA),
          signal: ctrl.signal,
        }),
        fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body(buddyB),
          signal: ctrl.signal,
        }),
      ]);

      if (!resA.ok) setColA({ text: "", streaming: false, error: `Error ${resA.status}` });
      if (!resB.ok) setColB({ text: "", streaming: false, error: `Error ${resB.status}` });

      // Stream both in parallel — neither awaits the other
      await Promise.all([
        resA.ok ? readStream(resA, setColA, ctrl.signal) : Promise.resolve(),
        resB.ok ? readStream(resB, setColB, ctrl.signal) : Promise.resolve(),
      ]);
    } catch (e) {
      if (!ctrl.signal.aborted) {
        setColA((s) => ({ ...s, streaming: false, error: s.text ? null : "Request failed." }));
        setColB((s) => ({ ...s, streaming: false, error: s.text ? null : "Request failed." }));
      }
    } finally {
      setAsking(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  const canAsk = question.trim().length > 0 && !asking;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) closeCompare(); }}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[400]"
            style={{ background: "rgba(11,30,61,.82)", backdropFilter: "blur(5px)" }}
          />
        </Dialog.Overlay>

        {/* Panel */}
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="fixed inset-0 z-[401] flex items-center justify-center p-4"
            // Swallow pointer events so backdrop click is handled by Radix
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full max-w-[900px] max-h-[90vh] flex flex-col rounded-[20px] overflow-hidden"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 32px 80px rgba(0,0,0,.55)",
              }}
              // Keep Radix from treating inner clicks as "outside"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Header ──────────────────────────────── */}
              <div
                className="flex items-center justify-between px-6 py-5 flex-shrink-0"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div>
                  <Dialog.Title
                    className="text-[16px] font-semibold"
                    style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}
                  >
                    ⚔️ Compare Finance Buddies
                  </Dialog.Title>
                  <Dialog.Description
                    className="text-[12px] mt-[2px]"
                    style={{ color: "var(--muted)" }}
                  >
                    Ask any financial question and see how two buddies answer differently.
                  </Dialog.Description>
                </div>

                <Dialog.Close asChild>
                  <button
                    className="flex items-center justify-center w-8 h-8 rounded-[8px] transition-all duration-150"
                    style={{
                      background: "transparent",
                      border: "1px solid var(--border)",
                      color: "var(--muted)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--bg)";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
                    }}
                    aria-label="Close"
                  >
                    <X size={15} strokeWidth={2} />
                  </button>
                </Dialog.Close>
              </div>

              {/* ── Buddy selectors ──────────────────────── */}
              <div
                className="flex items-start gap-4 px-6 py-5 flex-shrink-0"
                style={{
                  background: "var(--bg)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <BuddySelect
                  value={buddyA}
                  onChange={setBuddyA}
                  exclude={buddyB}
                  label="Buddy A"
                />

                {/* VS badge */}
                <div
                  className="flex items-center justify-center flex-shrink-0 mt-6"
                  style={{ width: 36 }}
                >
                  <div
                    className="text-[11px] font-bold px-[7px] py-[3px] rounded-full"
                    style={{
                      background: "rgba(245,166,35,.12)",
                      border: "1px solid rgba(245,166,35,.25)",
                      color: "var(--gold)",
                    }}
                  >
                    VS
                  </div>
                </div>

                <BuddySelect
                  value={buddyB}
                  onChange={setBuddyB}
                  exclude={buddyA}
                  label="Buddy B"
                />
              </div>

              {/* ── Response columns ─────────────────────── */}
              <div
                className="flex-1 overflow-hidden flex gap-4 p-5 min-h-0"
                style={{ background: "var(--bg)" }}
              >
                {/* On mobile, stack; on md+ side by side */}
                <div className="flex flex-col md:flex-row gap-4 w-full min-h-0 flex-1">
                  <ResponseColumn buddyId={buddyA} col={colA} side="left" />
                  <ResponseColumn buddyId={buddyB} col={colB} side="right" />
                </div>
              </div>

              {/* ── Question input ───────────────────────── */}
              <div
                className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask both buddies a question…"
                  className="flex-1 rounded-[10px] px-4 py-[11px] text-[13px] outline-none transition-all"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontFamily: "var(--font-sora)",
                  }}
                  onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--green)"; }}
                  onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = "var(--border)"; }}
                  disabled={asking}
                />

                <button
                  onClick={handleAsk}
                  disabled={!canAsk}
                  className="flex-shrink-0 px-5 py-[11px] rounded-[10px] text-[13px] font-semibold text-white transition-all duration-150"
                  style={{
                    background: canAsk ? "var(--green)" : "rgba(0,196,140,.35)",
                    border: "none",
                    cursor: canAsk ? "pointer" : "not-allowed",
                    minWidth: 110,
                  }}
                  onMouseEnter={(e) => {
                    if (canAsk) (e.currentTarget as HTMLButtonElement).style.background = "var(--green2)";
                  }}
                  onMouseLeave={(e) => {
                    if (canAsk) (e.currentTarget as HTMLButtonElement).style.background = "var(--green)";
                  }}
                >
                  {asking ? (
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"
                        style={{ borderTopColor: "#fff" }}
                      />
                      Asking…
                    </span>
                  ) : (
                    "Ask Both →"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
