"use client";

import { useEffect, useState } from "react";
import { SectionHeader, InfoBanner, Card, StatusPill } from "@/components/admin/shared";

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
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="👥"
        emphasis="User Management & Roles"
        sub="Search user accounts, assign verified Partner Roles, upgrade subscription tiers, or reset credentials."
        action={
          <span
            className="px-3 py-1 rounded-full text-[11px] font-semibold border"
            style={{
              background: "rgba(0,196,140,0.1)",
              color: "var(--green2)",
              borderColor: "rgba(0,196,140,0.25)",
            }}
          >
            {users.length} Total Registered Users
          </span>
        }
      />

      <InfoBanner tone="blue">
        💡 Changes made here take immediate effect. Granting <strong>Partner Staff</strong> enables institutional portal access for that user's email.
      </InfoBanner>

      {/* Filter Toolbar */}
      <div
        className="p-3 rounded-[12px] flex items-center gap-3 flex-wrap"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[220px] text-[13px] px-3.5 py-2 rounded-[8px] outline-none transition"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        />
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="text-[12px] px-3 py-2 rounded-[8px] outline-none font-medium cursor-pointer"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          <option value="all">All Plans</option>
          <option value="free">Free Tier</option>
          <option value="pro">Pro Tier</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-[12px] px-3 py-2 rounded-[8px] outline-none font-medium cursor-pointer"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          <option value="all">All Roles</option>
          <option value="partner">Partner Staff Only</option>
          <option value="admin">Administrators Only</option>
          <option value="user">Standard Users Only</option>
        </select>
      </div>

      {/* Main Grid: Table & Editor Drawer */}
      <div className={`grid gap-5 ${selectedUser ? "grid-cols-1 xl:grid-cols-3" : "grid-cols-1"}`}>
        {/* Table Card */}
        <Card className={`p-0 overflow-hidden ${selectedUser ? "xl:col-span-2" : ""}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    User
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Tier
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    System Role
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Partner Staff
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: "var(--muted)" }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center" style={{ color: "var(--muted)" }}>
                      Loading user records...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center" style={{ color: "var(--muted)" }}>
                      No users found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, i) => {
                    const isSelected = selectedUser?.id === u.id;
                    return (
                      <tr
                        key={u.id}
                        onClick={() => selectUserForEdit(u)}
                        className="cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        style={{
                          borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                          background: isSelected ? "rgba(0,196,140,0.06)" : undefined,
                        }}
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-semibold" style={{ color: "var(--text)" }}>
                            {u.full_name || "Anonymous User"}
                          </div>
                          <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                            {u.email}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusPill
                            label={u.plan.toUpperCase()}
                            tone={u.plan === "pro" ? "active" : "inactive"}
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          {u.is_admin ? (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                              style={{ background: "rgba(245,166,35,0.12)", color: "var(--gold)" }}
                            >
                              ADMIN
                            </span>
                          ) : (
                            <span className="text-[12px]" style={{ color: "var(--muted)" }}>
                              Standard
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {u.is_partner_staff ? (
                            <div>
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                                style={{ background: "rgba(0,196,140,0.12)", color: "var(--green2)" }}
                              >
                                {u.partner_role?.toUpperCase() || "STAFF"}
                              </span>
                              {u.partner_org_name && (
                                <div className="text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
                                  {u.partner_org_name}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[12px]" style={{ color: "var(--muted)" }}>—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectUserForEdit(u);
                            }}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-[6px] border transition hover:opacity-90"
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
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Action Panel Sidebar */}
        {selectedUser && (
          <Card className="flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="text-[14px] font-bold" style={{ color: "var(--text)" }}>
                Account Settings
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-[16px] text-slate-400 hover:text-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div>
              <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                {selectedUser.email}
              </div>
              <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--muted)" }}>
                ID: {selectedUser.id}
              </div>
            </div>

            {actionMessage && (
              <div
                className="p-2.5 rounded-[8px] text-[12px]"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                {actionMessage}
              </div>
            )}

            {/* PARTNER ROLE ASSIGNMENT */}
            <div
              className="p-3 rounded-[10px] flex flex-col gap-2.5"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--green2)" }}>
                  Partner Portal Access
                </label>
                <input
                  type="checkbox"
                  checked={editIsPartnerStaff}
                  onChange={(e) => setEditIsPartnerStaff(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-emerald-500"
                />
              </div>

              {editIsPartnerStaff && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px]" style={{ color: "var(--muted)" }}>
                      Partner Organization
                    </label>
                    <select
                      value={editPartnerOrgId}
                      onChange={(e) => setEditPartnerOrgId(e.target.value)}
                      className="px-2.5 py-1.5 rounded-[6px] text-[12px] outline-none"
                      style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }}
                    >
                      <option value="" disabled>Select Firm</option>
                      {partnerOrgs.map((org) => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px]" style={{ color: "var(--muted)" }}>
                      Partner Staff Role
                    </label>
                    <select
                      value={editPartnerRole}
                      onChange={(e) => setEditPartnerRole(e.target.value)}
                      className="px-2.5 py-1.5 rounded-[6px] text-[12px] outline-none"
                      style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }}
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
                className="mt-1 py-1.5 px-3 rounded-[6px] text-[11px] font-semibold transition"
                style={{
                  background: editIsPartnerStaff ? "rgba(0,196,140,0.15)" : "var(--card)",
                  border: `1px solid ${editIsPartnerStaff ? "var(--green)" : "var(--border)"}`,
                  color: editIsPartnerStaff ? "var(--green2)" : "var(--muted)",
                }}
              >
                {editIsPartnerStaff ? "Save Partner Role" : "Revoke Partner Access"}
              </button>
            </div>

            {/* Plan Upgrade */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Subscription Plan
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction("update_plan", { plan: "free" })}
                  className="flex-1 py-1.5 rounded-[6px] text-[11px] font-semibold border transition"
                  style={{
                    background: selectedUser.plan === "free" ? "rgba(255,255,255,0.08)" : "var(--bg)",
                    borderColor: selectedUser.plan === "free" ? "var(--border)" : "transparent",
                    color: "var(--text)",
                  }}
                >
                  Free Tier
                </button>
                <button
                  onClick={() => handleAction("update_plan", { plan: "pro" })}
                  className="flex-1 py-1.5 rounded-[6px] text-[11px] font-semibold border transition"
                  style={{
                    background: selectedUser.plan === "pro" ? "rgba(0,196,140,0.15)" : "var(--bg)",
                    borderColor: selectedUser.plan === "pro" ? "var(--green)" : "transparent",
                    color: selectedUser.plan === "pro" ? "var(--green2)" : "var(--text)",
                  }}
                >
                  Pro Tier
                </button>
              </div>
            </div>

            {/* Admin Role Toggle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Admin Privileges
              </label>
              <button
                onClick={() => handleAction("toggle_admin", { isAdmin: !selectedUser.is_admin })}
                className="py-1.5 px-3 rounded-[6px] text-[11px] font-semibold border transition"
                style={{
                  background: selectedUser.is_admin ? "rgba(245,166,35,0.12)" : "var(--bg)",
                  borderColor: selectedUser.is_admin ? "var(--gold)" : "var(--border)",
                  color: selectedUser.is_admin ? "var(--gold)" : "var(--text)",
                }}
              >
                {selectedUser.is_admin ? "Demote from Administrator" : "Promote to Administrator"}
              </button>
            </div>

            {/* Password Reset */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Reset Password
              </label>
              <input
                type="password"
                placeholder="Enter new password..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="px-3 py-1.5 rounded-[6px] text-[12px] outline-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              <button
                onClick={() => handleAction("reset_password", { newPassword })}
                className="py-1.5 px-3 rounded-[6px] text-[11px] font-semibold border transition"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
              >
                Save New Password
              </button>
            </div>

            {/* Delete Account */}
            <div className="pt-2" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => {
                  if (confirm(`Permanently delete account ${selectedUser.email}?`)) {
                    handleAction("delete_user");
                  }
                }}
                className="w-full py-1.5 rounded-[6px] text-[11px] font-semibold border transition text-red-500 hover:bg-red-500/10"
                style={{ borderColor: "rgba(239,68,68,0.25)" }}
              >
                Delete Account
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
