"use client";

import { useState, useRef, useEffect } from "react";
import { ALL_BUDDIES } from "@/lib/buddies";
import { useChatStore } from "@/store/chatStore";

const SELECTABLE = ALL_BUDDIES.map((b) => ({
  id: b.id,
  name: b.name.length > 14 ? b.name.split(" ").slice(0, 2).join(" ") : b.name,
  sub: b.isFanSim ? `${b.price} · Fan` : b.price,
  bg: b.avatarBg,
  av: b.avatarContent,
  serif: b.avatarIsSerif,
}));

const DEFAULT_PICKED = new Set(["contrarian", "buffett"]);

export function NewGroupModal() {
  const { setShowNewGroupModal, setChatMode, setActiveGroupId, initGroupThread } = useChatStore();
  const [picked, setPicked] = useState<Set<string>>(new Set(DEFAULT_PICKED));
  const [groupName, setGroupName] = useState("My Finance Council");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement;
    const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
    return () => { prevFocus?.focus(); };
  }, []);

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 2) next.delete(id); // min 2
      } else {
        if (next.size < 4) next.add(id); // max 4
      }
      return next;
    });
  }

  function create() {
    if (!groupName.trim() || picked.size < 2) return;
    const gid = groupName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    initGroupThread(gid, []);
    setActiveGroupId(gid);
    setChatMode("group");
    setShowNewGroupModal(false);
  }

  return (
    <div
      className="fixed inset-0 z-[280] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) setShowNewGroupModal(false); }}
    >
      <div
        ref={modalRef}
        className="overflow-hidden"
        style={{
          background: "var(--card)",
          borderRadius: 20,
          width: 480,
          maxWidth: "92vw",
          boxShadow: "0 20px 60px rgba(0,0,0,.25)",
        }}
      >
        {/* Header */}
        <div
          className="px-[26px] py-[22px] relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,var(--navy),var(--navy2))" }}
        >
          <span
            className="pointer-events-none absolute -right-[30px] -top-[30px] w-[120px] h-[120px] rounded-full"
            style={{ background: "rgba(0,196,140,.1)" }}
          />
          <h3
            className="relative z-[1] text-[20px] text-white mb-1"
            style={{ fontFamily: "var(--font-dm-serif)" }}
          >
            Start a Group Chat
          </h3>
          <p className="relative z-[1] text-[12px]" style={{ color: "rgba(255,255,255,.5)" }}>
            Pick 2–4 Finance Buddies. They&apos;ll all see your DataBank and respond to each other.
          </p>
        </div>

        {/* Body */}
        <div className="px-[26px] py-[22px]">
          {/* Buddy selector */}
          <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-3" style={{ color: "var(--muted)" }}>
            Select Buddies ({picked.size}/4 selected · min 2)
          </div>
          <div className="grid gap-2 mb-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {SELECTABLE.map((b) => {
              const active = picked.has(b.id);
              return (
                <button
                  key={b.id}
                  onClick={() => toggle(b.id)}
                  className="flex items-center gap-[10px] px-3 py-[10px] rounded-[10px] border text-left transition-all duration-200 cursor-pointer"
                  style={{
                    background: active ? "rgba(0,196,140,.06)" : "var(--bg)",
                    borderColor: active ? "var(--green)" : "var(--border)",
                  }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0 rounded-[8px] text-[15px]"
                    style={{
                      width: 30, height: 30,
                      background: b.bg,
                      ...(b.serif ? { fontFamily: "var(--font-dm-serif)", fontSize: "13px", color: "rgba(255,255,255,.9)" } : {}),
                    }}
                  >
                    {b.av}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold truncate" style={{ color: "var(--text)" }}>{b.name}</div>
                    <div className="text-[10px]" style={{ color: "var(--muted)" }}>{b.sub}</div>
                  </div>
                  {/* Check circle */}
                  <div
                    className="flex items-center justify-center flex-shrink-0 rounded-full text-[10px] transition-all duration-200"
                    style={{
                      width: 18, height: 18,
                      border: active ? "none" : "2px solid var(--border)",
                      background: active ? "var(--green)" : "transparent",
                      color: active ? "#fff" : "transparent",
                    }}
                  >
                    ✓
                  </div>
                </button>
              );
            })}
          </div>

          {/* Group name */}
          <div className="mb-5">
            <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2" style={{ color: "var(--muted)" }}>
              Group Name
            </div>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. My Investment Council"
              className="w-full rounded-[10px] px-[14px] py-[10px] text-[13px] outline-none border transition-colors duration-200"
              style={{
                background: "var(--input-bg)",
                borderColor: "var(--border)",
                color: "var(--text)",
                fontFamily: "var(--font-sora)",
              }}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--green)"; }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-[10px]">
            <button
              onClick={create}
              disabled={picked.size < 2 || !groupName.trim()}
              className="flex-1 py-[11px] rounded-[10px] text-[13px] font-semibold text-white border-none cursor-pointer transition-colors duration-200"
              style={{ background: picked.size >= 2 ? "var(--navy)" : "var(--border)" }}
              onMouseEnter={(e) => { if (picked.size >= 2) (e.currentTarget as HTMLButtonElement).style.background = "var(--green)"; }}
              onMouseLeave={(e) => { if (picked.size >= 2) (e.currentTarget as HTMLButtonElement).style.background = "var(--navy)"; }}
            >
              Start Group Chat →
            </button>
            <button
              onClick={() => setShowNewGroupModal(false)}
              className="px-4 py-[11px] rounded-[10px] text-[13px] border cursor-pointer transition-colors duration-200"
              style={{ color: "var(--muted)", borderColor: "var(--border)", background: "transparent" }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
