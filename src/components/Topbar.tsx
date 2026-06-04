"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, Bell, Swords } from "lucide-react";
import { useNotificationStore, type Notification, type NotificationType } from "@/store/notificationStore";
import { useCompareStore } from "@/store/compareStore";
import { getBuddy } from "@/lib/buddies";

// ── Helpers ────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}hr ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

type IconSpec = { icon: string; iconBg: string };

function typeToIcon(type: NotificationType, buddyId?: string): IconSpec {
  if (type === "salary") return { icon: "💰", iconBg: "rgba(245,166,35,.12)" };
  if (type === "signal") return { icon: "⚡", iconBg: "rgba(74,144,217,.1)" };
  if (type === "agent")  return { icon: "⚙️", iconBg: "rgba(0,196,140,.1)" };
  if (type === "goal")   return { icon: "🎯", iconBg: "rgba(0,196,140,.1)" };
  // Use buddy emoji as icon when available
  const buddy = buddyId ? getBuddy(buddyId) : undefined;
  if (buddy && !buddy.avatarIsSerif) return { icon: buddy.avatarContent, iconBg: "rgba(107,122,153,.1)" };
  return { icon: "🔔", iconBg: "rgba(107,122,153,.1)" };
}

function toBuddyLabel(n: Notification): string {
  if (n.buddyName) return n.buddyName;
  if (n.buddyId) return getBuddy(n.buddyId)?.name ?? "Smart Money";
  if (n.type === "salary") return "💰 Open Banking";
  if (n.type === "signal") return "⚡ Signal Alert";
  if (n.type === "agent")  return "⚙️ Agent Action";
  return "Smart Money";
}

