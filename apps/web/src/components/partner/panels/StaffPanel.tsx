"use client";

import { useState, useEffect } from "react";
import { SectionHeader, Avatar, StatusPill } from "../shared";
const ROLE_DEFS = [
  { role: "Admin", desc: "Full access. All clients, all data, billing, staff management" },
  { role: "Advisor", desc: "Assigned clients only. Full data, can approve actions, write goals" },
  { role: "Analyst", desc: "All clients, read-only spend analytics. Cannot see transactions" },
  { role: "View Only", desc: "Dashboard and health scores only. No individual client data" },
];

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  Admin: { bg: "rgba(74,26,107,.1)", color: "#4A1A6B" },
  Advisor: { bg: "rgba(0,196,140,.1)", color: "var(--green2)" },
  Analyst: { bg: "rgba(245,166,35,.1)", color: "#C47F00" },
  "View Only": { bg: "rgba(107,122,153,.1)", color: "var(--muted)" },
};

export function StaffPanel() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);

  // Invite Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("advisor");

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/partner/staff");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.staff)) {
          setStaffList(data.staff);
        }
      }
    } catch (err) {
      console.warn("[StaffPanel] Error loading staff:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCopyLink = () => {
    const defaultInviteUrl = `https://smartmoney.technology/register?partner=stanbic-wealth`;
    navigator.clipboard.writeText(defaultInviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setInviting(true);
    setInviteFeedback(null);

    try {
      const res = await fetch("/api/partner/staff/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });

      const data = await res.json();
      if (res.ok) {
        setInviteFeedback(`✓ Invitation sent to ${email} via AWS SES!`);
        setName("");
        setEmail("");
        fetchStaff();
        setTimeout(() => {
          setInviteModalOpen(false);
          setInviteFeedback(null);
        }, 2000);
      } else {
        setInviteFeedback(`✗ ${data.error || "Failed to dispatch invitation"}`);
      }
    } catch (err: any) {
      setInviteFeedback(`✗ Error: ${err.message}`);
    } finally {
      setInviting(false);
    }
  };

  return (
    <div>
      <SectionHeader
        title="🏢 Staff &"
        emphasis="Roles"
        action={
          <div className="flex gap-2">
            <button
              onClick={handleCopyLink}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold border cursor-pointer hover:bg-neutral-800 transition-all"
              style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
            >
              {copied ? "✓ Copied Link!" : "Copy Invite Link"}
            </button>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold text-white border-none cursor-pointer hover:bg-emerald-600 transition-all shadow"
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

      {loading ? (
        <div className="rounded-[16px] p-12 text-center border" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--muted)" }}>
          <div className="text-[14px] animate-pulse">Loading staff directory...</div>
        </div>
      ) : staffList.length === 0 ? (
        <div className="rounded-[16px] p-12 text-center border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="text-[36px] mb-3">🏢</div>
          <div className="text-[16px] font-semibold mb-1" style={{ color: "var(--text)" }}>No Staff Members Enrolled Yet</div>
          <div className="text-[12px] max-w-[420px] mx-auto mb-5 leading-relaxed" style={{ color: "var(--muted)" }}>
            Invite wealth advisors, portfolio analysts, and backoffice reviewers to collaborate in your firm portal.
          </div>
          <button
            onClick={() => {
              setInviteModalOpen(true);
              setInviteFeedback(null);
            }}
            className="px-5 py-[10px] rounded-[10px] text-[13px] font-semibold text-white border-none cursor-pointer hover:opacity-90 transition-all"
            style={{ background: "var(--green)" }}
          >
            + Invite First Team Member
          </button>
        </div>
      ) : (
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
              {staffList.map((s, idx) => (
                <tr key={s.email || idx} style={{ borderBottom: "1px solid var(--border)", opacity: s.status === "Invited" ? 0.75 : 1 }}>
                  <td className="px-[14px] py-3">
                    <div className="flex items-center gap-[10px]">
                      <Avatar initials={s.initials || "ST"} color={s.color || "linear-gradient(135deg,#0B1E3D,#1A3A6E)"} />
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
                  <td className="px-[14px] py-3 text-[12px]" style={{ color: "var(--muted)" }}>{s.assigned || "None assigned"}</td>
                  <td className="px-[14px] py-3 text-[12px]" style={{ color: "var(--text)" }}>{s.buddy || "Stanbic Wealth Co-Pilot"}</td>
                  <td className="px-[14px] py-3 text-[12px]" style={{ color: "var(--muted)" }}>{s.lastActive || "Recently"}</td>
                  <td className="px-[14px] py-3">
                    <StatusPill label={s.status} tone={s.status === "Active" ? "active" : "pending"} />
                  </td>
                  <td className="px-[14px] py-3 text-right">
                    <button
                      onClick={() => {
                        if (s.inviteToken) {
                          navigator.clipboard.writeText(`https://smartmoney.technology/register?staffInvite=${s.inviteToken}`);
                          alert("Copied specific staff invite link to clipboard!");
                        } else {
                          handleCopyLink();
                        }
                      }}
                      className="px-[10px] py-[6px] rounded-[8px] text-[11px] font-semibold border cursor-pointer hover:bg-neutral-800 transition-all"
                      style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
                    >
                      {s.status === "Invited" ? "Copy Invite" : "Details"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md rounded-[18px] p-6 shadow-2xl border text-white animate-in fade-in zoom-in-95 duration-150"
            style={{ background: "var(--navy2)", borderColor: "rgba(0,196,140,.35)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[17px] font-bold">🏢 Invite Staff Colleague</h3>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] block mb-1" style={{ color: "var(--muted)" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Bukola Saraki"
                  className="w-full px-3 py-2 rounded-[10px] border text-[13px] outline-none"
                  style={{ background: "var(--navy)", borderColor: "var(--border)", color: "#fff" }}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] block mb-1" style={{ color: "var(--muted)" }}>
                  Corporate Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@yourfirm.com"
                  className="w-full px-3 py-2 rounded-[10px] border text-[13px] outline-none"
                  style={{ background: "var(--navy)", borderColor: "var(--border)", color: "#fff" }}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] block mb-1" style={{ color: "var(--muted)" }}>
                  Assigned Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-[10px] border text-[13px] outline-none"
                  style={{ background: "var(--navy)", borderColor: "var(--border)", color: "#fff" }}
                >
                  <option value="advisor">Advisor (Manage clients & publish goals)</option>
                  <option value="analyst">Analyst (Research & read-only client access)</option>
                  <option value="admin">Admin (Manage staff, firm settings & billing)</option>
                  <option value="view_only">View Only (Audit & reporting only)</option>
                </select>
              </div>

              {inviteFeedback && (
                <div
                  className="text-[12px] p-2.5 rounded-[8px] font-semibold"
                  style={{
                    background: inviteFeedback.startsWith("✓") ? "rgba(0,196,140,0.15)" : "rgba(226,75,74,0.15)",
                    color: inviteFeedback.startsWith("✓") ? "var(--green2)" : "#E24B4A",
                  }}
                >
                  {inviteFeedback}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 rounded-[10px] text-[12px] font-semibold border cursor-pointer hover:bg-neutral-800"
                  style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-5 py-2 rounded-[10px] text-[12px] font-semibold text-white cursor-pointer shadow-lg hover:bg-emerald-600 transition-all"
                  style={{ background: "var(--green)" }}
                >
                  {inviting ? "Sending Invitation..." : "Send Invitation via Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
