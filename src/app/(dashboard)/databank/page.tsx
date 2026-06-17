"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { createClient } from "@/lib/supabase/client";
import { useDatabankStore } from "@/store/databankStore";

// ── Gmail helpers ─────────────────────────────────────────────
function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type GmailStatus = {
  connected: boolean;
  lastSyncedAt: string | null;
  entryCount: number;
};

// ── Gmail Card ────────────────────────────────────────────────
function GmailCard() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/databank/gmail/status");
    const data = await res.json();
    setStatus(data);
    return data as GmailStatus;
  }, []);

  // On mount: load status, then auto-sync if stale (>4h)
  useEffect(() => {
    loadStatus().then((data) => {
      if (!data.connected || !data.lastSyncedAt) return;
      const ageMs = Date.now() - new Date(data.lastSyncedAt).getTime();
      if (ageMs > 4 * 60 * 60 * 1000) {
        // fire-and-forget background sync
        fetch("/api/databank/gmail/sync", { method: "POST" }).catch(() => {});
      }
    });
  }, [loadStatus]);

  // If redirected back with ?gmail=connected, re-fetch status
  useEffect(() => {
    if (searchParams.get("gmail") === "connected") {
      loadStatus();
    }
  }, [searchParams, loadStatus]);

  async function handleSyncNow() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/databank/gmail/sync", { method: "POST" });
      const data = await res.json();
      setSyncMsg(`Synced ${data.synced ?? 0} new transactions`);
      await loadStatus();
    } catch {
      setSyncMsg("Sync failed. Try again.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 4000);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch("/api/auth/gmail/revoke", { method: "POST" });
      setStatus({ connected: false, lastSyncedAt: null, entryCount: 0 });
    } finally {
      setDisconnecting(false);
      setConfirmDisconnect(false);
    }
  }

  // ── Loading skeleton ──
  if (!status) {
    return (
      <div className="rounded-[16px] p-5 animate-pulse" style={{ background: "var(--card)", border: "1px solid var(--border)", minHeight: 200 }}>
        <div className="h-4 w-32 rounded mb-4" style={{ background: "var(--border)" }} />
        <div className="h-3 w-full rounded mb-2" style={{ background: "var(--border)" }} />
        <div className="h-3 w-3/4 rounded" style={{ background: "var(--border)" }} />
      </div>
    );
  }

  // ── STATE 1: Not connected ────────────────────────────────
  if (!status.connected) {
    return (
      <div className="rounded-[16px] p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center rounded-[10px]" style={{ width: 36, height: 36, background: "rgba(234,67,53,.1)", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: "none" }}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#EA4335" strokeWidth="2" />
              <polyline points="22,6 12,13 2,6" stroke="#EA4335" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <div className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>Gmail Integration</div>
            <div className="text-[11px]" style={{ color: "var(--muted)" }}>Not connected</div>
          </div>
        </div>

        {/* What gets scanned */}
        <div className="flex flex-col gap-[6px] mb-4">
          {[
            "Bank credit & debit alerts",
            "Subscription receipts (PayPal, Stripe)",
            "Salary & direct deposit notifications",
            "Utility and phone bill payments",
            "Investment platform emails (Fidelity, Schwab)",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-[12px]" style={{ color: "var(--muted)" }}>
              <span style={{ color: "var(--green)", fontWeight: 700 }}>✓</span>
              {item}
            </div>
          ))}
        </div>

        {/* Connect button */}
        <button
          onClick={() => {
            const width = 600;
            const height = 700;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;

            const popup = window.open(
              `/api/auth/gmail`,
              "Connect Gmail",
              `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
            );

            const handleOAuthMessage = (event: MessageEvent) => {
              if (event.origin !== window.location.origin) return;
              if (event.data?.type === "GMAIL_CONNECTED") {
                loadStatus();
                window.removeEventListener("message", handleOAuthMessage);
              } else if (event.data?.type === "GMAIL_ERROR") {
                console.error("Gmail connection failed in popup");
                window.removeEventListener("message", handleOAuthMessage);
              }
            };

            window.addEventListener("message", handleOAuthMessage);

            const timer = setInterval(() => {
              if (popup?.closed) {
                clearInterval(timer);
                window.removeEventListener("message", handleOAuthMessage);
              }
            }, 1000);
          }}
          className="flex items-center justify-center gap-2 w-full py-[10px] rounded-[10px] text-[13px] font-semibold mb-3 transition-colors duration-150 border-none cursor-pointer"
          style={{ background: "var(--green)", color: "#fff", textDecoration: "none" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green2)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green)"; }}
        >
          <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: "none", stroke: "#fff", strokeWidth: 2 }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          Connect Gmail
        </button>

        {/* Disclaimer */}
        <div className="text-[11px] text-center" style={{ color: "var(--muted)" }}>
          🔒 Read-only. We never send email or modify your inbox.
        </div>
      </div>
    );
  }

  // ── STATE 2: Connected ────────────────────────────────────
  const permLabels = ["Bank alerts", "Receipts", "Salary", "Subscriptions"];

  return (
    <div className="rounded-[16px] p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-[10px]" style={{ width: 36, height: 36, background: "rgba(0,196,140,.1)", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: "none" }}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="var(--green)" strokeWidth="2" />
              <polyline points="22,6 12,13 2,6" stroke="var(--green)" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <div className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>Gmail Integration</div>
            <div className="text-[11px]" style={{ color: "var(--muted)" }}>Last synced: {timeAgo(status.lastSyncedAt)}</div>
          </div>
        </div>
        <span className="text-[11px] font-semibold px-2 py-[3px] rounded-full" style={{ background: "rgba(0,196,140,.1)", color: "var(--green2)" }}>
          ● Connected
        </span>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 rounded-[10px] px-3 py-[10px] text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <div className="text-[18px] font-bold" style={{ color: "var(--text)" }}>{status.entryCount}</div>
          <div className="text-[10px]" style={{ color: "var(--muted)" }}>emails processed</div>
        </div>
        <div className="flex-1 rounded-[10px] px-3 py-[10px] text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <div className="text-[18px] font-bold" style={{ color: "var(--text)" }}>4h</div>
          <div className="text-[10px]" style={{ color: "var(--muted)" }}>auto-sync interval</div>
        </div>
      </div>

      {/* Permission toggles (display only) */}
      <div className="flex flex-wrap gap-2 mb-4">
        {permLabels.map((label) => (
          <div
            key={label}
            className="flex items-center gap-1 px-[10px] py-[5px] rounded-full text-[11px] font-medium"
            style={{ background: "rgba(0,196,140,.08)", border: "1px solid rgba(0,196,140,.2)", color: "var(--green2)" }}
          >
            <span>✓</span> {label}
          </div>
        ))}
      </div>

      {/* Sync toast */}
      {syncMsg && (
        <div
          className="text-[12px] px-3 py-[8px] rounded-[8px] mb-3 text-center"
          style={{ background: "rgba(0,196,140,.08)", border: "1px solid rgba(0,196,140,.2)", color: "var(--green2)" }}
        >
          {syncMsg}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSyncNow}
          disabled={syncing}
          className="flex-1 py-[9px] rounded-[10px] text-[12px] font-semibold transition-colors duration-150"
          style={{ background: "var(--green)", color: "#fff", border: "none", opacity: syncing ? 0.7 : 1, cursor: syncing ? "not-allowed" : "pointer" }}
          onMouseEnter={(e) => { if (!syncing) (e.currentTarget as HTMLButtonElement).style.background = "var(--green2)"; }}
          onMouseLeave={(e) => { if (!syncing) (e.currentTarget as HTMLButtonElement).style.background = "var(--green)"; }}
        >
          {syncing ? "Syncing…" : "Sync Now"}
        </button>
        <button
          onClick={() => setConfirmDisconnect(true)}
          className="px-4 py-[9px] rounded-[10px] text-[12px] font-medium border transition-colors duration-150"
          style={{ color: "#E24B4A", borderColor: "#E24B4A", background: "transparent" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,75,74,.06)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          Disconnect
        </button>
      </div>

      {/* Return to Chat — shown when arriving via the Gmail OAuth flow */}
      {searchParams.get("gmail") === "connected" && (
        <Link
          href="/chat?source=databank"
          className="flex items-center justify-center gap-2 mt-3 py-[9px] rounded-[10px] text-[12px] font-semibold text-white transition-colors duration-150"
          style={{ background: "var(--navy)" }}
        >
          Return to Chat →
        </Link>
      )}

      {/* Confirm disconnect dialog */}
      {confirmDisconnect && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[200]"
          style={{ background: "rgba(0,0,0,.55)" }}
          onClick={() => setConfirmDisconnect(false)}
        >
          <div
            className="rounded-[16px] p-6 w-[340px]"
            style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[16px] font-semibold mb-2" style={{ color: "var(--text)" }}>Disconnect Gmail?</div>
            <div className="text-[13px] mb-5" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
              This will remove all Gmail-sourced data from your DataBank. Are you sure?
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDisconnect(false)}
                className="flex-1 py-[9px] rounded-[10px] text-[13px] font-medium border"
                style={{ color: "var(--muted)", borderColor: "var(--border)", background: "transparent" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex-1 py-[9px] rounded-[10px] text-[13px] font-semibold"
                style={{ background: "#E24B4A", color: "#fff", border: "none", opacity: disconnecting ? 0.7 : 1 }}
              >
                {disconnecting ? "Removing…" : "Yes, Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────
function Toggle({ on, onToggle, "aria-label": ariaLabel }: { on: boolean; onToggle: () => void; "aria-label"?: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={onToggle}
      className="relative cursor-pointer flex-shrink-0"
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: on ? "var(--green)" : "var(--border)",
        transition: "background .2s",
        border: "none", padding: 0,
      }}
    >
      <div
        style={{
          position: "absolute", top: 3,
          left: on ? 19 : 3,
          width: 14, height: 14, borderRadius: "50%",
          background: "#fff",
          transition: "left .2s",
          boxShadow: "0 1px 3px rgba(0,0,0,.25)",
        }}
      />
    </button>
  );
}

// ── Signal Source Item ────────────────────────────────────
function SourceItem({
  icon, iconBg, iconIsCircle = false, name, sub, on, onToggle, isDashed = false, iconFontSize = 13, premium = false,
}: {
  icon: React.ReactNode; iconBg: string; iconIsCircle?: boolean; name: string; sub: string;
  on?: boolean; onToggle?: () => void; isDashed?: boolean; iconFontSize?: number; premium?: boolean;
}) {
  return (
    <div
      onClick={isDashed ? onToggle : undefined}
      className="flex items-center gap-[10px] p-[10px] rounded-[10px]"
      style={{
        background: isDashed ? "transparent" : "var(--bg)",
        border: isDashed ? "1px dashed var(--border)" : "1px solid var(--border)",
        cursor: isDashed ? "pointer" : "default",
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 30, height: 30,
          borderRadius: iconIsCircle ? "50%" : 8,
          background: iconBg,
          fontSize: iconFontSize,
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[5px]">
          <div className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{name}</div>
          {premium && (
            <span
              className="text-[9px] font-semibold px-[5px] py-[1px] rounded-full uppercase tracking-[.3px] flex-shrink-0"
              style={{ background: "rgba(245,166,35,.15)", color: "#C47F00", border: "1px solid rgba(245,166,35,.3)" }}
            >
              Premium
            </span>
          )}
        </div>
        <div className="text-[11px]" style={{ color: "var(--muted)" }}>{sub}</div>
      </div>
      {on !== undefined && onToggle && !isDashed && <Toggle on={on} onToggle={onToggle} aria-label={`Toggle ${name}`} />}
    </div>
  );
}

// ── Signals data ──────────────────────────────────────────
const NEWS_SOURCES = [
  { id: "nairametrics", icon: "📊", iconBg: "#E3F2FD", name: "Nairametrics", sub: "Nigeria's leading financial news" },
  { id: "businessday", icon: "📈", iconBg: "#E8F5E9", name: "BusinessDay NG", sub: "Business and economy coverage" },
  { id: "reuters", icon: "🌐", iconBg: "#FFF9C4", name: "Reuters Finance", sub: "Global financial news" },
  { id: "coindesk", icon: "₿", iconBg: "#FCE4EC", name: "CoinDesk", sub: "Crypto and Web3 markets" },
  { id: "bloomberg", icon: "🏦", iconBg: "#EDE7F6", name: "Bloomberg", sub: "Premium financial data", premium: true },
];

const PODCAST_SOURCES = [
  { id: "stears-podcast", icon: "🎙️", iconBg: "#9B59B6", name: "The Stears Podcast", sub: "Nigerian Economy", iconFontSize: 14 },
  { id: "wedontdostocks", icon: "🎙️", iconBg: "#E74C3C", name: "We Don't Do Stocks", sub: "African Investing", iconFontSize: 14 },
  { id: "planet-money", icon: "🎙️", iconBg: "#1ABC9C", name: "Planet Money (NPR)", sub: "Global Economics", iconFontSize: 14 },
  { id: "invest-like-the-best", icon: "🎙️", iconBg: "#3498DB", name: "Invest Like the Best", sub: "Global Investors", iconFontSize: 14 },
];

const NEWSLETTER_SOURCES = [
  { id: "stears-weekly", icon: "📬", iconBg: "#F39C12", name: "Stears Weekly", sub: "Nigeria Economics", iconFontSize: 14 },
  { id: "techcabal", icon: "📬", iconBg: "#2ECC71", name: "TechCabal Daily", sub: "African Tech & VC", iconFontSize: 14 },
  { id: "hustle", icon: "📬", iconBg: "#8E44AD", name: "The Hustle", sub: "Business & Finance", iconFontSize: 14 },
];

type BankItem = {
  id: string;
  emoji: string;
  name: string;
};

const BANKS: BankItem[] = [
  { id: "gtbank", emoji: "🏦", name: "GTBank" },
  { id: "access", emoji: "🏛️", name: "Access Bank" },
  { id: "zenith", emoji: "🔷", name: "Zenith Bank" },
  { id: "uba", emoji: "🦁", name: "UBA" },
  { id: "stanbic", emoji: "📊", name: "Stanbic IBTC" },
  { id: "firstbank", emoji: "🏅", name: "First Bank" },
];

type UploadedFile = {
  label: string;
  meta: string;
};

// ── DataBank page ─────────────────────────────────────────
export default function DataBankPage() {
  const [tab, setTab] = useState<"sources" | "analytics">("sources");
  const [signalTab, setSignalTab] = useState<"news" | "social" | "podcasts" | "newsletters" | "api">("news");
  
  // Dynamic statement files
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic user enabled signal sources (includes bank connection IDs)
  const [enabledSources, setEnabledSources] = useState<Set<string>>(new Set());
  const [customSources, setCustomSources] = useState<any[]>([]);
  const [socialInput, setSocialInput] = useState("");
  const [newsletterInput, setNewsletterInput] = useState("");
  const [obPerms, setObPerms] = useState([true, true, true, true, true]);
  const [apiActive1, setApiActive1] = useState(true);
  const [apiActive2, setApiActive2] = useState(true);
  const [apiEnable1, setApiEnable1] = useState(false);
  const [apiEnable2, setApiEnable2] = useState(false);

  // Open banking modal simulation state
  const [connectingBank, setConnectingBank] = useState<BankItem | null>(null);
  const [connectStep, setConnectStep] = useState<1 | 2 | 3>(1);
  const [obUsername, setObUsername] = useState("");
  const [obPassword, setObPassword] = useState("");
  const [obOtp, setObOtp] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  // Manual entry states
  const [manualType, setManualType] = useState<"Income" | "Expense" | "Goal" | "Asset" | "Debt">("Income");
  const [manualAmount, setManualAmount] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);
  const [manualCategory, setManualCategory] = useState("Salary");
  const [savingManual, setSavingManual] = useState(false);

  // Databank Store
  const { uploadStatement, addManualEntry } = useDatabankStore();

  const fetchEnabledSources = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_signal_sources")
      .select("source_id")
      .eq("enabled", true);
    if (data && !error) {
      setEnabledSources(new Set(data.map((s) => s.source_id)));
    }
  }, []);

  const fetchUploadedFiles = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("databank_entries")
      .select("metadata, created_at")
      .eq("source", "upload");

    if (error || !data) {
      setUploadedFiles([]);
      setLoadingFiles(false);
      return;
    }

    // Group by file name stored in metadata
    const groups: Record<string, { count: number; date: string }> = {};
    data.forEach((row) => {
      const meta = row.metadata as { fileName?: string };
      const fileName = meta?.fileName || "Unknown statement";
      if (!groups[fileName]) {
        groups[fileName] = {
          count: 0,
          date: new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        };
      }
      groups[fileName].count += 1;
    });

    const list = Object.entries(groups).map(([name, detail]) => ({
      label: name,
      meta: `Uploaded ${detail.date} · ${detail.count} transactions parsed`,
    }));

    setUploadedFiles(list);
    setLoadingFiles(false);
  }, []);

  const fetchCustomSources = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("signal_sources")
      .select("*");
    if (data && !error) {
      setCustomSources(data.filter((s: any) => s.id.startsWith("custom-") || s.signal_schema?.custom));
    }
  }, []);

  useEffect(() => {
    // Initialise context, active signals and uploaded files
    useDatabankStore.getState().loadContext();
    fetchEnabledSources();
    fetchCustomSources();
    fetchUploadedFiles();
  }, [fetchEnabledSources, fetchCustomSources, fetchUploadedFiles]);

  const handleAddSocial = async (val: string) => {
    if (!val.trim()) return;
    let type: "youtube" | "tiktok" = "youtube";
    let url = val.trim();

    if (url.includes("tiktok.com")) {
      type = "tiktok";
    } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
      type = "youtube";
    } else {
      url = `https://youtube.com/user/${url.replace("@", "")}`;
    }

    const res = await fetch("/api/signals/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, type }),
    });

    if (res.ok) {
      alert("Successfully registered custom social source!");
      fetchCustomSources();
      fetchEnabledSources();
    } else {
      const err = await res.json();
      alert(`Failed: ${err.error || "Unknown error"}`);
    }
  };

  const handleToggleSource = async (sourceId: string) => {
    const isEnabled = enabledSources.has(sourceId);
    const supabase = createClient();
    if (isEnabled) {
      const { error } = await supabase
        .from("user_signal_sources")
        .delete()
        .eq("source_id", sourceId);
      if (!error) {
        setEnabledSources((prev) => {
          const next = new Set(prev);
          next.delete(sourceId);
          return next;
        });
      }
    } else {
      const res = await fetch("/api/signals/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      if (res.ok) {
        setEnabledSources((prev) => new Set([...prev, sourceId]));
      }
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("databank_entries")
      .delete()
      .eq("source", "upload")
      .filter("metadata->>fileName", "eq", fileName);

    if (error) {
      alert("Failed to delete statement");
      return;
    }

    await fetchUploadedFiles();
    await useDatabankStore.getState().loadContext();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadStatement(file);
      await fetchUploadedFiles();
      alert(`Successfully uploaded & parsed ${file.name}`);
    } catch (err: any) {
      alert(err.message ?? "Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAmount || !manualDescription) {
      alert("Please enter both an amount and description");
      return;
    }

    const amt = parseFloat(manualAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid positive number for amount");
      return;
    }

    const entryType = manualType.toLowerCase() as "income" | "expense" | "subscription" | "asset" | "debt";
    const amountKobo = Math.round(amt * 100);
    const signedAmount = (entryType === "expense" || entryType === "subscription" || entryType === "debt")
      ? -amountKobo
      : amountKobo;

    setSavingManual(true);
    try {
      await addManualEntry({
        entry_type: entryType,
        amount: signedAmount,
        description: manualDescription,
        date: new Date(manualDate).toISOString(),
        category: manualCategory,
      });

      // Reset
      setManualAmount("");
      setManualDescription("");
      alert("Manual entry added successfully!");
    } catch (err: any) {
      alert(err.message ?? "Failed to add manual entry");
    } finally {
      setSavingManual(false);
    }
  };

  const handleOpenBankingClick = (bank: BankItem) => {
    if (enabledSources.has(bank.id)) {
      // Prompt to disconnect
      if (confirm(`Do you want to disconnect ${bank.name} from your DataBank?`)) {
        handleToggleSource(bank.id);
      }
    } else {
      setConnectingBank(bank);
      setConnectStep(1);
      setObUsername("");
      setObPassword("");
      setObOtp("");
    }
  };

  const handleObConnectNext = () => {
    if (!obUsername || !obPassword) {
      alert("Please enter login credentials");
      return;
    }
    setModalLoading(true);
    setTimeout(() => {
      setModalLoading(false);
      setConnectStep(2);
    }, 1500);
  };

  const handleObVerifyOtp = async () => {
    if (!obOtp) {
      alert("Please enter OTP code");
      return;
    }
    if (!connectingBank) return;

    setModalLoading(true);
    try {
      const res = await fetch("/api/signals/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: connectingBank.id }),
      });
      if (res.ok) {
        setEnabledSources((prev) => new Set([...prev, connectingBank.id]));
        setConnectStep(3);
      } else {
        alert("Failed to authenticate with bank");
      }
    } catch {
      alert("Connection failed");
    } finally {
      setModalLoading(false);
    }
  };

  const handleExportData = () => {
    window.location.href = "/api/settings/export";
  };

  const signalTabs = [
    { id: "news", label: "📰 News Media" },
    { id: "social", label: "🐦 Social & Creators" },
    { id: "podcasts", label: "🎙️ Podcasts" },
    { id: "newsletters", label: "📬 Newsletters" },
    { id: "api", label: "⚡ Custom API Sessions" },
  ] as const;

  const obPermLabels = [
    { icon: "📊", label: "Account balance (real-time)" },
    { icon: "📋", label: "Transaction history (last 6 months)" },
    { icon: "🔔", label: "Credit / debit alerts (real-time)" },
    { icon: "🔄", label: "Standing orders & debit mandates" },
    { icon: "⚡", label: "Execute transfers (Agentic Actions only)" },
  ];

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="px-4 py-6 sm:px-6 lg:px-8 w-full">

        {/* Privacy reassurance bar */}
        <div
          className="flex items-center gap-3 px-4 py-[10px] rounded-[10px] mb-5 text-[12px]"
          style={{
            background: "rgba(0,196,140,.05)",
            borderLeft: "3px solid var(--green)",
            border: "1px solid rgba(0,196,140,.15)",
            borderLeftWidth: 3,
            borderLeftColor: "var(--green)",
            color: "var(--muted)",
            lineHeight: 1.6,
          }}
        >
          <span className="flex-shrink-0" style={{ fontSize: 14 }}>🔒</span>
          <span>
            <strong style={{ color: "var(--text)" }}>You are in full control.</strong>{" "}
            Raw files are never stored — only extracted insights are retained.
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="text-[22px] font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
            Your <em style={{ fontFamily: "var(--font-dm-serif)", fontStyle: "italic", color: "var(--green)" }}>DataBank</em>
          </div>
          <button
            onClick={handleExportData}
            className="px-4 py-[9px] rounded-[10px] text-[12px] font-medium border transition-all duration-150 cursor-pointer"
            style={{ color: "var(--muted)", borderColor: "var(--border)", background: "var(--card)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--green)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--green)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; }}
          >
            Export All Data
          </button>
        </div>

        {/* Main tabs */}
        <div className="flex mb-6" style={{ borderBottom: "1px solid var(--border)" }}>
          {[{ id: "sources", label: "📂 Data Sources" }, { id: "analytics", label: "📊 Spending Analytics" }].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as "sources" | "analytics")}
              className="py-[10px] px-5 text-[13px] font-semibold transition-all duration-150"
              style={{
                color: tab === t.id ? "var(--green)" : "var(--muted)",
                background: "transparent",
                border: "none",
                borderBottomStyle: "solid",
                borderBottomWidth: 2,
                borderBottomColor: tab === t.id ? "var(--green)" : "transparent",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── DATA SOURCES PANEL ── */}
        {tab === "sources" && (
          <div>
            {/* Hint badge */}
            <div
              className="text-[12px] px-4 py-[10px] rounded-[10px] mb-4"
              style={{ background: "rgba(0,196,140,.07)", border: "1px solid rgba(0,196,140,.18)", color: "var(--muted)" }}
            >
              💡 More data = more personalised advice. Start with Gmail or a bank statement.
            </div>

            {/* 2-col card grid */}
            <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>

              {/* Bank Statements */}
              <div className="rounded-[16px] p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: "var(--green)", fill: "none", strokeWidth: 2 }}>
                      <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                    Bank Statements
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-[3px] rounded-full" style={{ background: "rgba(0,196,140,.1)", color: "var(--green2)" }}>
                    {loadingFiles ? "Loading..." : `${uploadedFiles.length} connected`}
                  </span>
                </div>
                <div className="flex flex-col gap-[6px] mb-4">
                  {loadingFiles ? (
                    <div className="text-[12px] text-center py-2" style={{ color: "var(--muted)" }}>Loading statements...</div>
                  ) : uploadedFiles.length === 0 ? (
                    <div className="text-[12px] text-center py-4" style={{ color: "var(--muted)" }}>No statements uploaded yet</div>
                  ) : (
                    uploadedFiles.map((item) => (
                      <div key={item.label} className="flex items-center gap-[10px] px-3 py-[10px] rounded-[10px]" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                        <div className="flex items-center justify-center rounded-[8px] text-[14px]" style={{ width: 32, height: 32, background: "#E8F5E9", flexShrink: 0 }}>📄</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium truncate" style={{ color: "var(--text)" }}>{item.label}</div>
                          <div className="text-[11px]" style={{ color: "var(--muted)" }}>{item.meta}</div>
                        </div>
                        <button
                          onClick={() => handleDeleteFile(item.label)}
                          className="text-[16px] w-6 h-6 flex items-center justify-center rounded cursor-pointer"
                          style={{ color: "var(--muted)", background: "transparent", border: "none" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#E24B4A"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; }}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.pdf"
                  style={{ display: "none" }}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      setUploading(true);
                      try {
                        await uploadStatement(file);
                        await fetchUploadedFiles();
                        alert(`Successfully uploaded & parsed ${file.name}`);
                      } catch (err: any) {
                        alert(err.message ?? "Failed to upload file");
                      } finally {
                        setUploading(false);
                      }
                    }
                  }}
                  className="flex flex-col items-center justify-center gap-1 py-5 rounded-[12px] border-2 border-dashed cursor-pointer transition-all duration-150"
                  style={{ borderColor: "var(--border)", opacity: uploading ? 0.6 : 1 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--green)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; }}
                >
                  <div className="text-[20px]">📂</div>
                  <div className="text-[12px] font-medium" style={{ color: "var(--muted)" }}>
                    {uploading ? "Ingesting file..." : "Drop statement here / Click to upload"}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--border)" }}>PDF or CSV · Any bank</div>
                </div>
              </div>

              {/* Gmail Integration */}
              <Suspense>
                <GmailCard />
              </Suspense>

              {/* Manual Entry Form */}
              <div className="rounded-[16px] p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: "var(--green)", fill: "none", strokeWidth: 2 }}>
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Manual Entry
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-[3px] rounded-full" style={{ background: "rgba(74,144,217,.1)", color: "#4A90D9" }}>Add Manually</span>
                </div>
                <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[.5px] mb-1" style={{ color: "var(--muted)" }}>Type</div>
                      <select
                        value={manualType}
                        onChange={(e) => setManualType(e.target.value as any)}
                        className="w-full px-3 py-[9px] rounded-[10px] text-[12px] outline-none"
                        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-sora)" }}
                      >
                        <option>Income</option>
                        <option>Expense</option>
                        <option>Goal</option>
                        <option>Asset</option>
                        <option>Debt</option>
                      </select>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[.5px] mb-1" style={{ color: "var(--muted)" }}>Amount (₦)</div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={manualAmount}
                        onChange={(e) => setManualAmount(e.target.value)}
                        className="w-full px-3 py-[9px] rounded-[10px] text-[12px] outline-none"
                        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-sora)" }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[.5px] mb-1" style={{ color: "var(--muted)" }}>Description</div>
                    <input
                      type="text"
                      placeholder="e.g. Freelance payment from client"
                      value={manualDescription}
                      onChange={(e) => setManualDescription(e.target.value)}
                      className="w-full px-3 py-[9px] rounded-[10px] text-[12px] outline-none"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-sora)" }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[.5px] mb-1" style={{ color: "var(--muted)" }}>Date</div>
                      <input
                        type="date"
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                        className="w-full px-3 py-[9px] rounded-[10px] text-[12px] outline-none"
                        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-sora)" }}
                      />
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[.5px] mb-1" style={{ color: "var(--muted)" }}>Category</div>
                      <select
                        value={manualCategory}
                        onChange={(e) => setManualCategory(e.target.value)}
                        className="w-full px-3 py-[9px] rounded-[10px] text-[12px] outline-none"
                        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-sora)" }}
                      >
                        <option>Salary</option>
                        <option>Business</option>
                        <option>Food</option>
                        <option>Transport</option>
                        <option>Investment</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={savingManual}
                    className="w-full py-[10px] rounded-[10px] text-[12px] font-semibold transition-all duration-150 cursor-pointer"
                    style={{ background: "var(--green)", color: "#fff", border: "none", opacity: savingManual ? 0.7 : 1 }}
                    onMouseEnter={(e) => { if (!savingManual) (e.currentTarget as HTMLButtonElement).style.background = "var(--green2)"; }}
                    onMouseLeave={(e) => { if (!savingManual) (e.currentTarget as HTMLButtonElement).style.background = "var(--green)"; }}
                  >
                    {savingManual ? "Saving..." : "Add to DataBank"}
                  </button>
                </form>
              </div>

              {/* Open Banking API */}
              <div className="rounded-[16px] p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: "var(--green)", fill: "none", strokeWidth: 2 }}>
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    Open Banking API
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-[3px] rounded-full" style={{ background: "rgba(0,196,140,.1)", color: "var(--green2)" }}>
                    {BANKS.filter((b) => enabledSources.has(b.id)).length} connected
                  </span>
                </div>

                {/* How it works */}
                <div className="mb-5">
                  <div className="text-[10px] font-semibold uppercase tracking-[.5px] mb-3" style={{ color: "var(--muted)" }}>How it works</div>
                  {[
                    { n: "1", title: "Select your bank", sub: "Choose from supported Nigerian banks below. You'll be redirected to your bank's own secure login page — Smart Money never sees your credentials." },
                    { n: "2", title: "Authorise with your bank", sub: "Your bank asks what you want to share. You choose: account balance, transaction history, or both. You can grant read-only, or read + execute for Agentic Actions." },
                    { n: "3", title: "Smart Money receives your permission token", sub: "We receive a secure token from your bank — not your password. Your buddies now have live context. Revoke access anytime from here or from your bank's app." },
                  ].map((step) => (
                    <div key={step.n} className="flex gap-3 mb-3">
                      <div className="flex items-center justify-center rounded-full text-[11px] font-bold flex-shrink-0" style={{ width: 22, height: 22, background: "var(--green)", color: "#fff", marginTop: 1 }}>{step.n}</div>
                      <div>
                        <div className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>{step.title}</div>
                        <div className="text-[11px] mt-[2px]" style={{ color: "var(--muted)", lineHeight: 1.6 }}>{step.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bank grid */}
                <div className="text-[10px] font-semibold uppercase tracking-[.5px] mb-3" style={{ color: "var(--muted)" }}>Select a Bank to Connect</div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {BANKS.map((bank) => {
                    const isConnected = enabledSources.has(bank.id);
                    return (
                      <div
                        key={bank.id}
                        onClick={() => handleOpenBankingClick(bank)}
                        className="flex flex-col items-center gap-1 p-3 rounded-[10px] cursor-pointer transition-all duration-150"
                        style={{
                          background: isConnected ? "rgba(0,196,140,.06)" : "var(--bg)",
                          border: isConnected ? "2px solid var(--green)" : "1px solid var(--border)",
                          textAlign: "center",
                        }}
                      >
                        <div className="text-[20px]">{bank.emoji}</div>
                        <div className="text-[11px] font-semibold" style={{ color: "var(--text)" }}>{bank.name}</div>
                        <div className="text-[10px]" style={{ color: isConnected ? "var(--green2)" : "var(--muted)" }}>
                          {isConnected ? "Connected" : "Tap to connect"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Permission controls */}
                <div className="rounded-[12px] p-4 mb-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div className="text-[10px] font-semibold uppercase tracking-[.5px] mb-3" style={{ color: "var(--muted)" }}>GTBank — Permission Controls</div>
                  <div className="flex flex-col gap-3">
                    {obPermLabels.map((perm, i) => (
                      <div key={perm.label} className="flex items-center gap-2">
                        <span className="text-[14px] flex-shrink-0">{perm.icon}</span>
                        <span className="flex-1 text-[12px]" style={{ color: "var(--text)" }}>{perm.label}</span>
                        <Toggle on={obPerms[i]} onToggle={() => setObPerms((p) => p.map((v, j) => j === i ? !v : v))} aria-label={perm.label} />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button className="px-3 py-[7px] text-[11px] font-medium rounded-[8px] border transition-all duration-150 cursor-pointer" style={{ color: "var(--muted)", borderColor: "var(--border)", background: "transparent" }}>Refresh Token</button>
                    <button
                      onClick={() => handleToggleSource("gtbank")}
                      className="px-3 py-[7px] text-[11px] font-medium rounded-[8px] border transition-all duration-150 cursor-pointer"
                      style={{ color: "#E24B4A", borderColor: "#E24B4A", background: "transparent" }}
                    >
                      Revoke Access
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-[11px]" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                  <span className="flex-shrink-0">🔐</span>
                  <span>Your login credentials never leave your bank's website. Smart Money receives only a time-limited permission token. All connections comply with CBN Open Banking guidelines.</span>
                </div>
              </div>
            </div>

            {/* Signal Sources — full width */}
            <div className="rounded-[16px] p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2 text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: "var(--green)", fill: "none", strokeWidth: 2 }}>
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.35 9.1a19.79 19.79 0 01-3.07-8.67A2 2 0 012.25 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z" />
                  </svg>
                  Live Signal Sources
                  <span className="text-[11px] font-normal" style={{ color: "var(--muted)" }}>— Your buddies listen to these</span>
                </div>
                <span className="text-[11px] font-semibold px-2 py-[3px] rounded-full" style={{ background: "rgba(0,196,140,.1)", color: "var(--green2)" }}>
                  {enabledSources.size} sources active
                </span>
              </div>

              {/* Signal sub-tabs */}
              <div className="flex overflow-x-auto mb-4" style={{ borderBottom: "1px solid var(--border)", scrollbarWidth: "none" }}>
                {signalTabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSignalTab(t.id)}
                    className="px-4 py-2 text-[12px] font-semibold whitespace-nowrap flex-shrink-0"
                    style={{
                      color: signalTab === t.id ? "var(--green)" : "var(--muted)",
                      background: "transparent",
                      border: "none",
                      borderBottomStyle: "solid",
                      borderBottomWidth: 2,
                      borderBottomColor: signalTab === t.id ? "var(--green)" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* News Media */}
              {signalTab === "news" && (
                <div className="grid gap-[10px]" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                  {NEWS_SOURCES.map((src) => {
                    const isEnabled = enabledSources.has(src.id);
                    return (
                      <SourceItem
                        key={src.name} icon={src.icon} iconBg={src.iconBg} name={src.name} sub={src.sub}
                        on={isEnabled} premium={src.premium}
                        onToggle={() => handleToggleSource(src.id)}
                      />
                    );
                  })}
                  {customSources.filter(s => s.signal_schema?.type === "rss").map((src) => {
                    const isEnabled = enabledSources.has(src.id);
                    return (
                      <SourceItem
                        key={src.id} icon="📰" iconBg="rgba(0,196,140,.1)" name={src.name} sub="Custom RSS feed"
                        on={isEnabled}
                        onToggle={() => handleToggleSource(src.id)}
                      />
                    );
                  })}
                  <SourceItem
                    icon={<span style={{ fontSize: 18, color: "var(--muted)" }}>+</span>}
                    iconBg="var(--bg)"
                    name="Add News Source"
                    sub="RSS URL"
                    isDashed
                    onToggle={async () => {
                      const url = prompt("Enter Custom News RSS Feed URL:");
                      if (!url) return;
                      const res = await fetch("/api/signals/custom", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ url, type: "rss" }),
                      });
                      if (res.ok) {
                        alert("Successfully registered custom RSS source!");
                        fetchCustomSources();
                        fetchEnabledSources();
                      } else {
                        const err = await res.json();
                        alert(`Failed: ${err.error || "Unknown error"}`);
                      }
                    }}
                  />
                </div>
              )}

              {/* Social & Creators */}
              {signalTab === "social" && (
                <div>
                  <div className="text-[12px] mb-4" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                    Add Twitter/X handles, YouTube channels, or TikTok profiles your buddy monitors
                  </div>
                  <div className="flex gap-2 mb-5">
                    <input
                      type="text"
                      value={socialInput}
                      onChange={(e) => setSocialInput(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && socialInput.trim()) {
                          const val = socialInput.trim();
                          setSocialInput("");
                          await handleAddSocial(val);
                        }
                      }}
                      placeholder="Twitter handle, YouTube URL, or TikTok profile..."
                      className="flex-1 px-3 py-[9px] rounded-[10px] text-[12px] outline-none"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-sora)" }}
                      onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--green)"; }}
                      onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
                    />
                    <button
                      onClick={async () => {
                        if (!socialInput.trim()) return;
                        const val = socialInput.trim();
                        setSocialInput("");
                        await handleAddSocial(val);
                      }}
                      className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold transition-all duration-150 cursor-pointer"
                      style={{ background: "var(--green)", color: "#fff", border: "none" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green2)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green)"; }}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {customSources.filter(s => s.signal_schema?.type === "youtube" || s.signal_schema?.type === "tiktok").map((src) => {
                      const isEnabled = enabledSources.has(src.id);
                      return (
                        <div
                          key={src.id}
                          className="flex items-center gap-[6px] px-3 py-[7px] rounded-[10px] text-[12px]"
                          style={{
                            background: "var(--bg)",
                            border: "1px solid var(--border)",
                            color: "var(--text)",
                          }}
                        >
                          <span
                            className="cursor-pointer font-medium hover:text-[var(--green)]"
                            onClick={() => handleToggleSource(src.id)}
                            style={{ textDecoration: isEnabled ? "none" : "line-through", opacity: isEnabled ? 1 : 0.6 }}
                          >
                            {src.signal_schema?.type === "youtube" ? "▶" : "🎵"} {src.name}
                          </span>
                          <button
                            onClick={async () => {
                              const res = await fetch("/api/signals/custom", {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ sourceId: src.id }),
                              });
                              if (res.ok) {
                                fetchCustomSources();
                                fetchEnabledSources();
                              }
                            }}
                            className="flex items-center justify-center w-4 h-4 text-[14px] leading-none transition-colors duration-150 cursor-pointer"
                            style={{ color: "var(--muted)", background: "transparent", border: "none" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#E24B4A"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Podcasts */}
              {signalTab === "podcasts" && (
                <div className="grid gap-[10px]" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                  {PODCAST_SOURCES.map((src) => {
                    const isEnabled = enabledSources.has(src.id);
                    return (
                      <SourceItem
                        key={src.name} icon={src.icon} iconBg={src.iconBg} name={src.name} sub={src.sub}
                        on={isEnabled} iconFontSize={src.iconFontSize}
                        onToggle={() => handleToggleSource(src.id)}
                      />
                    );
                  })}
                  {customSources.filter(s => s.signal_schema?.type === "podcast").map((src) => {
                    const isEnabled = enabledSources.has(src.id);
                    return (
                      <SourceItem
                        key={src.id} icon="🎙️" iconBg="rgba(74,144,217,.1)" name={src.name} sub="Custom Podcast Feed"
                        on={isEnabled}
                        onToggle={() => handleToggleSource(src.id)}
                      />
                    );
                  })}
                  <SourceItem
                    icon={<span style={{ fontSize: 18, color: "var(--muted)" }}>+</span>}
                    iconBg="var(--bg)"
                    name="Add Podcast Feed"
                    sub="RSS URL"
                    isDashed
                    onToggle={async () => {
                      const url = prompt("Enter Podcast RSS Feed URL:");
                      if (!url) return;
                      const res = await fetch("/api/signals/custom", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ url, type: "podcast" }),
                      });
                      if (res.ok) {
                        alert("Successfully registered custom podcast source!");
                        fetchCustomSources();
                        fetchEnabledSources();
                      } else {
                        const err = await res.json();
                        alert(`Failed: ${err.error || "Unknown error"}`);
                      }
                    }}
                  />
                </div>
              )}

              {/* Newsletters */}
              {signalTab === "newsletters" && (
                <div>
                  <div className="grid gap-[10px] mb-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                    {NEWSLETTER_SOURCES.map((src) => {
                      const isEnabled = enabledSources.has(src.id);
                      return (
                        <SourceItem
                          key={src.name} icon={src.icon} iconBg={src.iconBg} name={src.name} sub={src.sub}
                          on={isEnabled} iconFontSize={src.iconFontSize}
                          onToggle={() => handleToggleSource(src.id)}
                        />
                      );
                    })}
                    {customSources.filter(s => s.signal_schema?.type === "newsletter").map((src) => {
                      const isEnabled = enabledSources.has(src.id);
                      return (
                        <SourceItem
                          key={src.id} icon="📬" iconBg="rgba(243,156,18,.1)" name={src.name} sub="Custom Newsletter"
                          on={isEnabled}
                          onToggle={() => handleToggleSource(src.id)}
                        />
                      );
                    })}
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2" style={{ color: "var(--muted)" }}>Add Custom Substack / Newsletter</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newsletterInput}
                      onChange={(e) => setNewsletterInput(e.target.value)}
                      placeholder="Substack URL or newsletter email address..."
                      className="flex-1 px-3 py-[9px] rounded-[10px] text-[12px] outline-none"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-sora)" }}
                      onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--green)"; }}
                      onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "var(--border)"; }}
                    />
                    <button
                      onClick={async () => {
                        if (!newsletterInput.trim()) return;
                        const res = await fetch("/api/signals/custom", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ url: newsletterInput, type: "newsletter" }),
                        });
                        if (res.ok) {
                          alert("Successfully registered custom newsletter!");
                          setNewsletterInput("");
                          fetchCustomSources();
                          fetchEnabledSources();
                        } else {
                          const err = await res.json();
                          alert(`Failed: ${err.error || "Unknown error"}`);
                        }
                      }}
                      className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold transition-all duration-150 cursor-pointer"
                      style={{ background: "var(--green)", color: "#fff", border: "none" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green2)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green)"; }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Custom API Sessions */}
              {signalTab === "api" && (
                <div>
                  {/* Explainer */}
                  <div className="rounded-[12px] p-4 mb-5" style={{ background: "linear-gradient(135deg,rgba(74,144,217,.08),rgba(74,144,217,.04))", border: "1px solid rgba(74,144,217,.2)" }}>
                    <div className="flex gap-3">
                      <div className="text-[22px] flex-shrink-0">⚡</div>
                      <div>
                        <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--text)" }}>Custom Signal Sessions — How It Works</div>
                        <div className="text-[12px]" style={{ color: "var(--muted)", lineHeight: 1.7 }}>
                          Third-party data providers publish live signals (property listings, stock alerts, deal flows) to Smart Money via API. Your buddy remembers your goals from past conversations and{" "}
                          <strong style={{ color: "var(--text)" }}>proactively surfaces relevant signals</strong>{" "}
                          — like spotting a land listing in Ikoyi within your stated budget and opening a chat to ask if you want to act.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active sessions */}
                  <div className="text-[10px] font-semibold uppercase tracking-[.5px] mb-3" style={{ color: "var(--muted)" }}>Your Active Signal Sessions</div>
                  <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                    {/* Lagos Real Estate Radar */}
                    <div className="rounded-[12px] p-4" style={{ background: "var(--bg)", border: "2px solid rgba(0,196,140,.25)" }}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-[18px] flex items-center justify-center rounded-[8px] flex-shrink-0" style={{ width: 36, height: 36, background: "#E8F5E9" }}>🏠</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Lagos Real Estate Radar</div>
                          <div className="text-[11px]" style={{ color: "var(--muted)" }}>by Jide Taiwo & Co · Verified Provider</div>
                          <div className="text-[11px] font-semibold" style={{ color: "var(--green2)" }}>₦800/mo · Active</div>
                        </div>
                        <Toggle on={apiActive1} onToggle={() => setApiActive1((v) => !v)} aria-label="Lagos Real Estate Radar" />
                      </div>
                      <div className="text-[12px] mb-3" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                        Monitors Ikoyi, Lekki, Victoria Island, and Ajah for properties matching your stated budget and preferences. Fires when a new listing appears within 10% of your target price.
                      </div>
                      <div className="rounded-[8px] p-3 mb-3 text-[11px]" style={{ background: "rgba(0,196,140,.06)", border: "1px solid rgba(0,196,140,.15)", color: "var(--muted)", lineHeight: 1.6 }}>
                        <strong>🔔 Last signal · 2 hours ago</strong><br />
                        3-bedroom flat, Banana Island Road, Ikoyi · ₦185M asking · Within your ₦200M budget · Agent: Kunle Adeyemi
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-[11px]" style={{ color: "var(--muted)" }}>Signals this month: <strong>4</strong> · Acted on: <strong>1</strong></div>
                        <button className="text-[11px] font-medium px-3 py-[6px] rounded-[8px] border transition-all duration-150 cursor-pointer" style={{ color: "var(--muted)", borderColor: "var(--border)", background: "transparent" }}>Open in Chat →</button>
                      </div>
                    </div>

                    {/* NGX Stock Screener Pro */}
                    <div className="rounded-[12px] p-4" style={{ background: "var(--bg)", border: "2px solid rgba(0,196,140,.25)" }}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-[18px] flex items-center justify-center rounded-[8px] flex-shrink-0" style={{ width: 36, height: 36, background: "#E3F2FD" }}>📊</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>NGX Stock Screener Pro</div>
                          <div className="text-[11px]" style={{ color: "var(--muted)" }}>by Meristem Securities · Verified</div>
                          <div className="text-[11px] font-semibold" style={{ color: "var(--green2)" }}>₦1,200/mo · Active</div>
                        </div>
                        <Toggle on={apiActive2} onToggle={() => setApiActive2((v) => !v)} aria-label="NGX Stock Screener Pro" />
                      </div>
                      <div className="text-[12px] mb-3" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                        Monitors NGX for stocks matching your investment criteria — P/E below 10, dividend yield above 5%, sectors you've discussed with your buddy. Fires on entry opportunities.
                      </div>
                      <div className="rounded-[8px] p-3 mb-3 text-[11px]" style={{ background: "rgba(0,196,140,.06)", border: "1px solid rgba(0,196,140,.15)", color: "var(--muted)", lineHeight: 1.6 }}>
                        <strong>🔔 Last signal · Yesterday</strong><br />
                        GTCO — P/E: 3.2, Div Yield: 8.4% · Touched 52-week support · Matches "Nigerian bank stocks" you discussed Mar 12
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-[11px]" style={{ color: "var(--muted)" }}>Signals this month: <strong>7</strong> · Acted on: <strong>2</strong></div>
                        <button className="text-[11px] font-medium px-3 py-[6px] rounded-[8px] border transition-all duration-150 cursor-pointer" style={{ color: "var(--muted)", borderColor: "var(--border)", background: "transparent" }}>Open in Chat →</button>
                      </div>
                    </div>
                  </div>

                  {/* Discover more */}
                  <div className="text-[10px] font-semibold uppercase tracking-[.5px] mb-3" style={{ color: "var(--muted)" }}>Discover More Signal Sources</div>
                  <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                    {[
                      { icon: "₿", bg: "#FFF3E0", name: "Crypto DCA Signals", creator: "by Yellow Card · 2.3k users", price: "₦500/mo", desc: "Fires when BTC/ETH/BNB hit your DCA target prices based on past conversations about crypto allocation.", idx: 1 },
                      { icon: "🏦", bg: "#E8F5E9", name: "T-Bill Rate Alerts", creator: "by Stanbic IBTC · 5.1k users", price: "Free", desc: "Fires when T-bill yields move by more than 1%, helping you time your MMF and T-bill allocations.", idx: 2 },
                    ].map((item) => (
                      <div key={item.name} className="rounded-[12px] p-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                        <div className="flex items-start gap-3 mb-2">
                          <div className="text-[16px] flex items-center justify-center rounded-[8px] flex-shrink-0" style={{ width: 32, height: 32, background: item.bg }}>{item.icon}</div>
                          <div>
                            <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{item.name}</div>
                            <div className="text-[11px]" style={{ color: "var(--muted)" }}>{item.creator}</div>
                            <div className="text-[11px] font-semibold" style={{ color: "var(--green2)" }}>{item.price}</div>
                          </div>
                        </div>
                        <div className="text-[11px] mb-3" style={{ color: "var(--muted)", lineHeight: 1.5 }}>{item.desc}</div>
                        <button
                          onClick={() => item.idx === 1 ? setApiEnable1((v) => !v) : setApiEnable2((v) => !v)}
                          className="w-full py-[8px] rounded-[8px] text-[11px] font-semibold transition-all duration-150 cursor-pointer"
                          style={{
                            background: (item.idx === 1 ? apiEnable1 : apiEnable2) ? "var(--green)" : "transparent",
                            color: (item.idx === 1 ? apiEnable1 : apiEnable2) ? "#fff" : "var(--green)",
                            border: "1px solid var(--green)",
                          }}
                        >
                          {(item.idx === 1 ? apiEnable1 : apiEnable2) ? "✓ Enabled" : "Enable"}
                        </button>
                      </div>
                    ))}

                    {/* Browse all */}
                    <div className="rounded-[12px] p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-150" style={{ background: "var(--bg)", border: "1px dashed var(--border)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--green)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; }}>
                      <div className="text-[24px] mb-2">⚡</div>
                      <div className="text-[13px] font-semibold" style={{ color: "var(--muted)" }}>Browse All Signal Sources</div>
                      <div className="text-[11px]" style={{ color: "var(--border)" }}>140+ providers · All categories</div>
                    </div>
                  </div>

                  {/* For developers */}
                  <div className="rounded-[12px] p-4 flex items-start gap-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <div className="text-[20px] flex-shrink-0">🔌</div>
                    <div>
                      <div className="text-[13px] font-semibold mb-1" style={{ color: "var(--text)" }}>Publish Your Own Signal Source</div>
                      <div className="text-[12px] mb-3" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                        Have a data feed — property listings, stock screener, deal alerts? Publish it as a Signal Source. Set a subscription price. Users enable it in their DataBank. Your API fires signals; Smart Money routes them to the right buddy conversations. You earn per subscriber per month.
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button className="px-4 py-[8px] rounded-[8px] text-[11px] font-semibold cursor-pointer" style={{ background: "var(--green)", color: "#fff", border: "none" }}>Start in AI Studio →</button>
                        <button className="px-4 py-[8px] rounded-[8px] text-[11px] font-medium border cursor-pointer" style={{ color: "var(--muted)", borderColor: "var(--border)", background: "transparent" }}>Read API Docs</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ANALYTICS PANEL ── */}
        {tab === "analytics" && <AnalyticsDashboard />}
      </div>

      {/* ── OPEN BANKING CONNECTION OVERLAY MODAL ── */}
      {connectingBank && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center p-4"
          style={{ background: "rgba(11,30,61,.85)", backdropFilter: "blur(5px)" }}
        >
          <div
            className="w-full max-w-[420px] rounded-[20px] overflow-hidden p-6 flex flex-col gap-4 text-left"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 32px 80px rgba(0,0,0,.55)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <span className="text-[24px]">{connectingBank.emoji}</span>
                <span className="text-[16px] font-bold" style={{ color: "var(--text)" }}>
                  Connect to {connectingBank.name}
                </span>
              </div>
              <button
                disabled={modalLoading}
                onClick={() => setConnectingBank(null)}
                className="w-6 h-6 flex items-center justify-center rounded-[4px] cursor-pointer"
                style={{ background: "transparent", border: "none", color: "var(--muted)" }}
              >
                ×
              </button>
            </div>

            {/* STEP 1: Credentials Entry */}
            {connectStep === 1 && (
              <div className="flex flex-col gap-3">
                <div className="text-[12px]" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                  Smart Money uses CBN-approved Open Banking protocols. Login to your bank securely.
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[.5px] mb-1" style={{ color: "var(--muted)" }}>
                    Internet Banking User ID / Account Number
                  </div>
                  <input
                    type="text"
                    placeholder="Enter ID"
                    value={obUsername}
                    onChange={(e) => setObUsername(e.target.value)}
                    className="w-full px-3 py-[10px] rounded-[10px] text-[13px] outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-sora)" }}
                  />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[.5px] mb-1" style={{ color: "var(--muted)" }}>
                    Password / Internet Banking PIN
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={obPassword}
                    onChange={(e) => setObPassword(e.target.value)}
                    className="w-full px-3 py-[10px] rounded-[10px] text-[13px] outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-sora)" }}
                  />
                </div>
                <button
                  onClick={handleObConnectNext}
                  disabled={modalLoading}
                  className="w-full py-[11px] mt-2 rounded-[10px] text-[13px] font-semibold text-white cursor-pointer transition-all"
                  style={{ background: "var(--green)", border: "none", opacity: modalLoading ? 0.7 : 1 }}
                >
                  {modalLoading ? "Authenticating securely..." : "Connect Securely →"}
                </button>
              </div>
            )}

            {/* STEP 2: OTP Verification */}
            {connectStep === 2 && (
              <div className="flex flex-col gap-3">
                <div className="text-[12px]" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                  We sent a 6-digit verification code to the phone number ending in <strong>*4950</strong> linked with your {connectingBank.name} account.
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[.5px] mb-1" style={{ color: "var(--muted)" }}>
                    Verification Code (OTP)
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={obOtp}
                    onChange={(e) => setObOtp(e.target.value)}
                    className="w-full text-center tracking-[4px] px-3 py-[10px] rounded-[10px] text-[16px] font-bold outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-sora)" }}
                  />
                </div>
                <button
                  onClick={handleObVerifyOtp}
                  disabled={modalLoading}
                  className="w-full py-[11px] mt-2 rounded-[10px] text-[13px] font-semibold text-white cursor-pointer transition-all"
                  style={{ background: "var(--green)", border: "none", opacity: modalLoading ? 0.7 : 1 }}
                >
                  {modalLoading ? "Verifying..." : "Verify & Authorise Connection"}
                </button>
                <button
                  onClick={() => setConnectStep(1)}
                  disabled={modalLoading}
                  className="w-full py-[9px] rounded-[10px] text-[12px] font-medium border cursor-pointer"
                  style={{ color: "var(--muted)", borderColor: "var(--border)", background: "transparent" }}
                >
                  Back
                </button>
              </div>
            )}

            {/* STEP 3: Success Confirmation */}
            {connectStep === 3 && (
              <div className="flex flex-col items-center gap-4 text-center py-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-[28px] text-white"
                  style={{ background: "var(--green)" }}
                >
                  ✓
                </div>
                <div>
                  <div className="text-[16px] font-bold" style={{ color: "var(--text)" }}>
                    {connectingBank.name} Connected!
                  </div>
                  <div className="text-[12px] mt-1 px-2" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                    Smart Money has successfully connected to {connectingBank.name} under CBN Open Banking guidelines.
                  </div>
                </div>
                <button
                  onClick={() => {
                    setConnectingBank(null);
                    fetchEnabledSources();
                  }}
                  className="w-full py-[11px] mt-2 rounded-[10px] text-[13px] font-semibold text-white cursor-pointer"
                  style={{ background: "var(--green)", border: "none" }}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
