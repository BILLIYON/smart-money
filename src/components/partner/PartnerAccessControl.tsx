"use client";

import { useState } from "react";
import { popup } from "@/store/popupStore";
import toast from "react-hot-toast";
import { MY_PARTNER, MY_PARTNER_SCOPES, type MyPartnerAccessScope } from "./mockData";

function ScopeToggle({ scope, onChange }: { scope: MyPartnerAccessScope; onChange: (on: boolean) => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "11px 0",
        borderBottom: "1px solid var(--border)",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{scope.label}</div>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{scope.desc}</div>
      </div>
      <button
        role="switch"
        aria-checked={scope.on}
        aria-label={scope.label}
        onClick={() => onChange(!scope.on)}
        style={{
          width: 40, height: 22, borderRadius: 11,
          background: scope.on ? "var(--green)" : "var(--border)",
          border: "none", padding: 0, cursor: "pointer",
          position: "relative", transition: "background .2s", flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute", top: 2, left: scope.on ? 20 : 2,
            width: 18, height: 18, borderRadius: "50%",
            background: "#fff", transition: "left .2s",
          }}
        />
      </button>
    </div>
  );
}

/**
 * Frontend-only. Represents a client's control over what a connected
 * partner firm can see. No backend exists yet for partner orgs or
 * consent grants — this demonstrates the intended UI/UX for that.
 */
export function PartnerAccessControl() {
  const [scopes, setScopes] = useState(MY_PARTNER_SCOPES);
  const hasPartner = true; // mock: demo account has one connected partner

  function updateScope(key: string, on: boolean) {
    setScopes((prev) => prev.map((s) => (s.key === key ? { ...s, on } : s)));
    toast.success(`${on ? "Enabled" : "Disabled"} — your partner's dashboard will update on their next refresh.`);
  }

  function handleRevokeAll() {
    popup.danger(
      "Revoke All Partner Access",
      `Revoke all of ${MY_PARTNER.name}'s access to your DataBank? They'll no longer be able to see any of your financial data, and any pending action approvals will be cancelled. You can reconnect anytime from Find a Partner.`,
      async () => {
        setScopes((prev) => prev.map((s) => ({ ...s, on: false })));
        popup.success("Access Revoked", `${MY_PARTNER.name} no longer has access to your data.`);
      },
      "Revoke All Access"
    );
  }

  if (!hasPartner) {
    return (
      <div
        style={{
          borderRadius: 14,
          border: "1px dashed var(--border)",
          padding: "18px 20px",
          marginBottom: 20,
          textAlign: "center",
          color: "var(--muted)",
        }}
      >
        <div style={{ fontSize: 13 }}>You&apos;re not connected to a partner firm yet.</div>
        <a href="/partners" style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }}>
          Find a Partner →
        </a>
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid var(--border)",
        padding: "18px 20px",
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>🤝 {MY_PARTNER.name}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            Connected since {MY_PARTNER.since} · Advisor: {MY_PARTNER.advisor}
          </div>
        </div>
        <button
          onClick={handleRevokeAll}
          style={{
            padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
            background: "rgba(226,75,74,.08)", color: "#E24B4A", border: "1px solid #E24B4A", cursor: "pointer",
          }}
        >
          Revoke All Access
        </button>
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginBottom: 4 }}>
        Control exactly what {MY_PARTNER.name} can see. Changes apply immediately.
      </div>
      <div style={{ marginTop: 8 }}>
        {scopes.map((s) => (
          <ScopeToggle key={s.key} scope={s} onChange={(on) => updateScope(s.key, on)} />
        ))}
      </div>
    </div>
  );
}