// ── Component ──────────────────────────────────────────────
export function Topbar() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const notifRef = useRef<HTMLDivElement>(null);

  const notifications  = useNotificationStore((s) => s.notifications);
  const unreadCount    = useNotificationStore((s) => s.unreadCount);
  const loadNotifications = useNotificationStore((s) => s.loadNotifications);
  const storeMarkAllRead  = useNotificationStore((s) => s.markAllRead);
  const openCompare    = useCompareStore((s) => s.openCompare);

  // Load notifications from DB on mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  async function markAllRead() {
    storeMarkAllRead(); // optimistic
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
    } catch { /* silent — optimistic already applied */ }
  }

  return (
    <header
      className="flex items-center h-16 px-7 gap-4 flex-shrink-0 transition-colors duration-[250ms] relative"
      style={{
        background: "var(--topbar-bg)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Title */}
      <div className="text-[18px] font-semibold flex-1" style={{ color: "var(--text)" }}>
        Smart <span style={{ color: "var(--green)" }}>Money</span>
      </div>

      {/* Search bar — hidden on mobile */}
      <div
        className="hidden md:flex items-center gap-2 rounded-[10px] px-[14px] py-2 w-60 transition-all duration-200"
        style={{
          background: "var(--input-bg)",
          border: "1px solid var(--border)",
        }}
      >
        <Search size={15} strokeWidth={1.8} fill="none" style={{ stroke: "var(--muted)", flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search buddies, topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none outline-none text-[13px] w-full"
          style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}
        />
      </div>

      {/* Compare button */}
      <button
        onClick={openCompare}
        aria-label="Compare buddies"
        className="hidden md:flex items-center gap-1.5 px-[18px] py-2 rounded-[10px] text-[13px] font-medium whitespace-nowrap transition-all duration-200"
        style={{
          background: "transparent",
          color: "var(--muted)",
          border: "1px solid var(--border)",
        }}
        onMouseEnter={(e) => {
          const btn = e.currentTarget;
          btn.style.borderColor = "var(--green)";
          btn.style.color = "var(--green)";
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget;
          btn.style.borderColor = "var(--border)";
          btn.style.color = "var(--muted)";
        }}
      >
        <Swords size={14} strokeWidth={1.8} fill="none" style={{ stroke: "currentColor" }} />
        Compare
      </button>

      {/* Notification bell */}
      <div ref={notifRef} className="relative">
        <button
          id="notif-btn"
          onClick={() => setNotifOpen((v) => !v)}
          aria-label="Notifications"
          aria-expanded={notifOpen}
          className="relative flex items-center justify-center w-9 h-9 rounded-[10px] flex-shrink-0 transition-all duration-200"
          style={{
            background: "var(--input-bg)",
            border: "1px solid var(--border)",
          }}
        >
          <Bell size={17} strokeWidth={1.8} fill="none" style={{ stroke: "var(--muted)" }} />

          {/* Unread count badge */}
          {unreadCount > 0 && (
            <span
              className="absolute -top-[6px] -right-[6px] min-w-[16px] h-[16px] px-[3px] rounded-full text-[10px] font-bold text-white flex items-center justify-center"
              style={{ background: "#E24B4A", lineHeight: 1 }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Notification dropdown */}
        {notifOpen && (
          <div
            className="absolute top-[calc(100%+6px)] right-0 w-[380px] rounded-[16px] overflow-hidden z-[150]"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 16px 48px var(--shadow)",
              animation: "fadeDown .18s ease",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span
                    className="px-[7px] py-[2px] rounded-full text-[10px] font-bold text-white"
                    style={{ background: "var(--green)" }}
                  >
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={markAllRead}
                className="text-[11px] font-medium transition-opacity hover:opacity-70"
                style={{ color: "var(--green)" }}
              >
                Mark all read
              </button>
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto">
              {notifications.length === 0 && (
                <div
                  className="py-10 text-center text-[13px]"
                  style={{ color: "var(--muted)" }}
                >
                  No notifications yet
                </div>
              )}

              {notifications.map((n) => {
                const { icon, iconBg } = typeToIcon(n.type, n.buddyId);
                const buddyLabel = toBuddyLabel(n);
                const metaParts = [timeAgo(n.createdAt)];
                if (n.triggerSource) metaParts.push(`Triggered by: ${n.triggerSource}`);
                const actionHref = n.actionUrl ?? (n.sessionId ? "/chat" : null);

                return (
                  <div
                    key={n.id}
                    className="flex gap-3 py-[14px] cursor-pointer transition-colors duration-150"
                    style={{
                      paddingLeft: !n.read ? "17px" : "20px",
                      paddingRight: "20px",
                      borderBottom: "1px solid var(--border)",
                      borderLeft: !n.read ? "3px solid var(--green)" : "3px solid transparent",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                  >
                    {/* Icon */}
                    <div
                      className="flex-shrink-0 w-9 h-9 rounded-[10px] flex items-center justify-center text-base"
                      style={{ background: iconBg }}
                    >
                      {icon}
                    </div>

                    {/* Body */}
                    <div className="min-w-0">
                      <div
                        className="text-[11px] font-semibold mb-[3px]"
                        style={{ color: !n.read ? "var(--green)" : "var(--muted)" }}
                      >
                        {buddyLabel}
                      </div>
                      <div
                        className="text-[12px] leading-[1.5] mb-1"
                        style={{ color: !n.read ? "var(--text)" : "var(--muted)" }}
                      >
                        {n.body || n.title}
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--muted)" }}>
                        {metaParts.join(" · ")}
                      </div>
                      {actionHref && (
                        <Link
                          href={actionHref}
                          onClick={() => setNotifOpen(false)}
                          className="inline-block mt-1.5 text-[11px] font-medium transition-opacity hover:opacity-70"
                          style={{ color: "var(--green)" }}
                        >
                          → Open Chat
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div
              className="px-5 py-3 text-center"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <button
                onClick={() => setNotifOpen(false)}
                className="text-[12px] font-medium transition-opacity hover:opacity-70"
                style={{ color: "var(--green)" }}
              >
                View all notifications
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tour Button */}
      <button
        onClick={() => {
          window.dispatchEvent(new CustomEvent("trigger-onboarding-tour"));
        }}
        className="hidden md:flex items-center gap-1.5 px-[15px] py-2 rounded-[10px] text-[13px] font-medium transition-all duration-200 cursor-pointer flex-shrink-0"
        style={{
          background: "rgba(0,196,140,.07)",
          border: "1px solid rgba(0,196,140,.15)",
          color: "var(--green)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,196,140,.15)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,196,140,.3)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,196,140,.07)";
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,196,140,.15)";
        }}
      >
        ✨ Take Tour
      </button>

      {/* Chat Now CTA */}
      <Link
        href="/chat"
        className="hidden md:flex items-center px-[18px] py-2 rounded-[10px] text-[13px] font-medium text-white flex-shrink-0 transition-colors duration-200"
        style={{ background: "var(--green)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--green2)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--green)"; }}
      >
        Chat Now
      </Link>
    </header>
  );
}
