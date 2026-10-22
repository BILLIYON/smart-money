"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { label: "Platform Overview", href: "/admin/overview", icon: "📊" },
      { label: "Google Analytics & Traffic", href: "/admin/analytics", icon: "📈", badge: "Live", badgeTone: "green" as const },
    ],
  },
  {
    label: "Management",
    items: [
      { label: "User Management", href: "/admin/users", icon: "👥" },
      { label: "Buddy Moderation", href: "/admin/approvals", icon: "⚡", badge: "Queue", badgeTone: "orange" as const },
      { label: "Buddy Catalogue", href: "/admin/buddies", icon: "✦" },
      { label: "Help Desk & Reviews", href: "/admin/helpdesk", icon: "💬" },
    ],
  },
  {
    label: "System & Telemetry",
    items: [
      { label: "Data & Signals Engine", href: "/admin/data", icon: "🗄️" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <aside
      className="w-[230px] flex flex-col flex-shrink-0 h-screen sticky top-0 z-50 overflow-y-auto transition-colors duration-200"
      style={{
        background: "var(--card)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Brand Header */}
      <div className="px-[16px] pt-5 pb-[14px]" style={{ borderBottom: "1px solid var(--border)" }}>
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] w-full"
          style={{ background: "linear-gradient(135deg,var(--navy),var(--navy2))" }}
        >
          <div className="w-7 h-7 rounded-[8px] flex items-center justify-center font-bold text-white text-[13px] bg-white/10 flex-shrink-0">
            SM
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-white tracking-[.3px] truncate">
              Smart Money
            </div>
            <div className="text-[10px] flex items-center gap-1.5 font-medium" style={{ color: "rgba(255,255,255,.65)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Admin Console
            </div>
          </div>
        </div>
      </div>

      {/* Nav Sections */}
      <nav className="flex-1 py-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-2">
            <div
              className="px-[18px] pt-3 pb-1 text-[10px] font-bold uppercase tracking-[1px]"
              style={{ color: "var(--muted)" }}
            >
              {section.label}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin/overview" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-[10px] px-3.5 py-[9px] rounded-[10px] mx-2 my-[1px] transition-all duration-150 text-[13px] font-medium"
                  style={{
                    background: isActive ? "rgba(0,196,140,.1)" : "transparent",
                    color: isActive ? "var(--green)" : "var(--muted)",
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  <span className="text-[15px] w-5 text-center flex-shrink-0">{item.icon}</span>
                  <span className="truncate flex-1">{item.label}</span>
                  {item.badge && (
                    <span
                      className="px-[6px] py-[1.5px] rounded-[6px] text-[9px] font-bold text-white uppercase tracking-wider"
                      style={{
                        background: item.badgeTone === "orange" ? "var(--gold)" : "var(--green)",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Controls: Status & User App Return */}
      <div className="p-3 border-t flex flex-col gap-2" style={{ borderColor: "var(--border)" }}>
        <div
          className="flex items-center justify-between px-3 py-2 rounded-[8px] border text-[11px]"
          style={{ background: "var(--bg)", borderColor: "var(--border)" }}
        >
          <span className="font-semibold" style={{ color: "var(--text)" }}>System Status</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: "rgba(0,196,140,0.12)", color: "var(--green2)" }}
          >
            ● Online
          </span>
        </div>

        <a
          href="https://smartmoney.technology"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-[8px] text-[11px] font-semibold border transition-all text-center hover:bg-black/5"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
        >
          <span>←</span> Return to User App
        </a>
      </div>
    </aside>
  );
}
