"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useChatStore } from "@/store/chatStore";
import { getAllBuddies } from "@/lib/buddies";

const DEFAULT_PICKED = new Set(["contrarian", "buffett"]);

export function NewGroupModal() {
  const { setShowNewGroupModal, setChatMode, setActiveGroupId, initGroupThread, communityBuddies } = useChatStore();
  const [picked, setPicked] = useState<Set<string>>(new Set(DEFAULT_PICKED));
  const [groupName, setGroupName] = useState("My Finance Council");
  const modalRef = useRef<HTMLDivElement>(null);

  const selectable = useMemo(() => {
    return getAllBuddies(communityBuddies).map((b) => ({
      id: b.id,
      name: b.name.length > 14 ? b.name.split(" ").slice(0, 2).join(" ") : b.name,
      sub: b.isFanSim ? `${b.price} · Fan` : b.price,
      bg: b.avatarBg,
      av: b.avatarContent,
      serif: b.avatarIsSerif,
    }));
  }, [communityBuddies]);

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

  function handleCreate() {
    const ids = Array.from(picked);
    const newId = `custom-${Date.now()}`;
    const name = groupName.trim() || "My Finance Council";
    initGroupThread(newId, []);
    setActiveGroupId(newId);
    setChatMode("group");
    setShowNewGroupModal(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) setShowNewGroupModal(false); }}
      aria-modal="true"
      role="dialog"
      aria-labelledby="new-council-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-[480px] rounded-[20px] p-6 relative overflow-hidden"
        style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
      >
        <button
          onClick={() => setShowNewGroupModal(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[16px] border cursor-pointer"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--muted)" }}
        >
          ✕
        </button>

        <div className="text-[10px] uppercase tracking-[1.5px] font-semibold mb-1" style={{ color: "var(--green)" }}>
          AI Council
        </div>
        <h2 id="new-council-title" className="text-[20px] font-bold mb-1" style={{ color: "var(--text)" }}>
          Create a New Council
        </h2>
        <p className="text-[12px] mb-5 leading-relaxed" style={{ color: "var(--muted)" }}>
          Combine 2 to 4 AI Finance Buddies to advise you simultaneously on complex financial decisions.
        </p>

        {/* Group Name Input */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold mb-1" style={{ color: "var(--text)" }}>
            Council Name
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Real Estate &amp; Wealth Council"
            className="w-full px-3 py-2 rounded-[10px] text-[13px] border outline-none"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
          />
        </div>

        {/* Pick Buddies */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold" style={{ color: "var(--text)" }}>
              Select Buddies ({picked.size}/4)
            </span>
            <span className="text-[10px]" style={{ color: "var(--muted)" }}>Min 2 · Max 4</span>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
            {selectable.map((b) => {
              const isSelected = picked.has(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggle(b.id)}
                  className="flex items-center gap-2 p-2 rounded-[12px] border text-left cursor-pointer transition-all duration-150"
                  style={
                    isSelected
                      ? { background: "rgba(0,196,140,0.1)", borderColor: "var(--green)", color: "var(--text)" }
                      : { background: "var(--bg)", borderColor: "var(--border)", color: "var(--muted)" }
                  }
                >
                  <div
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[13px] flex-shrink-0 overflow-hidden"
                    style={{
                      background: b.bg,
                      color: "white",
                      ...(b.serif ? { fontFamily: "var(--font-dm-serif)" } : {}),
                    }}
                  >
                    {b.av.startsWith("http") || b.av.startsWith("data:") ? (
                      <img src={b.av} alt={b.name} className="w-full h-full object-cover" />
                    ) : (
                      b.av
                    )}
                  </div>

                  <div className="min-w-0 flex-grow">
                    <div className="text-[12px] font-semibold truncate" style={{ color: isSelected ? "var(--text)" : "var(--text)" }}>
                      {b.name}
                    </div>
                    <div className="text-[10px] truncate" style={{ color: "var(--muted)" }}>
                      {b.sub}
                    </div>
                  </div>

                  <div
                    className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px] flex-shrink-0"
                    style={
                      isSelected
                        ? { background: "var(--green)", borderColor: "var(--green)", color: "white" }
                        : { borderColor: "var(--border)" }
                    }
                  >
                    {isSelected && "✓"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowNewGroupModal(false)}
            className="flex-1 py-2.5 rounded-[12px] text-[13px] font-medium border cursor-pointer"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={picked.size < 2}
            className="flex-1 py-2.5 rounded-[12px] text-[13px] font-semibold border-none cursor-pointer disabled:opacity-50"
            style={{ background: "var(--green)", color: "white" }}
          >
            Create Council
          </button>
        </div>
      </div>
    </div>
  );
}
