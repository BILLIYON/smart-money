"use client";

import { useState, useEffect } from "react";
import { popup } from "@/store/popupStore";

import toast from "react-hot-toast";
import type { MyPartnerAccessScope } from "@/types/partner";

const DEFAULT_SCOPES: MyPartnerAccessScope[] = [
  { key: "transactions", label: "Transaction History", desc: "Allow partner to see categorized transaction alerts from your connected accounts", on: false },
  { key: "networth", label: "Net Worth & Account Balances", desc: "Share your aggregated net worth and current balances for portfolio context", on: false },
  { key: "goals", label: "Goals & Milestones", desc: "Let your partner view your active goals, savings targets and progress", on: false },
  { key: "chat", label: "Buddy Conversations", desc: "Allow partner advisors to review conversations with your AI buddies for context", on: false },
  { key: "actions", label: "Agentic Actions Approval", desc: "Send actions above your partner limit to their approval queue before execution", on: false },
];

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
 * Client Privacy & Data Access Controls
 * Synchronized with the PostgreSQL / partner-service consent ledger.
 */
export function PartnerAccessControl() {
  const [scopes, setScopes] = useState<MyPartnerAccessScope[]>(DEFAULT_SCOPES);
  const [partner, setPartner] = useState<{ id: string; name: string; type: string } | null>(null);
  const [hasPartner, setHasPartner] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch real partner access state from backend
  useEffect(() => {
    let mounted = true;
    async function loadPartnerAccess() {
      try {
        const res = await fetch("/api/settings/partner-access");
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data.hasPartner) {
          setHasPartner(true);
          setPartner(data.partner);
          if (Array.isArray(data.scopes) && data.scopes.length > 0) {
            setScopes(data.scopes);
          }
        } else if (mounted) {
          setHasPartner(false);
        }
      } catch (err) {
        console.error("Failed to load partner access:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadPartnerAccess();
    return () => {
      mounted = false;
    };
  }, []);

  async function updateScope(key: string, on: boolean) {
    // Optimistic UI update
    setScopes((prev) => prev.map((s) => (s.key === key ? { ...s, on } : s)));

    try {
      const res = await fetch("/api/settings/partner-access", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: key, enabled: on }),
      });
      if (!res.ok) {
        throw new Error("Failed to update scope on server");
      }
      toast.success(`${on ? "Enabled" : "Disabled"} — your partner's dashboard will update immediately.`);
    } catch (err) {
      // Revert optimistic update
      setScopes((prev) => prev.map((s) => (s.key === key ? { ...s, on: !on } : s)));
      toast.error("Failed to update access permission. Please try again.");
    }
  }

  function handleRevokeAll() {
    const firmName = partner?.name || "your partner firm";
    popup.danger(
      "Revoke All Partner Access",
      `Revoke all of ${firmName}'s access to your DataBank? They'll no longer be able to see any of your financial data, and any pending action approvals will be cancelled. You can reconnect anytime from Find a Partner.`,
      async () => {
        try {
          const res = await fetch("/api/settings/partner-access/revoke", { method: "POST" });
          if (!res.ok) throw new Error("Revocation failed");
          setScopes((prev) => prev.map((s) => ({ ...s, on: false })));
          setHasPartner(false);
          popup.success("Access Revoked", `${firmName} no longer has access to your data.`);
        } catch (err) {
          toast.error("Failed to revoke access. Please try again.");
        }
      },
      "Revoke All Access"
    );
  }

  if (loading) {
    return (
      <div
        style={{
          borderRadius: 14,
          border: "1px solid var(--border)",
          padding: "18px 20px",
          marginBottom: 20,
          color: "var(--muted)",
          fontSize: 13,
        }}
      >
        Loading partner permissions...
      </div>
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

  const firmName = partner?.name || "Partner Firm";

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
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>🤝 {firmName}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
            Connected Firm · {partner?.type || "Advisory"}
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
        Control exactly what {firmName} can see. Changes apply immediately.
      </div>
      <div style={{ marginTop: 8 }}>
        {scopes.map((s) => (
          <ScopeToggle key={s.key} scope={s} onChange={(on) => updateScope(s.key, on)} />
        ))}
      </div>
    </div>
  );
}
