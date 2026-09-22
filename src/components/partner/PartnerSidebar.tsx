"use client";

import { PARTNER_ORG } from "./mockData";

export type PartnerTab =
  | "overview"
  | "clients"
  | "approvals"
  | "features"
  | "buddies"
  | "staff"
  | "onboarding"
  | "analytics-cfg"
  | "database"
  | "research"
  | "goals-cfg"
  | "api";

const NAV_SECTIONS: { label: string; items: { id: PartnerTab; icon: string; label: string; badge?: string; badgeTone?: "green" | "orange" }[] }[] = [
  {
    label: "Overview",
    items: [
      { id: "overview", icon: "📊", label: "Dashboard" },
      { id: "clients", icon: "👥", label: "Clients", badge: "48", badgeTone: "green" },
      { id: "approvals", icon: "⚡", label: "Approvals", badge: "3", badgeTone: "orange" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { id: "features", icon: "🎛️", label: "Feature Control" },
      { id: "buddies", icon: "🤖", label: "AI Buddies" },
      { id: "staff", icon: "🏢", label: "Staff & Roles" },
      { id: "onboarding", icon: "📋", label: "Client Onboarding" },
      { id: "analytics-cfg", icon: "⚙️", label: "Analytics Rules" },
      { id: "database", icon: "🗄️", label: "Database (BYOD)" },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "research", icon: "🔬", label: "AI Research" },
      { id: "goals-cfg", icon: "🎯", label: "Write Client Goals" },
      { id: "api", icon: "📡", label: "API & Docs" },
    ],
  },
];

export function PartnerSidebar({
  active,
  onChange,
}: {
  active: PartnerTab;
  onChange: (tab: PartnerTab) => void;
}) {
  return (
    <div
      className="w-[220px] flex flex-col flex-shrink-0 overflow-y-auto"
      style={{ background: "var(--card)", borderRight: "1px solid var(--border)" }}
    >
      <div className="px-[18px] pt-5 pb-[14px]" style={{ borderBottom: "1px solid var(--border)" }}>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-[10px] w-full"
          style={{ background: "linear-gradient(135deg,var(--navy),var(--navy2))" }}
        >
          <div>
            <div className="text-[13px] font-bold text-white tracking-[.3px]">{PARTNER_ORG.name}</div>
            <div className="text-[10px] mt-[1px]" style={{ color: "rgba(255,255,255,.45)" }}>
              {PARTNER_ORG.subtitle}
            </div>
          </div>
        </div>
      </div>

      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <div
            className="px-[14px] pt-[14px] pb-1 text-[10px] font-bold uppercase tracking-[1px]"
            style={{ color: "var(--muted)" }}
          >
            {section.label}
          </div>
          {section.items.map((item) => {
            const isActive = active === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onChange(item.id)}
                className="flex items-center gap-[10px] px-3 py-[9px] rounded-[10px] mx-2 my-[1px] cursor-pointer transition-all duration-150 text-[13px] font-medium"
                style={{
                  background: isActive ? "rgba(0,196,140,.1)" : "transparent",
                  color: isActive ? "var(--green)" : "var(--muted)",
                }}
              >
                <span className="text-[15px] w-5 text-center flex-shrink-0">{item.icon}</span>
                {item.label}
                {item.badge && (
                  <span
                    className="ml-auto px-[7px] py-[2px] rounded-[10px] text-[10px] font-bold text-white"
                    style={{ background: item.badgeTone === "orange" ? "var(--gold)" : "var(--green)" }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
