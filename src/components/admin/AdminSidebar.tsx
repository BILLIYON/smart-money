"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Overview", href: "/admin/overview", icon: "📊" },
  { label: "Help Desk & Reviews", href: "/admin/helpdesk", icon: "💬" },
  { label: "Users", href: "/admin/users", icon: "👥" },
  { label: "Buddies", href: "/admin/buddies", icon: "🤖" },
  { label: "Buddy Approvals", href: "/admin/approvals", icon: "✦" },
  { label: "Data Management", href: "/admin/data", icon: "🗄" },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        height: "100vh",
        background: "#0B1E3D",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,.08)",
        position: "sticky",
        top: 0,
      }}
    >
      {/* Brand */}
      <div
        style={{
          padding: "24px 20px 20px",
          borderBottom: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: "#00C48C", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 4 }}>
          Smart Money
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.9)" }}>
          Admin Console
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "12px 0", flex: 1 }}>
        {NAV_ITEMS.map(({ label, href, icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#00C48C" : "rgba(255,255,255,.55)",
                textDecoration: "none",
                borderLeft: isActive ? "3px solid #00C48C" : "3px solid transparent",
                background: isActive ? "rgba(0,196,140,.08)" : "transparent",
                transition: "all .15s",
              }}
            >
              <span style={{ fontSize: 15, width: 18, textAlign: "center", flexShrink: 0 }}>
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid rgba(255,255,255,.08)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <Link
          href="/marketplace"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "8px 12px",
            background: "rgba(255,255,255,.05)",
            border: "1px solid rgba(255,255,255,.1)",
            borderRadius: 8,
            color: "rgba(255,255,255,.7)",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
            transition: "all .15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,.1)";
            (e.currentTarget as HTMLAnchorElement).style.color = "#ffffff";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,.05)";
            (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,.7)";
          }}
        >
          <span>←</span> Back to Marketplace
        </Link>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", textAlign: "center" }}>
          Admin only · v1.0
        </div>
      </div>
    </aside>
  );
}
