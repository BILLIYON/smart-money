"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useChatStore, GROUPS } from "@/store/chatStore";
import { ALL_BUDDIES, getBuddy, type Buddy, type BuddyCategory } from "@/lib/buddies";
import { FinancialSnapshot } from "./FinancialSnapshot";
import { isImageAvatar } from "@/lib/utils";
import type { CommunityBuddyRow } from "@/lib/db";

const STATIC_BUDDY_LIST = ALL_BUDDIES;

const MODEL_COLOR: Record<string, string> = {
  Claude: "#7B68EE",
  "GPT-4": "#10A37F",
  Gemini: "#4285F4",
  Groq: "#F55036",
};

function communityRowToBuddy(row: CommunityBuddyRow): Buddy {
  const rawModel = (row.model ?? "").toLowerCase();
  const model: Buddy["model"] =
    rawModel.includes("groq") || rawModel.includes("llama") ? "Groq" :
    rawModel.includes("gpt") ? "GPT-4" :
    rawModel.includes("gemini") ? "Gemini" :
    "Claude";
  const priceMonthly = Number(row.custom_price ?? 0);
  const priceDisplay = priceMonthly > 0 ? `₦${priceMonthly.toLocaleString()}/mo` : "Free";
  return {
    id: row.id,
    name: row.name,
    tag: row.tag ?? "",
    desc: row.description ?? "",
    price: priceDisplay,
    priceNote: row.price_note ?? "",
    badge: priceDisplay,
    badgeType: priceMonthly > 0 ? "pro" : "free",
    bannerColor: row.banner_color ?? "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
    avatarBg: row.avatar_bg ?? "#1A3A6E",
    avatarContent: row.avatar_content ?? "🎯",
    avatarIsSerif: row.avatar_is_serif ?? false,
    model,
    modelColor: MODEL_COLOR[model] ?? "#7B68EE",
    rating: "New",
    reviewCount: "0",
    isFanSim: row.is_fan_sim ?? false,
    disclaimer: row.disclaimer ?? undefined,
    categories: (row.categories ?? []) as BuddyCategory[],
    philosophy: row.philosophy ?? "",
    samples: row.samples ?? [],
    reviews: [],
    includes: row.includes ?? [],
  };
}


function GroupAvatarStack({ avatars }: { avatars: typeof GROUPS[0]["avatars"] }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: 38, height: 38 }}>
      {avatars[0] && (
        <div
          className="absolute top-0 left-0 flex items-center justify-center rounded-[8px] border-[2px] text-[12px]"
          style={{
            width: 26, height: 26,
            background: avatars[0].bg,
            borderColor: "var(--card)",
            ...(avatars[0].serif ? { fontFamily: "var(--font-dm-serif)", fontSize: "10px", color: "rgba(255,255,255,.9)" } : {}),
          }}
        >
          {avatars[0].content}
        </div>
      )}
      {avatars[1] && (
        <div
          className="absolute bottom-0 right-0 flex items-center justify-center rounded-[6px] border-[2px] text-[10px]"
          style={{
            width: 22, height: 22,
            background: avatars[1].bg,
            borderColor: "var(--card)",
            ...(avatars[1].serif ? { fontFamily: "var(--font-dm-serif)", fontSize: "9px", color: "rgba(255,255,255,.9)" } : {}),
          }}
        >
          {avatars[1].content}
        </div>
      )}
      {avatars[2] && (
        <div
          className="absolute top-0 right-0 flex items-center justify-center rounded-[5px] border-[2px] text-[9px]"
          style={{
            width: 18, height: 18,
            background: avatars[2].bg,
            borderColor: "var(--card)",
            ...(avatars[2].serif ? { fontFamily: "var(--font-dm-serif)", fontSize: "8px", color: "rgba(255,255,255,.9)" } : {}),
          }}
        >
          {avatars[2].content}
        </div>
      )}
    </div>
  );
}

