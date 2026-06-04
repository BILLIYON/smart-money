"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, Database, Target, Settings } from "lucide-react";

const NAV = [
  { href: "/",            icon: Home,         label: "Market" },
  { href: "/chat",        icon: MessageSquare, label: "Buddies" },
  { href: "/databank",    icon: Database,      label: "DataBank" },
  { href: "/goals",       icon: Target,        label: "Goals" },
  { href: "/settings",    icon: Settings,      label: "Settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 h-[60px] flex justify-around items-center px-2 z-50 transition-colors duration-[250ms]"
      style={{
        background: "var(--topbar-bg)",
        borderTop: "1px solid var(--border)",
      }}
    >
      {NAV.map(({ href, icon: Icon, label }) => {
        const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-label={`Go to ${label}`}
            className="flex flex-col items-center gap-[2px] cursor-pointer px-3 py-1.5 rounded-[10px] flex-1 transition-all duration-200"
          >
            <Icon
              size={20}
              strokeWidth={1.8}
              fill="none"
              style={{ stroke: active ? "var(--green)" : "var(--muted)" }}
            />
            <span
              className="text-[9px] font-medium"
              style={{ color: active ? "var(--green)" : "var(--muted)" }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
