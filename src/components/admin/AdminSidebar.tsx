"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Overview", href: "/admin/overview", icon: "📊" },
  { label: "User Management", href: "/admin/users", icon: "👥" },
  { label: "Buddy Approvals", href: "/admin/approvals", icon: "🤖" },
  { label: "Help Desk & Reviews", href: "/admin/helpdesk", icon: "💬" },
  { label: "Buddy Catalogue", href: "/admin/buddies", icon: "✦" },
  { label: "Data & Signals Engine", href: "/admin/data", icon: "🗄️" },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 240,
        minWidth: 240,
        height: "100vh",
        background: "#1E293B",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid #334155",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Brand & System Status Header */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid #334155",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyBetween: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "1px", textTransform: "uppercase" }}>
            Smart Money Enterprise
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 10,
              fontWeight: 600,
              color: "#10B981",
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              marginLeft: "auto",
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#10B981",
              }}
            />
            ONLINE
          </span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.2px" }}>
          Admin Console
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={{ padding: "16px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV_ITEMS.map(({ label, href, icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "#F8FAFC" : "#94A3B8",
                textDecoration: "none",
                borderRadius: 8,
                background: isActive ? "#334155" : "transparent",
                border: isActive ? "1px solid #475569" : "1px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  width: 20,
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {icon}
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Database & Infrastructure Telemetry Footer */}
      <div
        style={{
          padding: "16px",
          borderTop: "1px solid #334155",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Database Cluster
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#F8FAFC", marginTop: 2, display: "flex", alignItems: "center", justifyBetween: "space-between" }}>
            <span>PostgreSQL 16</span>
            <span style={{ fontSize: 10, color: "#10B981", background: "rgba(16,185,129,0.1)", padding: "1px 5px", borderRadius: 4, marginLeft: "auto" }}>
              Native EC2
            </span>
          </div>
        </div>

        <Link
          href="/marketplace"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "8px 12px",
            background: "transparent",
            border: "1px solid #334155",
            borderRadius: 8,
            color: "#94A3B8",
            fontSize: 12,
            fontWeight: 500,
            textDecoration: "none",
            transition: "all 0.15s",
          }}
        >
          <span>←</span> Back to User App
        </Link>
      </div>
    </aside>
  );
}
