"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Home,
  MessageSquare,
  Database,
  Target,
  PenLine,
  BarChart2,
  Zap,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_MAIN = [
  { href: "/marketplace", icon: Home,         label: "Marketplace" },
  { href: "/chat",        icon: MessageSquare, label: "My Buddies" },
  { href: "/databank",    icon: Database,      label: "DataBank" },
  { href: "/goals",       icon: Target,        label: "Goal Tracker" },
];

const NAV_TOOLS = [
  { href: "/studio",  icon: PenLine,   label: "AI Studio" },
  { href: "/creator", icon: BarChart2, label: "Creator Dashboard" },
  { href: "/agent",   icon: Zap,       label: "Agentic Actions" },
];

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 flex-shrink-0 group",
        isActive ? "bg-green/15" : "hover:bg-green/15"
      )}
    >
      {/* Active indicator — green left stripe */}
      {isActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-green rounded-r-[3px]"
          aria-hidden
        />
      )}

      <Icon
        size={20}
        strokeWidth={1.8}
        fill="none"
        style={{ stroke: isActive ? "var(--green)" : "var(--sidebar-icon)" }}
        className="transition-colors duration-200"
      />

      {/* Tooltip */}
      <span className="pointer-events-none invisible group-hover:visible absolute left-14 z-[200] whitespace-nowrap rounded-md px-[10px] py-1 text-[11px] font-medium" style={{ background: "var(--text)", color: "var(--bg)" }}>
        {label}
      </span>
    </Link>
  );
}

function getInitials(fullName: string | null | undefined, email: string | undefined): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

export function Sidebar({ user }: { user?: { email: string; fullName: string | null } }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const isDark = resolvedTheme === "dark";

  return (
    <aside
      className="hidden md:flex w-[72px] flex-col items-center py-5 gap-1.5 flex-shrink-0 z-10 overflow-y-auto transition-colors duration-[250ms]"
      style={{ background: "var(--sidebar-bg)" }}
    >
      {/* Logo mark */}
      <Link
        href="/marketplace"
        className="flex items-center justify-center w-10 h-10 rounded-xl mb-3 flex-shrink-0 transition-opacity hover:opacity-90"
        style={{ background: "var(--green)" }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" className="w-5 h-5">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </Link>

      {/* Primary nav */}
      {NAV_MAIN.map((item) => (
        <NavItem key={item.href} {...item} isActive={isActive(item.href)} />
      ))}

      {/* Separator */}
      <span className="w-6 h-px my-1 flex-shrink-0" style={{ background: "rgba(255,255,255,.1)" }} />

      {/* Tool nav */}
      {NAV_TOOLS.map((item) => (
        <NavItem key={item.href} {...item} isActive={isActive(item.href)} />
      ))}

      {/* Spacer pushes bottom widget down */}
      <div className="flex-1" />

      {/* Bottom widget — theme toggle + avatar/settings */}
      <div className="flex flex-col items-center gap-1.5 py-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          title="Toggle dark / light mode"
          className="flex items-center justify-center w-9 h-9 rounded-[10px] transition-all duration-200 flex-shrink-0 group"
          style={{
            background: "rgba(255,255,255,.07)",
            border: "1px solid rgba(255,255,255,.1)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,196,140,.15)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,196,140,.3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,.07)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,.1)";
          }}
        >
          {isDark ? (
            <Sun size={16} strokeWidth={2} fill="none" style={{ stroke: "var(--sidebar-icon)" }} />
          ) : (
            <Moon size={16} strokeWidth={2} fill="none" style={{ stroke: "var(--sidebar-icon)" }} />
          )}
        </button>

        {/* Avatar / Settings */}
        <Link
          href="/settings"
          className="relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 group hover:bg-green/15"
          title="Profile & Settings"
        >
          {/* Avatar circle */}
          <div
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[12px] font-bold text-white"
            style={{ background: "var(--gold)" }}
          >
            {getInitials(user?.fullName, user?.email)}
          </div>
          {/* Online indicator */}
          <span
            className="absolute bottom-[-1px] right-[-1px] w-[10px] h-[10px] rounded-full border-2"
            style={{ background: "var(--green)", borderColor: "var(--sidebar-bg)" }}
          />

          {/* Tooltip */}
          <span className="pointer-events-none invisible group-hover:visible absolute left-14 z-[200] whitespace-nowrap rounded-md px-[10px] py-1 text-[11px] font-medium" style={{ background: "var(--text)", color: "var(--bg)" }}>
            Profile &amp; Settings
          </span>
        </Link>
      </div>
    </aside>
  );
}
