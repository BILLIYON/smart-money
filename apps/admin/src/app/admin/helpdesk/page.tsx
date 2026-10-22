"use client";

import { useEffect, useState } from "react";
import { popup } from "@/store/popupStore";
import { SectionHeader, InfoBanner, Card, KpiCard, StatusPill } from "@/components/admin/shared";

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

const TYPE_BADGES: Record<Ticket["type"], { label: string; tone: "active" | "pending" | "danger" | "inactive" }> = {
  feature: { label: "💡 Feature Request", tone: "active" },
  review: { label: "⭐ App Review", tone: "pending" },
  bug: { label: "🐛 Bug Report", tone: "danger" },
  support: { label: "🤝 Support Ticket", tone: "inactive" },
};

const STATUS_BADGES: Record<Ticket["status"], { label: string; tone: "active" | "pending" | "danger" | "inactive" }> = {
  new: { label: "New", tone: "pending" },
  in_progress: { label: "In Progress", tone: "warn" as any || "pending" },
  resolved: { label: "Resolved", tone: "active" },
  implemented: { label: "Implemented 🎉", tone: "active" },
};

export default function AdminHelpDeskPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
  const avgRating =
    totalTickets > 0
      ? (tickets.reduce((acc, t) => acc + t.rating, 0) / totalTickets).toFixed(1)
      : "5.0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="💬"
        emphasis="Help Desk & User Feedback"
        sub="Monitor user reviews, incoming bug reports, feature suggestions, and customer support inquiries."
        action={
          <button
            onClick={fetchTickets}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold text-white transition hover:opacity-95"
            style={{ background: "var(--green)" }}
          >
            🔄 Refresh
          </button>
        }
      />

      <InfoBanner tone="blue">
        💡 Real-time customer support console. All submissions generate automated AI replies while allowing direct administrator resolution.
      </InfoBanner>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total Tickets / Reviews"
          value={totalTickets}
          subtitle="All Time"
          tone="neutral"
        />
        <KpiCard
          label="Pending Action"
          value={pendingCount}
          subtitle="Needs review"
          tone={pendingCount > 0 ? "warn" : "up"}
        />
        <KpiCard
          label="Implemented Features"
          value={implementedCount}
          subtitle="Shipped"
          tone="up"
        />
        <KpiCard
          label="Average Rating"
          value={`⭐ ${avgRating} / 5`}
          subtitle="User sentiment"
          tone="up"
        />
      </div>

      {/* Filter & Search Bar */}
      <div
        className="p-3 rounded-[12px] flex items-center gap-3 flex-wrap"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <input
          type="text"
          placeholder="Search by user email, subject, or message..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[240px] text-[13px] px-3.5 py-2 rounded-[8px] outline-none"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-[12px] px-3 py-2 rounded-[8px] outline-none font-medium cursor-pointer"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
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
          className="text-[12px] px-3 py-2 rounded-[8px] outline-none font-medium cursor-pointer"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="implemented">Implemented</option>
        </select>
      </div>

      {/* Tickets List Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-[13px]" style={{ color: "var(--muted)" }}>
            Loading user feedback &amp; tickets...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-12 text-center text-[13px]" style={{ color: "var(--muted)" }}>
            No user feedback found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    User
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Type
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Rating
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Subject &amp; Message
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Status
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Date
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: "var(--muted)" }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t, i) => {
                  const typeB = TYPE_BADGES[t.type] || TYPE_BADGES.review;
                  const statusB = STATUS_BADGES[t.status] || STATUS_BADGES.new;

                  return (
                    <tr
                      key={t.id}
                      className="transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold" style={{ color: "var(--text)" }}>{t.userName}</div>
                        <div className="text-[11px]" style={{ color: "var(--muted)" }}>{t.userEmail}</div>
                      </td>

                      <td className="px-5 py-3.5">
                        <StatusPill label={typeB.label} tone={typeB.tone} />
                      </td>

                      <td className="px-5 py-3.5 font-bold" style={{ color: "var(--gold)" }}>
                        {"⭐".repeat(t.rating)}
                      </td>

                      <td className="px-5 py-3.5 max-w-xs">
                        <div className="font-semibold text-[13px] truncate" style={{ color: "var(--text)" }}>
                          {t.subject}
                        </div>
                        <div className="text-[11px] truncate mt-0.5" style={{ color: "var(--muted)" }}>
                          {t.message}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <StatusPill label={statusB.label} tone={statusB.tone} />
                      </td>

                      <td className="px-5 py-3.5 text-[11px] whitespace-nowrap" style={{ color: "var(--muted)" }}>
                        {fmt(t.created_at)}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedTicket(t);
                            setAdminReplyText(t.adminReply || "");
                          }}
                          className="px-2.5 py-1 rounded-[6px] text-[11px] font-semibold border transition"
                          style={{
                            background: "var(--bg)",
                            borderColor: "var(--border)",
                            color: "var(--text)",
                          }}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Ticket Management Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-xl rounded-[16px] p-6 max-h-[90vh] overflow-y-auto"
            style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 20px 25px -5px var(--shadow)" }}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--green2)" }}>
                  {selectedTicket.id} · {selectedTicket.category}
                </span>
                <h2 className="text-[17px] font-bold mt-0.5" style={{ color: "var(--text)" }}>
                  {selectedTicket.subject}
                </h2>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-[18px] text-slate-400 hover:text-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* User Details */}
            <div
              className="p-3 rounded-[10px] mb-4 text-[12px] flex justify-between items-center"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <div>
                <span className="font-semibold" style={{ color: "var(--text)" }}>{selectedTicket.userName}</span>
                <span style={{ color: "var(--muted)" }}> ({selectedTicket.userEmail})</span>
              </div>
              <span className="font-bold" style={{ color: "var(--gold)" }}>⭐ {selectedTicket.rating}/5</span>
            </div>

            {/* User Message */}
            <div className="mb-4">
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>
                User Feedback Message
              </label>
              <div
                className="p-3.5 rounded-[10px] text-[13px] leading-relaxed"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                {selectedTicket.message}
              </div>
            </div>

            {/* AI Auto-Response */}
            <div className="mb-4">
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--green2)" }}>
                Automated AI Response Served To User
              </label>
              <div
                className="p-3.5 rounded-[10px] text-[12px] italic leading-relaxed"
                style={{
                  background: "rgba(0,196,140,0.06)",
                  border: "1px solid rgba(0,196,140,0.2)",
                  color: "var(--green2)",
                }}
              >
                &ldquo;{selectedTicket.aiReply}&rdquo;
              </div>
            </div>

            {/* Update Status */}
            <div className="mb-4">
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>
                Update Ticket Status
              </label>
              <select
                value={selectedTicket.status}
                onChange={(e) => setSelectedTicket({ ...selectedTicket, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-[8px] text-[13px] outline-none cursor-pointer"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <option value="new">🔵 New Ticket</option>
                <option value="in_progress">🟠 In Progress</option>
                <option value="resolved">🟢 Resolved</option>
                <option value="implemented">🟣 Implemented 🎉</option>
              </select>
            </div>

            {/* Admin Response Note */}
            <div className="mb-5">
              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>
                Admin Internal Notes / Official Response
              </label>
              <textarea
                rows={3}
                value={adminReplyText}
                onChange={(e) => setAdminReplyText(e.target.value)}
                placeholder="Type engineering or resolution notes..."
                className="w-full px-3 py-2 rounded-[8px] text-[13px] outline-none resize-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-3.5 py-1.5 rounded-[8px] text-[12px] font-medium"
                style={{ color: "var(--muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateTicket(selectedTicket.id, selectedTicket.status, adminReplyText)}
                disabled={updatingStatus}
                className="px-4 py-1.5 rounded-[8px] text-[12px] font-semibold text-white transition hover:opacity-95"
                style={{ background: "var(--green)" }}
              >
                {updatingStatus ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