export function ChatSidebar() {
  const {
    chatMode,
    setChatMode,
    activeBuddyId,
    setActiveBuddyId,
    initThread,
    setShowNewGroupModal,
    threads,
    enableCrossSessionMemory,
    toggleCrossSessionMemory,
    sessions,
    activeSessionId,
    setActiveSession,
    createNewSession,
    deleteSession,
    loadSessions,
    loadSessionMessages,
    loadRecentHistoryForBuddy,
    communityBuddies,
    setCommunityBuddies,
  } = useChatStore();

  const [ready, setReady] = useState(false);
  const [savedExpanded, setSavedExpanded] = useState(true);

  useEffect(() => {
    loadSessions();
    loadRecentHistoryForBuddy(activeBuddyId);
    const t = setTimeout(() => setReady(true), 100);
    // Fetch approved community buddies
    fetch("/api/studio")
      .then((r) => r.json())
      .then((rows: CommunityBuddyRow[]) => {
        setCommunityBuddies(rows.map(communityRowToBuddy));
      })
      .catch(() => {});
    return () => clearTimeout(t);
  }, []);

  // Overwrite static buddies with database counterparts when loaded
  const dbIds = new Set(communityBuddies.map((b) => b.id));
  const ALL_BUDDY_LIST: Buddy[] = [
    ...communityBuddies,
    ...STATIC_BUDDY_LIST.filter((b) => !dbIds.has(b.id)),
  ];

  // Resolve active buddy from combined list (handles DB buddies)
  const activeBuddy = ALL_BUDDY_LIST.find((b) => b.id === activeBuddyId)
    ?? getBuddy(activeBuddyId)
    ?? ALL_BUDDY_LIST[0];

  function selectBuddy(id: string) {
    setActiveBuddyId(id);
    initThread(id, []);
    loadRecentHistoryForBuddy(id);
  }

  return (
    <div
      className="flex flex-col flex-shrink-0 overflow-hidden"
      style={{
        width: 260,
        borderRight: "1px solid var(--border)",
        background: "var(--card)",
      }}
    >
      {/* Mode tabs */}
      <div
        className="flex flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {(["1to1", "group"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setChatMode(mode)}
            className="flex-1 py-[10px] px-3 text-[11px] font-semibold uppercase tracking-[.5px] text-center cursor-pointer border-b-[2px] transition-all duration-200"
            style={{
              color: chatMode === mode ? "var(--green)" : "var(--muted)",
              background: "transparent",
              border: "none",
              borderBottomStyle: "solid",
              borderBottomWidth: 2,
              borderBottomColor: chatMode === mode ? "var(--green)" : "transparent",
            }}
          >
            {mode === "1to1" ? "1:1 Chats" : "Group Chats"}
          </button>
        ))}
      </div>

      {/* Cross-Session Memory Toggle Card */}
      <div
        className="flex items-center justify-between px-3 py-[9px] mx-2 my-2 rounded-[10px] flex-shrink-0"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[14px]">🧠</span>
          <div>
            <div className="text-[11px] font-semibold" style={{ color: "var(--text)" }}>Cross-Session Memory</div>
            <div className="text-[9px]" style={{ color: "var(--muted)" }}>Remember past conversations</div>
          </div>
        </div>
        <button
          onClick={toggleCrossSessionMemory}
          className="px-[8px] py-[3px] rounded-full text-[10px] font-bold transition-all cursor-pointer"
          style={{
            background: enableCrossSessionMemory ? "rgba(0,196,140,0.15)" : "var(--border)",
            color: enableCrossSessionMemory ? "var(--green2)" : "var(--muted)",
            border: enableCrossSessionMemory ? "1px solid rgba(0,196,140,0.3)" : "1px solid var(--border)",
          }}
        >
          {enableCrossSessionMemory ? "ON" : "OFF"}
        </button>
      </div>

      {/* ── 1:1 PANEL ── */}
      {chatMode === "1to1" && (
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
          {/* Saved Topic Conversations — MOVED TO TOP & RESTRICTED TO ACTIVE BUDDY */}
          {(() => {
            const activeBuddySessions = sessions.filter(
              (sess) => !sess.is_group && (sess.buddy_ids?.includes(activeBuddyId) || !sess.buddy_ids?.length)
            );

            if (activeBuddySessions.length === 0) return null;

            return (
              <div className="px-2 pt-2 pb-1 border-b" style={{ borderColor: "var(--border)" }}>
                <div
                  className="flex items-center justify-between px-2 mb-1 cursor-pointer select-none"
                  onClick={() => setSavedExpanded(!savedExpanded)}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[.5px]" style={{ color: "var(--muted)" }}>
                      Saved Conversations ({activeBuddySessions.length})
                    </span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-[1px] rounded"
                      style={{ color: "var(--green2)", background: "rgba(0,196,140,0.1)" }}
                    >
                      {savedExpanded ? "Hide ▲" : "Show ▼"}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      createNewSession(activeBuddyId);
                    }}
                    className="text-[10px] font-semibold px-[6px] py-[2px] rounded cursor-pointer"
                    style={{ color: "var(--green)", background: "rgba(0,196,140,0.08)" }}
                  >
                    + New Chat
                  </button>
                </div>
                {savedExpanded && (
                  <div className="max-h-[110px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                    {activeBuddySessions.map((sess) => (
                      <div
                        key={sess.id}
                        onClick={() => {
                          setActiveSession(sess.id);
                          loadSessionMessages(sess.id);
                        }}
                        className={`group flex items-center justify-between px-2 py-[5px] rounded-[6px] cursor-pointer text-[11px] mb-[2px] transition-all`}
                        style={{
                          background: activeSessionId === sess.id ? "rgba(0,196,140,0.12)" : "transparent",
                          color: activeSessionId === sess.id ? "var(--green2)" : "var(--text)",
                        }}
                      >
                        <span className="truncate flex-1 font-medium">💬 {sess.session_name || "Finance Advisory Topic"}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(sess.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-[10px] hover:text-red-500 ml-1 px-1"
                          title="Delete chat"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Active buddy pinned at top */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            {(() => {
              const buddy = activeBuddy;
              if (!buddy) return null;
              return (
                <div
                  className="flex items-center gap-[10px] px-3 py-[8px] rounded-[10px] cursor-pointer"
                  style={{
                    background: "var(--bg)",
                    borderLeft: "3px solid var(--green)",
                    paddingLeft: "9px",
                  }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0 rounded-[10px] text-[18px] overflow-hidden"
                    style={{
                      width: 34, height: 34,
                      background: buddy.avatarBg,
                      ...(buddy.avatarIsSerif
                        ? { fontFamily: "var(--font-dm-serif)", fontSize: "14px", color: "rgba(255,255,255,.85)" }
                        : {}),
                    }}
                  >
                    {isImageAvatar(buddy.avatarContent) ? (
                      <img src={buddy.avatarContent} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      buddy.avatarContent
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>
                      {buddy.name}
                      {buddy.isFanSim && (
                        <span
                          className="ml-1 text-[8px] px-[6px] py-[2px] rounded-full border uppercase tracking-[.5px] font-semibold"
                          style={{ background: "rgba(245,166,35,.1)", borderColor: "rgba(245,166,35,.25)", color: "#C47F00" }}
                        >
                          Fan
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-2 h-2 rounded-full flex-shrink-0 ml-auto" style={{ background: "var(--green)" }} />
                </div>
              );
            })()}
          </div>

          {/* Buddy list */}
          <div className="flex-1 overflow-y-auto p-2 min-h-0" style={{ scrollbarWidth: "none" }}>
            {!ready ? (
              STATIC_BUDDY_LIST.filter((b) => b.id !== activeBuddyId).map((_, i) => (
                <div key={i} className="flex items-center gap-[10px] px-3 py-[10px] rounded-[10px] mb-[2px] animate-pulse">
                  <div className="flex-shrink-0 rounded-[10px]" style={{ width: 38, height: 38, background: "var(--border)" }} />
                  <div className="flex-1">
                    <div className="h-3 w-24 rounded mb-2" style={{ background: "var(--border)" }} />
                    <div className="h-2 w-16 rounded" style={{ background: "var(--border)" }} />
                  </div>
                </div>
              ))
            ) : null}
            {ready && ALL_BUDDY_LIST.filter((b) => b.id !== activeBuddyId).map((buddy) => {
              const isCommunity = !STATIC_BUDDY_LIST.some((s) => s.id === buddy.id);
              return (
                <button
                  key={buddy.id}
                  onClick={() => selectBuddy(buddy.id)}
                  className="w-full flex items-center gap-[10px] px-3 py-[10px] rounded-[10px] mb-[2px] text-left transition-all duration-150 cursor-pointer"
                  style={{ background: "transparent" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0 rounded-[10px] text-[18px] overflow-hidden"
                    style={{
                      width: 34, height: 34,
                      background: buddy.avatarBg,
                      ...(buddy.avatarIsSerif
                        ? { fontFamily: "var(--font-dm-serif)", fontSize: "14px", color: "rgba(255,255,255,.85)" }
                        : {}),
                    }}
                  >
                    {isImageAvatar(buddy.avatarContent) ? (
                      <img src={buddy.avatarContent} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      buddy.avatarContent
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>
                      {buddy.name}
                      {buddy.isFanSim && (
                        <span
                          className="ml-1 text-[8px] px-[6px] py-[2px] rounded-full border uppercase tracking-[.5px] font-semibold"
                          style={{ background: "rgba(245,166,35,.1)", borderColor: "rgba(245,166,35,.25)", color: "#C47F00" }}
                        >
                          Fan
                        </span>
                      )}
                      {isCommunity && !buddy.isFanSim && (
                        <span
                          className="ml-1 text-[8px] px-[6px] py-[2px] rounded-full border uppercase tracking-[.5px] font-semibold"
                          style={{ background: "rgba(66,133,244,.1)", borderColor: "rgba(66,133,244,.25)", color: "#4285F4" }}
                        >
                          Community
                        </span>
                      )}
                    </div>
                  </div>
                  {(threads[buddy.id]?.length ?? 0) > 0 && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0 ml-auto" style={{ background: "var(--green)" }} />
                  )}
                </button>
              );
            })}

            <Link
              href="/"
              aria-label="Browse finance buddies"
              className="block mx-[2px] p-[8px] rounded-[10px] text-center text-[11px] border border-dashed transition-all duration-150 mt-2"
              style={{ color: "var(--muted)", borderColor: "var(--border)" }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.borderColor = "var(--green)";
                el.style.color = "var(--green)";
                el.style.background = "rgba(0,196,140,.03)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.borderColor = "var(--border)";
                el.style.color = "var(--muted)";
                el.style.background = "transparent";
              }}
            >
              + Add Finance Buddy
            </Link>
          </div>

          <FinancialSnapshot />
        </div>
      )}

      {/* ── GROUP PANEL ── */}
      {chatMode === "group" && (
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
          {/* New group button */}
          <button
            onClick={() => setShowNewGroupModal(true)}
            aria-label="Create new group chat"
            className="mx-[10px] my-[6px] flex items-center justify-center gap-[6px] py-[9px] px-3 rounded-[10px] border border-dashed text-[12px] font-medium transition-all duration-150 flex-shrink-0"
            style={{ color: "var(--green)", borderColor: "var(--border)", background: "transparent" }}
            onMouseEnter={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "rgba(0,196,140,.05)";
              b.style.borderColor = "var(--green)";
            }}
            onMouseLeave={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "transparent";
              b.style.borderColor = "var(--border)";
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: "var(--green)", fill: "none", strokeWidth: 2 }}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Group Chat
          </button>

          {/* Group list */}
          <div className="flex-1 overflow-y-auto py-1 min-h-0" style={{ scrollbarWidth: "none" }}>
            <div
              className="text-[10px] font-semibold uppercase tracking-[.5px] px-4 py-2"
              style={{ color: "var(--muted)" }}
            >
              Active Groups
            </div>
            {GROUPS.map((group, i) => (
              <div
                key={group.id}
                className="flex items-center gap-[10px] px-3 py-[10px] mx-2 mb-[2px] rounded-[10px] cursor-pointer transition-all duration-150"
                style={
                  i === 0
                    ? { background: "var(--bg)", borderLeft: "3px solid var(--green)", paddingLeft: "9px" }
                    : { background: "transparent" }
                }
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg)"; }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = i === 0 ? "var(--bg)" : "transparent";
                }}
              >
                <GroupAvatarStack avatars={group.avatars} />
                <div className="flex-1 overflow-hidden">
                  <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{group.name}</div>
                  <div
                    className="text-[11px] overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ color: "var(--muted)", maxWidth: 130 }}
                  >
                    {group.preview}
                  </div>
                </div>
                {group.hasUnread && (
                  <div className="w-2 h-2 rounded-full flex-shrink-0 ml-auto" style={{ background: "var(--green)" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
