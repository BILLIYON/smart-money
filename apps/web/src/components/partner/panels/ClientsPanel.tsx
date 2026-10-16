"use client";

import { useState, useEffect } from "react";
import { SectionHeader, Avatar, StatusPill, Card } from "../shared";
import { CLIENTS, type ClientRow } from "../mockData";

export interface ExtendedClientRow extends ClientRow {
  id?: string;
  userId?: string;
  email?: string;
  advisorNotes?: string;
}

function HealthBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-[6px] w-20 rounded-[3px] overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-[3px]" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[12px] font-semibold" style={{ color }}>{score}</span>
    </div>
  );
}

export function ClientsPanel() {
  const [clients, setClients] = useState<ExtendedClientRow[]>(CLIENTS);
  const [selected, setSelected] = useState<ExtendedClientRow | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Notes state
  const [advisorNoteText, setAdvisorNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteStatus, setNoteStatus] = useState<string | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ success: boolean; message: string; inviteUrl?: string } | null>(null);

  // Load clients
  useEffect(() => {
    let isMounted = true;
    async function fetchClients() {
      try {
        const queryParams = search ? `?search=${encodeURIComponent(search)}` : "";
        const res = await fetch(`/api/partner/clients${queryParams}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.clients && data.clients.length > 0) {
            setClients(data.clients);
          }
        }
      } catch (err) {
        console.warn("[ClientsPanel] Error loading clients, using baseline:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      fetchClients();
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [search]);

  // Sync advisor note when selection changes
  useEffect(() => {
    if (selected) {
      setAdvisorNoteText(selected.advisorNotes || "");
      setNoteStatus(null);
    }
  }, [selected]);

  // Save advisor note
  async function handleSaveNote() {
    if (!selected) return;
    setSavingNote(true);
    setNoteStatus(null);

    const clientId = selected.id || selected.userId || selected.name;

    try {
      const res = await fetch(`/api/partner/clients/${encodeURIComponent(clientId)}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: advisorNoteText }),
      });

      if (res.ok) {
        setNoteStatus("✓ Note saved confidentially");
        setSelected((prev) => (prev ? { ...prev, advisorNotes: advisorNoteText } : null));
        setClients((prev) =>
          prev.map((c) => (c.name === selected.name ? { ...c, advisorNotes: advisorNoteText } : c))
        );
      } else {
        setNoteStatus("Failed to save note");
      }
    } catch {
      setNoteStatus("Network error saving note");
    } finally {
      setSavingNote(false);
    }
  }

  // Handle client invite
  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes("@")) return;

    setInviting(true);
    setInviteResult(null);

    try {
      const res = await fetch("/api/partner/clients/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, fullName: inviteName }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setInviteResult({
          success: true,
          message: data.message || `Invitation email sent to ${inviteEmail}`,
          inviteUrl: data.inviteUrl,
        });
        setInviteEmail("");
        setInviteName("");
      } else {
        setInviteResult({
          success: false,
          message: data.error || "Failed to send invitation",
        });
      }
    } catch {
      setInviteResult({
        success: false,
        message: "Failed to connect to invitation service",
      });
    } finally {
      setInviting(false);
    }
  }

  return (
    <div>
      <SectionHeader
        title="All"
        emphasis="Clients"
        action={
          <div className="flex gap-2">
            <div
              className="flex items-center gap-2 rounded-[10px] px-[14px] py-2 w-[220px]"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <span style={{ color: "var(--muted)" }}>🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="border-none bg-transparent text-[13px] outline-none w-full"
                style={{ color: "var(--text)" }}
              />
            </div>
            <button
              onClick={() => {
                setShowInviteModal(true);
                setInviteResult(null);
              }}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold text-white border-none cursor-pointer transition-all hover:opacity-90"
              style={{ background: "var(--green)" }}
            >
              + Invite Client
            </button>
          </div>
        }
      />

      {/* Main Roster Table */}
      <div className="rounded-[16px] overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
              {["Client", "Health Score", "Net Worth", "Last Activity", "Data Shared", "Buddy", "Status", ""].map((h) => (
                <th key={h} className="text-[10px] font-bold uppercase tracking-[.5px] px-[14px] py-[10px] text-left whitespace-nowrap" style={{ color: "var(--muted)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.name} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-[14px] py-3">
                  <div className="flex items-center gap-[10px]">
                    <Avatar initials={c.initials} color={c.color} />
                    <div>
                      <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{c.name}</div>
                      <div className="text-[11px]" style={{ color: "var(--muted)" }}>{c.joined}</div>
                    </div>
                  </div>
                </td>
                <td className="px-[14px] py-3"><HealthBar score={c.healthScore} color={c.healthColor} /></td>
                <td className="px-[14px] py-3 text-[13px] font-semibold" style={{ color: "var(--text)" }}>{c.netWorth}</td>
                <td className="px-[14px] py-3 text-[12px]" style={{ color: "var(--muted)" }}>{c.lastActivity}</td>
                <td className="px-[14px] py-3">
                  <StatusPill label={c.dataShared} tone={c.dataShared === "Full access" ? "active" : "pending"} />
                </td>
                <td className="px-[14px] py-3 text-[12px]" style={{ color: "var(--text)" }}>{c.buddy}</td>
                <td className="px-[14px] py-3">
                  <StatusPill label={c.status} tone={c.status === "Active" ? "active" : "pending"} />
                </td>
                <td className="px-[14px] py-3">
                  <button
                    onClick={() => setSelected(selected?.name === c.name ? null : c)}
                    className="px-[10px] py-[6px] rounded-[8px] text-[11px] font-semibold border cursor-pointer hover:bg-white/10"
                    style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
                  >
                    {selected?.name === c.name ? "Close" : "View"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Client Deep Dive Inspector */}
      {selected && (
        <div className="mt-6 rounded-[16px] overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div
            className="flex items-center gap-4 px-6 py-5"
            style={{ background: "linear-gradient(135deg, #0B1E3D, #1A3A6E)" }}
          >
            <div className="rounded-full flex items-center justify-center font-bold text-white shadow-md" style={{ width: 48, height: 48, background: "rgba(255,255,255,.15)", fontSize: 16 }}>
              {selected.initials}
            </div>
            <div className="flex-1">
              <div className="text-[18px] font-bold text-white">{selected.name}</div>
              <div className="text-[12px] mt-[2px]" style={{ color: "rgba(255,255,255,.6)" }}>
                {selected.joined} · Active {selected.lastActivity}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelected(null)}
                className="px-3 py-[7px] rounded-[8px] text-[12px] font-semibold border cursor-pointer hover:bg-white/10"
                style={{ borderColor: "rgba(255,255,255,.2)", color: "rgba(255,255,255,.7)" }}
              >
                ✕ Close
              </button>
            </div>
          </div>

          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-[16px] p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="text-[11px] uppercase tracking-[.5px] mb-1" style={{ color: "var(--muted)" }}>Health Score</div>
              <div className="text-[28px]" style={{ fontFamily: "var(--font-dm-serif)", color: "var(--green2)" }}>{selected.healthScore}</div>
            </div>
            <div className="rounded-[16px] p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="text-[11px] uppercase tracking-[.5px] mb-1" style={{ color: "var(--muted)" }}>Net Worth (Consent Scoped)</div>
              <div className="text-[28px]" style={{ fontFamily: "var(--font-dm-serif)", color: "var(--text)" }}>{selected.netWorth}</div>
            </div>
            <div className="rounded-[16px] p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="text-[11px] uppercase tracking-[.5px] mb-1" style={{ color: "var(--muted)" }}>Data Sharing Status</div>
              <div className="text-[16px] font-semibold mt-1" style={{ color: "var(--text)" }}>{selected.dataShared}</div>
            </div>
          </div>

          {/* Confidential Advisor Notes Box */}
          <div className="px-6 pb-6">
            <Card style={{ background: "var(--bg)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Private Advisor Notes</div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
                  🔒 Strict Confidentiality · Not Visible to Client
                </span>
              </div>
              <textarea
                value={advisorNoteText}
                onChange={(e) => setAdvisorNoteText(e.target.value)}
                placeholder="Record portfolio review notes, risk tolerance assessments, or next scheduled contact..."
                className="w-full rounded-[8px] px-3 py-[9px] text-[13px] outline-none transition-all"
                style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)", minHeight: 70 }}
              />
              <div className="mt-2 flex items-center justify-between">
                <button
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  className="px-4 py-[7px] rounded-[8px] text-[12px] font-semibold text-white border-none cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--green)" }}
                >
                  {savingNote ? "Saving..." : "Save Note"}
                </button>
                {noteStatus && (
                  <span className="text-[12px] font-medium" style={{ color: noteStatus.startsWith("✓") ? "var(--green)" : "#E24B4A" }}>
                    {noteStatus}
                  </span>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Invite Client Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md rounded-2xl p-6 border shadow-2xl relative"
            style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--text)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold">Invite a New Client</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-[18px] text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-[12px] mb-5" style={{ color: "var(--muted)" }}>
              Send an invitation via AWS SES. The client will receive a branded onboarding link to connect their Smart Money account to your firm.
            </p>

            <form onSubmit={handleSendInvite} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>
                  Client Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Oluwaseun Adeleke"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none border"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>
                  Client Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. client@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-[13px] outline-none border"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                />
              </div>

              {inviteResult && (
                <div
                  className="p-3 rounded-lg text-[12px] font-medium"
                  style={{
                    background: inviteResult.success ? "rgba(0,196,140,0.1)" : "rgba(226,75,74,0.1)",
                    color: inviteResult.success ? "var(--green)" : "#E24B4A",
                    border: `1px solid ${inviteResult.success ? "rgba(0,196,140,0.3)" : "rgba(226,75,74,0.3)"}`,
                  }}
                >
                  <p>{inviteResult.message}</p>
                  {inviteResult.inviteUrl && (
                    <p className="mt-1 text-[11px] underline break-all text-white/80">
                      Link: {inviteResult.inviteUrl}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-lg text-[12px] font-semibold border"
                  style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail}
                  className="px-4 py-2 rounded-lg text-[12px] font-semibold text-white border-none disabled:opacity-50 cursor-pointer"
                  style={{ background: "var(--green)" }}
                >
                  {inviting ? "Sending Invite..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
