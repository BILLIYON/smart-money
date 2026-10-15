"use client";

import { useEffect, useState } from "react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  is_admin: boolean;
  onboarding_complete: boolean;
  is_partner_staff?: boolean;
  partner_org_id?: string | null;
  partner_role?: string | null;
  partner_org_name?: string | null;
  created_at: string;
}

interface PartnerOrg {
  id: string;
  name: string;
  slug: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [partnerOrgs, setPartnerOrgs] = useState<PartnerOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Edit Partner Form state
  const [editIsPartnerStaff, setEditIsPartnerStaff] = useState(false);
  const [editPartnerOrgId, setEditPartnerOrgId] = useState("");
  const [editPartnerRole, setEditPartnerRole] = useState("advisor");

  useEffect(() => {
    fetch("/api/admin/users/list")
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setUsers(data.users);
        if (data.partnerOrgs) setPartnerOrgs(data.partnerOrgs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter === "all" || u.plan === planFilter;
    const matchesRole =
      roleFilter === "all" ||
      (roleFilter === "admin" && u.is_admin) ||
      (roleFilter === "partner" && u.is_partner_staff) ||
      (roleFilter === "user" && !u.is_admin && !u.is_partner_staff);
    return matchesSearch && matchesPlan && matchesRole;
  });

  function selectUserForEdit(u: UserProfile) {
    setSelectedUser(u);
    setActionMessage("");
    setEditIsPartnerStaff(Boolean(u.is_partner_staff));
    setEditPartnerOrgId(u.partner_org_id || partnerOrgs[0]?.id || "");
    setEditPartnerRole(u.partner_role || "advisor");
  }

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
            if (action === "update_partner_role") {
              const matchedOrg = partnerOrgs.find((o) => o.id === extra.partnerOrgId);
              return {
                ...u,
                is_partner_staff: extra.isPartnerStaff,
                partner_org_id: extra.partnerOrgId,
                partner_role: extra.partnerRole,
                partner_org_name: matchedOrg?.name || null,
              };
            }
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
            User Management & Role Access
          </h1>
          <p style={{ fontSize: 13, color: "#94A3B8", margin: "4px 0 0" }}>
            Search accounts, assign verified Partner Roles, update subscription tiers, or reset passwords.
          </p>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", background: "#1E293B", border: "1px solid #334155", padding: "6px 12px", borderRadius: 6 }}>
          {users.length} Total Registered Users
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: "flex", gap: 12, background: "#1E293B", border: "1px solid #334155", borderRadius: 8, padding: 12, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
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
          style={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 6, padding: "8px 12px", color: "#F8FAFC", fontSize: 13, outline: "none" }}
        >
          <option value="all">All Plans</option>
          <option value="free">Free Tier</option>
          <option value="pro">Pro Tier</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ background: "#0F172A", border: "1px solid #334155", borderRadius: 6, padding: "8px 12px", color: "#F8FAFC", fontSize: 13, outline: "none" }}
        >
          <option value="all">All Roles</option>
          <option value="partner">Partner Staff Only</option>
          <option value="admin">Administrators Only</option>
          <option value="user">Standard Users Only</option>
        </select>
      </div>

      {/* Main Container */}
      <div style={{ display: "grid", gridTemplateColumns: selectedUser ? "1fr 340px" : "1fr", gap: 20 }}>
        {/* Table */}
        <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#0F172A", borderBottom: "1px solid #334155", color: "#94A3B8" }}>
                <th style={{ padding: "12px 16px" }}>User</th>
                <th style={{ padding: "12px 16px" }}>Tier</th>
                <th style={{ padding: "12px 16px" }}>System Role</th>
                <th style={{ padding: "12px 16px" }}>Partner Staff</th>
                <th style={{ padding: "12px 16px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#94A3B8" }}>
                    Loading user records...
                  </td>
                </tr>
              )}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#94A3B8" }}>
                    No users found matching your filters.
                  </td>
                </tr>
              )}
              {filteredUsers.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => selectUserForEdit(u)}
                  style={{
                    borderBottom: "1px solid #334155",
                    cursor: "pointer",
                    background: selectedUser?.id === u.id ? "rgba(51, 65, 85, 0.4)" : "transparent",
                  }}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600, color: "#F8FAFC" }}>{u.full_name || "Anonymous User"}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{u.email}</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: u.plan === "pro" ? "rgba(16, 185, 129, 0.15)" : "rgba(148, 163, 184, 0.1)",
                        color: u.plan === "pro" ? "#10B981" : "#94A3B8",
                      }}
                    >
                      {u.plan.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {u.is_admin ? (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "rgba(245, 158, 11, 0.1)", color: "#F59E0B" }}>
                        ADMIN
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "#64748B" }}>Standard</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {u.is_partner_staff ? (
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(16, 185, 129, 0.15)", color: "#10B981" }}>
                          PARTNER · {u.partner_role?.toUpperCase() || "STAFF"}
                        </span>
                        {u.partner_org_name && (
                          <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{u.partner_org_name}</div>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: "#64748B" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); selectUserForEdit(u); }}
                      style={{ padding: "4px 10px", background: "#0F172A", border: "1px solid #334155", borderRadius: 6, color: "#F8FAFC", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                    >
                      Manage Roles
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

            {/* PARTNER ROLE ASSIGNMENT (Admin Controlled) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "#0F172A", border: "1px solid #334155", borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#10B981", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Partner Portal Access
                </label>
                <input
                  type="checkbox"
                  checked={editIsPartnerStaff}
                  onChange={(e) => setEditIsPartnerStaff(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#10B981" }}
                />
              </div>

              {editIsPartnerStaff && (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 10, color: "#94A3B8" }}>Partner Organization</label>
                    <select
                      value={editPartnerOrgId}
                      onChange={(e) => setEditPartnerOrgId(e.target.value)}
                      style={{ padding: "6px 8px", background: "#1E293B", border: "1px solid #334155", borderRadius: 6, color: "#F8FAFC", fontSize: 12 }}
                    >
                      <option value="" disabled>Select Firm</option>
                      {partnerOrgs.map((org) => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 10, color: "#94A3B8" }}>Partner Staff Role</label>
                    <select
                      value={editPartnerRole}
                      onChange={(e) => setEditPartnerRole(e.target.value)}
                      style={{ padding: "6px 8px", background: "#1E293B", border: "1px solid #334155", borderRadius: 6, color: "#F8FAFC", fontSize: 12 }}
                    >
                      <option value="advisor">Advisor (Approve actions, client goals)</option>
                      <option value="admin">Admin (Full firm control, manage staff)</option>
                      <option value="analyst">Analyst (Read-only spend analytics)</option>
                      <option value="view_only">View Only (Overview & health scores only)</option>
                    </select>
                  </div>
                </>
              )}

              <button
                onClick={() =>
                  handleAction("update_partner_role", {
                    isPartnerStaff: editIsPartnerStaff,
                    partnerOrgId: editIsPartnerStaff ? editPartnerOrgId : null,
                    partnerRole: editIsPartnerStaff ? editPartnerRole : null,
                  })
                }
                style={{
                  marginTop: 4,
                  padding: "8px",
                  background: editIsPartnerStaff ? "rgba(16, 185, 129, 0.2)" : "#1E293B",
                  border: `1px solid ${editIsPartnerStaff ? "#10B981" : "#334155"}`,
                  borderRadius: 6,
                  color: editIsPartnerStaff ? "#10B981" : "#94A3B8",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {editIsPartnerStaff ? "Save Partner Role" : "Revoke Partner Access"}
              </button>
            </div>

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
              <label style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" }}>Administrator Privileges</label>
              <button
                onClick={() => handleAction("toggle_admin", { isAdmin: !selectedUser.is_admin })}
                style={{ padding: "8px", background: selectedUser.is_admin ? "rgba(245, 158, 11, 0.1)" : "#0F172A", border: "1px solid #334155", borderRadius: 6, color: selectedUser.is_admin ? "#F59E0B" : "#F8FAFC", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
              >
                {selectedUser.is_admin ? "Demote from Administrator" : "Promote to Administrator"}
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
