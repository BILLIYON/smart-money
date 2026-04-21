"use client";

import { useState, useTransition } from "react";
import type { AdminUser } from "@/lib/db";
import { deleteUserAction, bulkDeleteUsersAction } from "@/app/admin/users/actions";

type ModalState =
  | { open: false }
  | { open: true; type: "single"; userId: string; email: string }
  | { open: true; type: "bulk"; userIds: string[] };

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtRelative(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmt(iso);
}

export function UsersTable({
  users,
  total,
  page,
  pageSize,
  searchQuery,
}: {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  searchQuery: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [confirmInput, setConfirmInput] = useState("");
  const [, startTransition] = useTransition();

  const totalPages = Math.ceil(total / pageSize);
  const allOnPageSelected = users.length > 0 && users.every((u) => selected.has(u.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        users.forEach((u) => next.delete(u.id));
      } else {
        users.forEach((u) => next.add(u.id));
      }
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openSingleDelete(user: AdminUser) {
    setConfirmInput("");
    setModal({ open: true, type: "single", userId: user.id, email: user.email ?? user.id });
  }

  function openBulkDelete() {
    setConfirmInput("");
    setModal({ open: true, type: "bulk", userIds: [...selected] });
  }

  function closeModal() {
    setModal({ open: false });
    setConfirmInput("");
  }

  function handleConfirm() {
    if (confirmInput !== "DELETE" || !modal.open) return;
    startTransition(async () => {
      if (modal.type === "single") {
        await deleteUserAction(modal.userId);
        setSelected((prev) => { const next = new Set(prev); next.delete(modal.userId); return next; });
      } else {
        await bulkDeleteUsersAction(modal.userIds);
        setSelected(new Set());
      }
      closeModal();
    });
  }

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  const confirmReady = confirmInput === "DELETE";

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#6B7A99" }}>
          {total.toLocaleString()} user{total !== 1 ? "s" : ""}
          {selected.size > 0 && (
            <span style={{ marginLeft: 12, color: "#0B1E3D", fontWeight: 600 }}>
              · {selected.size} selected
            </span>
          )}
        </div>
        {selected.size > 0 && (
          <button
            onClick={openBulkDelete}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: "1px solid #EF4444",
              background: "transparent",
              color: "#EF4444",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Delete Selected ({selected.size})
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: "#ffffff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(11,30,61,.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F4F6FB" }}>
              <th style={{ width: 44, padding: "10px 16px" }}>
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleAll}
                  style={{ accentColor: "#00C48C", width: 15, height: 15, cursor: "pointer" }}
                />
              </th>
              {["Email", "Plan", "Joined", "Last Active", ""].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: "10px 20px 10px 0",
                    textAlign: "left",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#6B7A99",
                    textTransform: "uppercase",
                    letterSpacing: ".5px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "40px 24px", textAlign: "center", fontSize: 14, color: "#6B7A99" }}>
                  No users found.
                </td>
              </tr>
            )}
            {users.map((user, i) => (
              <tr
                key={user.id}
                style={{
                  borderTop: i > 0 ? "1px solid #E2E7F0" : undefined,
                  background: selected.has(user.id) ? "rgba(0,196,140,.04)" : undefined,
                }}
              >
                <td style={{ padding: "13px 16px" }}>
                  <input
                    type="checkbox"
                    checked={selected.has(user.id)}
                    onChange={() => toggleOne(user.id)}
                    style={{ accentColor: "#00C48C", width: 15, height: 15, cursor: "pointer" }}
                  />
                </td>
                <td style={{ padding: "13px 20px 13px 0", fontSize: 13, color: "#0B1E3D", maxWidth: 260 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                    {user.email ?? "—"}
                  </span>
                </td>
                <td style={{ padding: "13px 20px 13px 0" }}>
                  <span style={{
                    display: "inline-block",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: user.plan === "pro" ? "rgba(0,196,140,.12)" : "rgba(107,122,153,.1)",
                    color: user.plan === "pro" ? "#00A677" : "#6B7A99",
                    textTransform: "capitalize",
                  }}>
                    {user.plan}
                  </span>
                </td>
                <td style={{ padding: "13px 20px 13px 0", fontSize: 13, color: "#6B7A99", whiteSpace: "nowrap" }}>
                  {fmt(user.created_at)}
                </td>
                <td style={{ padding: "13px 20px 13px 0", fontSize: 13, color: "#6B7A99", whiteSpace: "nowrap" }}>
                  {fmtRelative(user.last_active)}
                </td>
                <td style={{ padding: "13px 20px 13px 0", textAlign: "right" }}>
                  <button
                    onClick={() => openSingleDelete(user)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 7,
                      border: "1px solid #E2E7F0",
                      background: "transparent",
                      color: "#EF4444",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: "1px solid #E2E7F0" }}>
            <span style={{ fontSize: 12, color: "#6B7A99" }}>
              Page {page} of {totalPages}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "…" ? (
                    <span key={`ellipsis-${idx}`} style={{ padding: "4px 2px", fontSize: 12, color: "#6B7A99" }}>…</span>
                  ) : (
                    <a
                      key={item}
                      href={pageUrl(item)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        fontSize: 12,
                        fontWeight: item === page ? 700 : 400,
                        color: item === page ? "#ffffff" : "#6B7A99",
                        background: item === page ? "#0B1E3D" : "transparent",
                        border: item === page ? "none" : "1px solid #E2E7F0",
                        textDecoration: "none",
                      }}
                    >
                      {item}
                    </a>
                  )
                )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {modal.open && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11,30,61,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: 32,
              width: 420,
              boxShadow: "0 8px 40px rgba(11,30,61,.18)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0B1E3D", marginBottom: 8 }}>
              {modal.type === "single" ? "Delete user?" : `Delete ${modal.userIds.length} users?`}
            </div>
            <p style={{ fontSize: 13, color: "#6B7A99", marginBottom: 20, lineHeight: 1.6 }}>
              {modal.type === "single"
                ? <>This will permanently delete <strong style={{ color: "#0B1E3D" }}>{modal.email}</strong> and all their data. This cannot be undone.</>
                : <>This will permanently delete <strong style={{ color: "#0B1E3D" }}>{modal.userIds.length} users</strong> and all their associated data. This cannot be undone.</>}
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B7A99", marginBottom: 6 }}>
                Type <strong style={{ color: "#EF4444" }}>DELETE</strong> to confirm
              </label>
              <input
                autoFocus
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmReady && handleConfirm()}
                placeholder="DELETE"
                style={{
                  width: "100%",
                  height: 40,
                  padding: "0 14px",
                  border: `1px solid ${confirmReady ? "#EF4444" : "#E2E7F0"}`,
                  borderRadius: 10,
                  fontSize: 13,
                  color: "#0B1E3D",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={closeModal}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 10,
                  border: "1px solid #E2E7F0",
                  background: "transparent",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#6B7A99",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!confirmReady}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 10,
                  border: "none",
                  background: confirmReady ? "#EF4444" : "#E2E7F0",
                  fontSize: 13,
                  fontWeight: 600,
                  color: confirmReady ? "#ffffff" : "#9CA3AF",
                  cursor: confirmReady ? "pointer" : "not-allowed",
                  transition: "all .15s",
                }}
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
