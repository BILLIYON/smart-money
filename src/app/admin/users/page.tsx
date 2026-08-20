"use client";

import { useEffect, useState } from "react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  is_admin: boolean;
  onboarding_complete: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/users/list")
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setUsers(data.users);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter === "all" || u.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  async function handleAction(action: string, extra: any = {}) {
    if (!selectedUser) return;
    setActionMessage("Processing...");
    try {
      const res = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          targetUserId: selectedUser.id,
          ...extra,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`✅ ${data.message}`);
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== selectedUser.id) return u;
            if (action === "update_plan") return { ...u, plan: extra.plan };
            if (action === "toggle_admin") return { ...u, is_admin: extra.isAdmin };
            return u;
          }).filter((u) => !(action === "delete_user" && u.id === selectedUser.id))
        );
        if (action === "delete_user") setSelectedUser(null);
      } else {
        setActionMessage(`❌ ${data.error}`);
      }
    } catch (err: any) {
      setActionMessage(`❌ ${err.message}`);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155", paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC", margin: 0 }}>
            User Management
          </h1>
          <p style={{ fontSize: 13, color: "#94A3B8", margin: "4px 0 0" }}>
            Search accounts, update subscription tiers, toggle administrator privileges, or reset passwords.
          </p>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", background: "#1E293B", border: "1px solid #334155", padding: "6px 12px", borderRadius: 6 }}>
          {users.length} Total Registered Users
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: "flex", gap: 12, background: "#1E293B", border: "1px solid #334155", borderRadius: 8, padding: 12 }}>
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            background: "#0F172A",
            border: "1px solid #334155",
            borderRadius: 6,
            padding: "8px 12px",
            color: "#F8FAFC",
            fontSize: 13,
            outline: "none",
          }}
        />
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          style={{
            background: "#0F172A",
            border: "1px solid #334155",
            borderRadius: 6,
            padding: "8px 12px",
            color: "#F8FAFC",
            fontSize: 13,
            outline: "none",
          }}
        >
          <option value="all">All Plans</option>
          <option value="free">Free Tier</option>
          <option value="pro">Pro Tier</option>
        </select>
      </div>

      {/* Content Layout */}
      <div style={{ display: "grid", gridTemplateColumns: selectedUser ? "2fr 1fr" : "1fr", gap: 20 }}>
        {/* User Table */}
        <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0F172A", borderBottom: "1px solid #334155" }}>
                {["Email", "Name", "Plan", "Role", "Actions"].map((col) => (
                  <th key={col} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "#94A3B8" }}>
                    Loading user directory...
                  </td>
                </tr>
              )}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "#94A3B8" }}>
                    No users matching criteria.
                  </td>
                </tr>
              )}
              {filteredUsers.map((u) => (
                <tr
                  key={u.id}
                  style={{
                    borderTop: "1px solid #334155",
                    background: selectedUser?.id === u.id ? "#334155" : "transparent",
                    cursor: "pointer",
                  }}
                  onClick={() => { setSelectedUser(u); setActionMessage(""); }}
                >
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: "#F8FAFC" }}>
                    {u.email}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#94A3B8" }}>
                    {u.full_name || "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: u.plan === "pro" ? "rgba(16,185,129,0.1)" : "#0F172A", color: u.plan === "pro" ? "#10B981" : "#94A3B8", textTransform: "uppercase" }}>
                      {u.plan}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {u.is_admin ? (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "rgba(245, 158, 11, 0.1)", color: "#F59E0B" }}>
                        ADMIN
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "#64748B" }}>User</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedUser(u); setActionMessage(""); }}
                      style={{ padding: "4px 10px", background: "#0F172A", border: "1px solid #334155", borderRadius: 6, color: "#F8FAFC", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                    >
                      Edit Account
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Panel Sidebar */}
        {selectedUser && (
          <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 8, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155", paddingBottom: 10 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "#F8FAFC", margin: 0 }}>Account Settings</h2>
              <button onClick={() => setSelectedUser(null)} style={{ background: "none", border: "none", color: "#94A3B8", fontSize: 16, cursor: "pointer" }}>✕</button>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#F8FAFC" }}>{selectedUser.email}</div>
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 2, fontFamily: "monospace" }}>ID: {selectedUser.id}</div>
            </div>

            {actionMessage && (
              <div style={{ padding: 8, borderRadius: 6, background: "#0F172A", border: "1px solid #334155", fontSize: 12, color: "#F8FAFC" }}>
                {actionMessage}
              </div>
            )}

            {/* Plan Upgrade */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" }}>Subscription Plan</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleAction("update_plan", { plan: "free" })}
                  style={{ flex: 1, padding: "8px", background: selectedUser.plan === "free" ? "#334155" : "#0F172A", border: "1px solid #334155", borderRadius: 6, color: "#F8FAFC", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                >
                  Free Tier
                </button>
                <button
                  onClick={() => handleAction("update_plan", { plan: "pro" })}
                  style={{ flex: 1, padding: "8px", background: selectedUser.plan === "pro" ? "rgba(16,185,129,0.15)" : "#0F172A", border: "1px solid #10B981", borderRadius: 6, color: "#10B981", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  Pro Tier
                </button>
              </div>
            </div>

            {/* Admin Role Toggle */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" }}>Role Permissions</label>
              <button
                onClick={() => handleAction("toggle_admin", { isAdmin: !selectedUser.is_admin })}
                style={{ padding: "8px", background: selectedUser.is_admin ? "rgba(245, 158, 11, 0.1)" : "#0F172A", border: "1px solid #334155", borderRadius: 6, color: selectedUser.is_admin ? "#F59E0B" : "#F8FAFC", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
              >
                {selectedUser.is_admin ? "Demote to Standard User" : "Promote to Administrator"}
              </button>
            </div>

            {/* Password Reset */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" }}>Reset Password</label>
              <input
                type="password"
                placeholder="Enter new password..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ padding: "8px", background: "#0F172A", border: "1px solid #334155", borderRadius: 6, color: "#F8FAFC", fontSize: 12, outline: "none" }}
              />
              <button
                onClick={() => handleAction("reset_password", { newPassword })}
                style={{ padding: "6px 10px", background: "#0F172A", border: "1px solid #334155", borderRadius: 6, color: "#F8FAFC", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
              >
                Save New Password
              </button>
            </div>

            {/* Delete Account */}
            <div style={{ paddingTop: 12, borderTop: "1px solid #334155" }}>
              <button
                onClick={() => {
                  if (confirm(`Permanently delete account ${selectedUser.email}?`)) {
                    handleAction("delete_user");
                  }
                }}
                style={{ width: "100%", padding: "8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 6, color: "#EF4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Delete Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
