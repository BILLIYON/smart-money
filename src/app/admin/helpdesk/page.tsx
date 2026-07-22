"use client";

import { useEffect, useState } from "react";
import { popup } from "@/store/popupStore";

type Ticket = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  rating: number;
  type: "feature" | "review" | "bug" | "support";
  category: string;
  subject: string;
  message: string;
  aiReply: string;
  adminReply?: string;
  status: "new" | "in_progress" | "resolved" | "implemented";
  created_at: string;
};

function fmt(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TYPE_BADGES: Record<Ticket["type"], { label: string; bg: string; color: string }> = {
  feature: { label: "💡 Feature Request", bg: "rgba(0,196,140,0.12)", color: "#00C48C" },
  review: { label: "⭐ App Review", bg: "rgba(245,166,35,0.12)", color: "#F5A623" },
  bug: { label: "🐛 Bug Report", bg: "rgba(226,75,74,0.12)", color: "#E24B4A" },
  support: { label: "🤝 Support Ticket", bg: "rgba(74,144,217,0.12)", color: "#4A90D9" },
};

const STATUS_BADGES: Record<Ticket["status"], { label: string; bg: string; color: string }> = {
  new: { label: "New Ticket", bg: "#E3F2FD", color: "#1976D2" },
  in_progress: { label: "In Progress", bg: "#FFF3E0", color: "#E65100" },
  resolved: { label: "Resolved", bg: "#E8F5E9", color: "#2E7D32" },
  implemented: { label: "Implemented 🎉", bg: "#F3E5F5", color: "#7B1FA2" },
};

export default function AdminHelpDeskPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Selected Ticket Modal for Admin Action
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [adminReplyText, setAdminReplyText] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contact");
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleUpdateTicket = async (id: string, newStatus?: Ticket["status"], replyText?: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch("/api/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: id,
          status: newStatus,
          adminReply: replyText,
        }),
      });

      if (res.ok) {
        popup.success("Ticket Updated", "Status and admin notes updated successfully!");
        fetchTickets();
        setSelectedTicket(null);
      } else {
        popup.error("Update Error", "Failed to update ticket.");
      }
    } catch {
      popup.error("Error", "Error updating ticket.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      t.userName.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.message.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === "all" || t.type === typeFilter;
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const totalTickets = tickets.length;
  const pendingCount = tickets.filter((t) => t.status === "new" || t.status === "in_progress").length;
  const implementedCount = tickets.filter((t) => t.status === "implemented").length;
  const avgRating = totalTickets > 0
    ? (tickets.reduce((acc, t) => acc + t.rating, 0) / totalTickets).toFixed(1)
    : "5.0";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0B1E3D", margin: 0 }}>
            💬 Admin Help Desk &amp; User Reviews
          </h1>
          <p style={{ fontSize: 13, color: "#6B7A99", marginTop: 4, margin: 0 }}>
            Real-time support desk — Monitor every user review, feedback submission, feature request, and issue report sent from Smart Money users.
          </p>
        </div>

        <button
          onClick={fetchTickets}
          style={{
            padding: "8px 16px",
            background: "#00C48C",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          🔄 Refresh Tickets
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div style={{ background: "#fff", padding: "18px 20px", borderRadius: 12, border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7A99", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Total Tickets / Reviews
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#0B1E3D", marginTop: 4 }}>
            {totalTickets}
          </div>
        </div>

        <div style={{ background: "#fff", padding: "18px 20px", borderRadius: 12, border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#E65100", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Pending Action
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#E65100", marginTop: 4 }}>
            {pendingCount}
          </div>
        </div>

        <div style={{ background: "#fff", padding: "18px 20px", borderRadius: 12, border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#7B1FA2", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Implemented Features
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#7B1FA2", marginTop: 4 }}>
            {implementedCount}
          </div>
        </div>

        <div style={{ background: "#fff", padding: "18px 20px", borderRadius: 12, border: "1px solid #E2E8F0" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#F5A623", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Average Rating
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#F5A623", marginTop: 4 }}>
            ⭐ {avgRating} / 5
          </div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div
        style={{
          background: "#fff",
          padding: 16,
          borderRadius: 12,
          border: "1px solid #E2E8F0",
          marginBottom: 20,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Search by user email, subject, or message..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 260,
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid #CBD5E1",
            fontSize: 13,
            outline: "none",
          }}
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid #CBD5E1",
            fontSize: 13,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          <option value="all">All Types</option>
          <option value="feature">💡 Feature Suggestions</option>
          <option value="review">⭐ App Reviews</option>
          <option value="bug">🐛 Bug Reports</option>
          <option value="support">🤝 Support</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid #CBD5E1",
            fontSize: 13,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="implemented">Implemented</option>
        </select>
      </div>

      {/* Tickets List Table */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          border: "1px solid #E2E8F0",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#6B7A99", fontSize: 14 }}>
            Loading user reviews &amp; tickets...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#6B7A99", fontSize: 14 }}>
            No user feedback found matching your filter criteria.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", color: "#475569", fontWeight: 600 }}>
                <th style={{ padding: "12px 16px" }}>Ticket ID / User</th>
                <th style={{ padding: "12px 16px" }}>Type / Category</th>
                <th style={{ padding: "12px 16px" }}>Rating</th>
                <th style={{ padding: "12px 16px" }}>Subject &amp; Message</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Date</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((t) => {
                const typeB = TYPE_BADGES[t.type] || TYPE_BADGES.review;
                const statusB = STATUS_BADGES[t.status] || STATUS_BADGES.new;

                return (
                  <tr
                    key={t.id}
                    style={{ borderBottom: "1px solid #F1F5F9", transition: "background .15s" }}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, color: "#0B1E3D" }}>{t.userName}</div>
                      <div style={{ fontSize: 11, color: "#64748B" }}>{t.userEmail}</div>
                      <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{t.id}</div>
                    </td>

                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          background: typeB.bg,
                          color: typeB.color,
                          marginBottom: 4,
                        }}
                      >
                        {typeB.label}
                      </span>
                      <div style={{ fontSize: 11, color: "#64748B" }}>{t.category}</div>
                    </td>

                    <td style={{ padding: "14px 16px", fontWeight: 700, color: "#F5A623" }}>
                      {"⭐".repeat(t.rating)}
                    </td>

                    <td style={{ padding: "14px 16px", maxWidth: 320 }}>
                      <div style={{ fontWeight: 600, color: "#1E293B", marginBottom: 2 }}>{t.subject}</div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#475569",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: 1.4,
                        }}
                      >
                        {t.message}
                      </div>
                    </td>

                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          background: statusB.bg,
                          color: statusB.color,
                        }}
                      >
                        {statusB.label}
                      </span>
                    </td>

                    <td style={{ padding: "14px 16px", fontSize: 11, color: "#64748B", whiteSpace: "nowrap" }}>
                      {fmt(t.created_at)}
                    </td>

                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <button
                        onClick={() => {
                          setSelectedTicket(t);
                          setAdminReplyText(t.adminReply || "");
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 6,
                          background: "#0B1E3D",
                          color: "#fff",
                          border: "none",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        View &amp; Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail & Action Modal */}
      {selectedTicket && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 580,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#00C48C", textTransform: "uppercase" }}>
                  {selectedTicket.id} · {selectedTicket.category}
                </span>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0B1E3D", margin: "4px 0 0" }}>
                  {selectedTicket.subject}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748B" }}
              >
                ×
              </button>
            </div>

            {/* User Details */}
            <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span><strong>User:</strong> {selectedTicket.userName} ({selectedTicket.userEmail})</span>
                <span><strong>Rating:</strong> ⭐ {selectedTicket.rating}/5</span>
              </div>
              <div style={{ marginTop: 4, color: "#64748B" }}>Submitted on {fmt(selectedTicket.created_at)}</div>
            </div>

            {/* User Message */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", marginBottom: 6 }}>
                User Feedback Message
              </div>
              <div style={{ background: "#F1F5F9", padding: 14, borderRadius: 10, fontSize: 13, lineHeight: 1.5, color: "#1E293B" }}>
                {selectedTicket.message}
              </div>
            </div>

            {/* AI Auto-Response */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#00C48C", textTransform: "uppercase", marginBottom: 6 }}>
                Automated AI Response Served To User
              </div>
              <div style={{ background: "rgba(0,196,140,0.08)", border: "1px solid rgba(0,196,140,0.2)", padding: 14, borderRadius: 10, fontSize: 12, lineHeight: 1.5, color: "#0F766E", fontStyle: "italic" }}>
                &ldquo;{selectedTicket.aiReply}&rdquo;
              </div>
            </div>

            {/* Change Status */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Update Ticket Status
              </label>
              <select
                value={selectedTicket.status}
                onChange={(e) => setSelectedTicket({ ...selectedTicket, status: e.target.value as any })}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, background: "#fff" }}
              >
                <option value="new">🔵 New Ticket</option>
                <option value="in_progress">🟠 In Progress</option>
                <option value="resolved">🟢 Resolved</option>
                <option value="implemented">🟣 Implemented 🎉</option>
              </select>
            </div>

            {/* Admin Response Note */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Admin Internal Notes / Official Response
              </label>
              <textarea
                rows={3}
                value={adminReplyText}
                onChange={(e) => setAdminReplyText(e.target.value)}
                placeholder="Type official response or engineering notes for this ticket..."
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, outline: "none", resize: "none" }}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                onClick={() => setSelectedTicket(null)}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #CBD5E1", background: "transparent", fontSize: 13, fontWeight: 600, color: "#64748B", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateTicket(selectedTicket.id, selectedTicket.status, adminReplyText)}
                disabled={updatingStatus}
                style={{ padding: "8px 20px", borderRadius: 8, background: "#00C48C", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                {updatingStatus ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
