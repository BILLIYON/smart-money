"use client";

import { SectionHeader, Avatar, StatusPill, comingSoon } from "../shared";
import { ROLE_DEFS, STAFF } from "../mockData";

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  Admin: { bg: "rgba(74,26,107,.1)", color: "#4A1A6B" },
  Advisor: { bg: "rgba(0,196,140,.1)", color: "var(--green2)" },
  Analyst: { bg: "rgba(245,166,35,.1)", color: "#C47F00" },
};

export function StaffPanel() {
  return (
    <div>
      <SectionHeader
        title="🏢 Staff &"
        emphasis="Roles"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => comingSoon("Copying an invite link")}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold border"
              style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
            >
              Copy Invite Link
            </button>
            <button
              onClick={() => comingSoon("Inviting staff via email")}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold text-white border-none"
              style={{ background: "var(--green)" }}
            >
              + Invite via Email
            </button>
          </div>
        }
      />

      <div className="rounded-[10px] px-4 py-[14px] mb-5" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
        <div className="text-[13px] font-semibold mb-2" style={{ color: "var(--text)" }}>Role Permissions</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {ROLE_DEFS.map((r) => (
            <div key={r.role} className="rounded-[8px] p-[10px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <span
                className="inline-flex px-[10px] py-[3px] rounded-full text-[10px] font-semibold mb-[6px]"
                style={{ background: (ROLE_STYLES[r.role] ?? { bg: "rgba(107,122,153,.1)", color: "var(--muted)" }).bg, color: (ROLE_STYLES[r.role] ?? { bg: "", color: "var(--muted)" }).color }}
              >
                {r.role}
              </span>
              <div className="text-[10px] leading-relaxed" style={{ color: "var(--muted)" }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[16px] overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
              {["Staff Member", "Role", "Assigned Clients", "AI Buddy", "Last Active", "Status", ""].map((h) => (
                <th key={h} className="text-[10px] font-bold uppercase tracking-[.5px] px-[14px] py-[10px] text-left whitespace-nowrap" style={{ color: "var(--muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAFF.map((s) => (
              <tr key={s.email} style={{ borderBottom: "1px solid var(--border)", opacity: s.status === "Invited" ? 0.6 : 1 }}>
                <td className="px-[14px] py-3">
                  <div className="flex items-center gap-[10px]">
                    <Avatar initials={s.initials} color={s.color} />
                    <div>
                      <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{s.name}</div>
                      <div className="text-[11px]" style={{ color: "var(--muted)" }}>{s.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-[14px] py-3">
                  <span className="inline-flex px-[10px] py-[3px] rounded-full text-[10px] font-semibold" style={{ background: (ROLE_STYLES[s.role] ?? { bg: "rgba(107,122,153,.1)", color: "var(--muted)" }).bg, color: (ROLE_STYLES[s.role] ?? { bg: "", color: "var(--muted)" }).color }}>
                    {s.role}
                  </span>
                </td>
                <td className="px-[14px] py-3 text-[12px]" style={{ color: "var(--muted)" }}>{s.assigned}</td>
                <td className="px-[14px] py-3 text-[12px]" style={{ color: "var(--text)" }}>{s.buddy}</td>
                <td className="px-[14px] py-3 text-[12px]" style={{ color: "var(--muted)" }}>{s.lastActive}</td>
                <td className="px-[14px] py-3"><StatusPill label={s.status} tone={s.status === "Active" ? "active" : "pending"} /></td>
                <td className="px-[14px] py-3">
                  <button
                    onClick={() => comingSoon(s.status === "Invited" ? "Resending invites" : "Editing staff")}
                    className="px-[10px] py-[6px] rounded-[8px] text-[11px] font-semibold border"
                    style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
                  >
                    {s.status === "Invited" ? "Resend" : "Edit"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
