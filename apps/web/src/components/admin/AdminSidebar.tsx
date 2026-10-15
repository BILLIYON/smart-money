"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { label: "Overview", href: "/admin/overview", icon: "📊" },
  { label: "Google Analytics & Traffic", href: "/admin/analytics", icon: "📈" },
  { label: "User Management", href: "/admin/users", icon: "👥" },
  { label: "Buddy Approvals", href: "/admin/approvals", icon: "🤖" },
  { label: "Help Desk & Reviews", href: "/admin/helpdesk", icon: "💬" },
  { label: "Buddy Catalogue", href: "/admin/buddies", icon: "✦" },
  { label: "Data & Signals Engine", href: "/admin/data", icon: "🗄️" },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 z-50 border-r transition-colors duration-200"
      style={{
        width: 240,
        minWidth: 240,
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      {/* Brand & System Status Header */}
      <div
        className="p-5 pb-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--muted)" }}>
            Smart Money Enterprise
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border"
            style={{
              color: "var(--green2)",
              background: "rgba(0,196,140,0.1)",
              borderColor: "rgba(0,196,140,0.25)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--green)" }} />
            ONLINE
          </span>
        </div>
        <div className="text-[15px] font-bold tracking-tight" style={{ color: "var(--text)" }}>
          Admin Console
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-3 flex-1 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3.5 py-2.5 text-[13px] rounded-[10px] transition-all duration-150"
              style={{
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--green2)" : "var(--muted)",
                background: isActive ? "rgba(0,196,140,0.08)" : "transparent",
                border: isActive ? "1px solid rgba(0,196,140,0.25)" : "1px solid transparent",
              }}
            >
              <span className="text-[15px] w-5 h-5 flex items-center justify-center flex-shrink-0">
                {icon}
              </span>
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme Switcher & Footer */}
      <div className="p-4 border-t flex flex-col gap-3" style={{ borderColor: "var(--border)" }}>
        {/* Theme Mode Switcher */}
        {mounted && (
          <div className="flex items-center gap-1 p-1 rounded-[10px] border" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            <button
              type="button"
              onClick={() => setTheme("light")}
              className="flex-1 py-1.5 px-2 rounded-[8px] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
              style={{
                background: theme === "light" ? "var(--card)" : "transparent",
                color: theme === "light" ? "var(--green2)" : "var(--muted)",
                border: theme === "light" ? "1px solid var(--border)" : "none",
                boxShadow: theme === "light" ? "0 1px 3px var(--shadow)" : "none",
                cursor: "pointer",
              }}
            >
              <span>☀️</span> Light
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className="flex-1 py-1.5 px-2 rounded-[8px] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
              style={{
                background: theme === "dark" ? "var(--card)" : "transparent",
                color: theme === "dark" ? "var(--green2)" : "var(--muted)",
                border: theme === "dark" ? "1px solid var(--border)" : "none",
                boxShadow: theme === "dark" ? "0 1px 3px var(--shadow)" : "none",
                cursor: "pointer",
              }}
            >
              <span>🌙</span> Dark
            </button>
          </div>
        )}

        {/* DB Telemetry */}
        <div className="rounded-[10px] p-3 border text-[11px]" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
            Database Cluster
          </div>
          <div className="font-bold flex items-center justify-between" style={{ color: "var(--text)" }}>
            <span>PostgreSQL 16</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: "rgba(0,196,140,0.12)", color: "var(--green2)" }}>
              Native EC2
            </span>
          </div>
        </div>

        <Link
          href="/marketplace"
          className="flex items-center justify-center gap-2 py-2 px-3 rounded-[10px] text-[12px] font-semibold border transition-all text-center"
          style={{
            background: "transparent",
            borderColor: "var(--border)",
            color: "var(--muted)",
          }}
        >
          <span>←</span> Back to User App
        </Link>
      </div>
    </aside>
  );
}
