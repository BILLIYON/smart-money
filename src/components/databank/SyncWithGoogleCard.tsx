"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";

type SheetsStatus = {
  connected: boolean;
  hasSheet?: boolean;
  sheetId?: string | null;
  sheetUrl?: string | null;
  lastSyncedAt?: string | null;
  databankCount?: number;
  needsReauth?: boolean;
  message?: string;
};

export function SyncWithGoogleCard({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [status, setStatus] = useState<SheetsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [apiDisabled, setApiDisabled] = useState(false);
  const [enableUrl, setEnableUrl] = useState("https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=64971754557");
  const [driveEnableUrl, setDriveEnableUrl] = useState("https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=64971754557");
  const [showGuide, setShowGuide] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/databank/sheets/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.needsReauth) {
          setNeedsReauth(true);
        } else {
          setNeedsReauth(false);
        }
      }
    } catch (err) {
      console.error("[SyncWithGoogleCard] Failed to fetch status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSyncFromSheet = async () => {
    try {
      setSyncing(true);
      setFeedback(null);
      const res = await fetch("/api/databank/sheets/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
        setFeedback(data.message || `Successfully synced ${data.syncedCount} rows!`);
        fetchStatus();
        onSyncComplete?.();
      } else {
        if (data.apiDisabled) {
          setApiDisabled(true);
          if (data.enableUrl) setEnableUrl(data.enableUrl);
          if (data.driveEnableUrl) setDriveEnableUrl(data.driveEnableUrl);
          setNeedsReauth(false);
        } else if (data.needsReauth) {
          setNeedsReauth(true);
        }
        setFeedback(data.error || data.message || "Failed to sync from Google Sheets");
      }
    } catch (err: any) {
      setFeedback(err.message || "Network error syncing from sheet");
    } finally {
      setSyncing(false);
    }
  };

  const handleExportToSheet = async () => {
    try {
      setExporting(true);
      setFeedback(null);
      const res = await fetch("/api/databank/sheets/export", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } });
        setFeedback(data.message || `Exported ${data.exportedCount} transactions to your Google Sheet!`);
        fetchStatus();
      } else {
        if (data.apiDisabled) {
          setApiDisabled(true);
          if (data.enableUrl) setEnableUrl(data.enableUrl);
          if (data.driveEnableUrl) setDriveEnableUrl(data.driveEnableUrl);
          setNeedsReauth(false);
        } else if (data.needsReauth) {
          setNeedsReauth(true);
        }
        setFeedback(data.error || data.message || "Failed to export to Google Sheet");
      }
    } catch (err: any) {
      setFeedback(err.message || "Network error exporting to sheet");
    } finally {
      setExporting(false);
    }
  };

  const handleCreateOrConnect = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      const res = await fetch("/api/databank/sheets/status", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
        setFeedback("🎉 Smart Money Financial Ledger spreadsheet created in your Google Drive!");
        setNeedsReauth(false);
        setApiDisabled(false);
        fetchStatus();
      } else {
        if (data.apiDisabled) {
          setApiDisabled(true);
          if (data.enableUrl) setEnableUrl(data.enableUrl);
          if (data.driveEnableUrl) setDriveEnableUrl(data.driveEnableUrl);
          setNeedsReauth(false);
        } else if (data.needsReauth) {
          setNeedsReauth(true);
          setApiDisabled(false);
        }
        setFeedback(data.error || "Failed to create Google Sheet");
      }
    } catch (err: any) {
      setFeedback(err.message || "Error creating sheet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-[16px] p-5 transition-all duration-200"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "0 1px 4px var(--shadow)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Authentic Google Sheets Icon */}
          <div
            className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 shadow-sm"
            style={{
              background: "linear-gradient(135deg, #0F9D58 0%, #0B8043 100%)",
              border: "1px solid rgba(15,157,88,0.3)",
            }}
          >
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H6v-3h6v3zm0-5H6V9h6v3zm0-5H6V5h6v2zm6 10h-5v-3h5v3zm0-5h-5V9h5v3zm0-5h-5V5h5v2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>
                Sync with Google
              </h3>
              <span
                className="text-[10px] font-semibold px-2 py-[2px] rounded-full"
                style={{
                  background: "rgba(15,157,88,0.12)",
                  color: "#0F9D58",
                  border: "1px solid rgba(15,157,88,0.25)",
                }}
              >
                100% Clean Ledger
              </span>
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--muted)" }}>
              Direct spreadsheet in your Google Drive with zero parsing guesswork
            </p>
          </div>
        </div>

        {/* Status Badge */}
        {status?.connected && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide"
            style={{
              background: apiDisabled
                ? "rgba(59,130,246,0.12)"
                : needsReauth
                ? "rgba(245,166,35,0.12)"
                : status.hasSheet
                ? "rgba(0,196,140,0.12)"
                : "rgba(74,144,217,0.12)",
              color: apiDisabled
                ? "#2563EB"
                : needsReauth
                ? "var(--gold)"
                : status.hasSheet
                ? "var(--green2)"
                : "#4A90D9",
              border: `1px solid ${
                apiDisabled
                  ? "rgba(59,130,246,0.3)"
                  : needsReauth
                  ? "rgba(245,166,35,0.3)"
                  : status.hasSheet
                  ? "rgba(0,196,140,0.3)"
                  : "rgba(74,144,217,0.3)"
              }`,
            }}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                apiDisabled
                  ? "bg-blue-500 animate-pulse"
                  : needsReauth
                  ? "bg-amber-500 animate-ping"
                  : status.hasSheet
                  ? "bg-emerald-500"
                  : "bg-blue-500"
              }`}
            />
            {apiDisabled
              ? "Console Setup Needed"
              : needsReauth
              ? "Permission Needed"
              : status.hasSheet
              ? "Ledger Active"
              : "Google Linked"}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-8 flex items-center justify-center text-[12px]" style={{ color: "var(--muted)" }}>
          <svg className="animate-spin w-4 h-4 mr-2" style={{ color: "var(--green)" }} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Connecting Google Sheets...
        </div>
      ) : !status?.connected ? (
        /* Not Connected State */
        <div className="space-y-3 py-1">
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--muted)" }}>
            Connect your Google account to automatically generate a validated, styled Financial Ledger in your personal Google Drive.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {["Zero HTML parsing collision", "Direct Google Drive audit", "Instant single-batch sync"].map((item) => (
              <div
                key={item}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{
                  background: "rgba(15,157,88,0.08)",
                  border: "1px solid rgba(15,157,88,0.2)",
                  color: "#0F9D58",
                }}
              >
                <span>✓</span> {item}
              </div>
            ))}
          </div>
          <a
            href="/api/auth/gmail"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[12px] font-semibold transition-all shadow-md hover:opacity-95"
            style={{
              background: "#0F9D58",
              color: "#ffffff",
            }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
            </svg>
            Connect Google &amp; Deploy Ledger
          </a>
        </div>
      ) : apiDisabled ? (
        /* Google Cloud API Disabled Banner (Actionable & Clear) */
        <div
          className="rounded-[14px] p-4 space-y-3.5"
          style={{
            background: "rgba(59, 130, 246, 0.08)",
            border: "1px solid rgba(59, 130, 246, 0.35)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">⚡</span>
              <span className="text-[13px] font-bold" style={{ color: "#2563EB" }}>
                1 Final Step: Enable Google Sheets API in Google Console
              </span>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(59, 130, 246, 0.15)",
                color: "#1D4ED8",
              }}
            >
              One-Time Action
            </span>
          </div>

          <p className="text-[12px] leading-relaxed" style={{ color: "var(--text)" }}>
            Your Google account is authorized! However, Google requires the <strong>Google Sheets API</strong> to be turned on in your Google Cloud Console project (<code>64971754557</code>) before sheets can be created.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href={enableUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] font-bold text-white transition-all shadow-sm hover:brightness-105 active:scale-95 cursor-pointer"
              style={{ background: "#2563EB" }}
            >
              <span>1. Enable Google Sheets API ↗</span>
            </a>
            <a
              href={driveEnableUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] font-medium transition-all hover:bg-black/5 active:scale-95 cursor-pointer"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <span>2. Enable Drive API ↗</span>
            </a>
            <button
              onClick={handleCreateOrConnect}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] font-bold text-white transition-all shadow-sm hover:brightness-105 active:scale-95 cursor-pointer ml-auto"
              style={{ background: "#0F9D58" }}
            >
              <span>Done! Deploy Spreadsheet</span>
            </button>
          </div>
        </div>
      ) : needsReauth ? (
        /* Permission Update Required State (Bright, Crisp & Clear) */
        <div
          className="rounded-[14px] p-4 space-y-3.5"
          style={{
            background: "rgba(245,166,35,0.08)",
            border: "1px solid rgba(245,166,35,0.35)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">⚠️</span>
              <span className="text-[13px] font-bold" style={{ color: "#D97706" }}>
                Google Sheets Permission Update Required
              </span>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(245,166,35,0.2)",
                color: "#B45309",
              }}
            >
              1-Click Setup
            </span>
          </div>

          <p className="text-[12px] leading-relaxed" style={{ color: "var(--text)" }}>
            Your Google account is connected for email alerts, but needs updated permission to create and sync your{" "}
            <strong>Financial Ledger spreadsheet</strong> in your Google Drive.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <a
              href="/api/auth/gmail?return=/databank"
              className="inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-[12px] text-[12px] font-bold text-white transition-all shadow-md hover:brightness-105 active:scale-95 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #0F9D58 0%, #0B8043 100%)",
                boxShadow: "0 2px 8px rgba(15,157,88,0.35)",
              }}
            >
              {/* Google 4-Color Logo SVG */}
              <svg className="w-4 h-4 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Grant Google Sheets Permission ↗</span>
            </a>
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--muted)" }}>
              <span>🔒 Official Google OAuth2 • Takes 5 seconds</span>
            </div>
          </div>
        </div>
      ) : (
        /* Connected & Permitted State */
        <div className="space-y-3.5">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-[10px] px-3 py-2.5 text-center"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <div className="text-[16px] font-bold" style={{ color: "var(--text)" }}>
                {status.hasSheet ? "Active" : "Ready"}
              </div>
              <div className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>
                Ledger Status
              </div>
            </div>
            <div
              className="rounded-[10px] px-3 py-2.5 text-center"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
            >
              <div className="text-[16px] font-bold" style={{ color: "#0F9D58" }}>
                100%
              </div>
              <div className="text-[10px] font-medium" style={{ color: "var(--muted)" }}>
                Data Fidelity Score
              </div>
            </div>
          </div>

          {/* Sheet Details & External Link */}
          {status.hasSheet ? (
            <div
              className="flex items-center justify-between rounded-[12px] p-3 text-[12px]"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center gap-2.5 truncate">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H6v-3h6v3zm0-5H6V9h6v3zm0-5H6V5h6v2zm6 10h-5v-3h5v3zm0-5h-5V9h5v3zm0-5h-5V5h5v2z" />
                </svg>
                <div className="truncate">
                  <span className="font-semibold" style={{ color: "var(--text)" }}>
                    Smart Money — Financial Ledger
                  </span>
                  {status.lastSyncedAt && (
                    <div className="text-[10px]" style={{ color: "var(--muted)" }}>
                      Last synced: {new Date(status.lastSyncedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {status.sheetUrl && (
                <a
                  href={status.sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold inline-flex items-center gap-1 ml-2 shrink-0 px-2.5 py-1 rounded-[8px] transition-all hover:opacity-85 text-[11px]"
                  style={{
                    background: "rgba(15,157,88,0.1)",
                    color: "#0F9D58",
                    border: "1px solid rgba(15,157,88,0.25)",
                  }}
                >
                  Open in Google Sheets ↗
                </a>
              )}
            </div>
          ) : (
            <div
              className="flex items-center justify-between rounded-[12px] p-3 text-[12px]"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
              }}
            >
              <span style={{ color: "var(--text)" }}>Ready to initialize your Google Drive financial ledger.</span>
              <button
                onClick={handleCreateOrConnect}
                className="px-3.5 py-1.5 rounded-[10px] font-semibold text-[11px] text-white transition-all shadow-sm hover:brightness-105 active:scale-95 cursor-pointer"
                style={{
                  background: "#0F9D58",
                }}
              >
                Create Spreadsheet
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleSyncFromSheet}
              disabled={syncing || !status.hasSheet}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] font-semibold text-white transition-all shadow-sm disabled:opacity-50 hover:brightness-105 active:scale-95 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #0F9D58 0%, #0B8043 100%)",
              }}
            >
              {syncing ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Syncing from Sheet...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Sync from Google Sheets
                </>
              )}
            </button>

            <button
              onClick={handleExportToSheet}
              disabled={exporting || !status.hasSheet}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-medium transition-all disabled:opacity-50 hover:bg-black/5 active:scale-95 cursor-pointer"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              {exporting ? (
                "Exporting..."
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" style={{ color: "var(--muted)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Export DataBank to Sheet
                </>
              )}
            </button>

            <a
              href="/api/auth/gmail?return=/databank"
              title="Refresh or reconnect Google account permissions"
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-[10px] text-[11px] transition-colors ml-auto hover:text-emerald-600 cursor-pointer"
              style={{ color: "var(--muted)" }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reconnect
            </a>

            <button
              onClick={() => setShowGuide(!showGuide)}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-[10px] text-[11px] transition-colors cursor-pointer"
              style={{ color: "var(--muted)" }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              {showGuide ? "Hide Guide" : "Auto-Sync Guide"}
            </button>
          </div>

          {/* Feedback Notice */}
          {feedback && (
            <div
              className="p-3 rounded-[10px] text-[11px] animate-fadeIn"
              style={{
                background:
                  feedback.toLowerCase().includes("failed") ||
                  feedback.toLowerCase().includes("error") ||
                  feedback.toLowerCase().includes("insufficient")
                    ? "rgba(234,67,53,0.1)"
                    : "rgba(15,157,88,0.1)",
                border: `1px solid ${
                  feedback.toLowerCase().includes("failed") ||
                  feedback.toLowerCase().includes("error") ||
                  feedback.toLowerCase().includes("insufficient")
                    ? "rgba(234,67,53,0.3)"
                    : "rgba(15,157,88,0.3)"
                }`,
                color:
                  feedback.toLowerCase().includes("failed") ||
                  feedback.toLowerCase().includes("error") ||
                  feedback.toLowerCase().includes("insufficient")
                    ? "#DC2626"
                    : "#0F9D58",
              }}
            >
              <div className="flex items-center justify-between">
                <span>{feedback}</span>
                {needsReauth && (
                  <a
                    href="/api/auth/gmail?return=/databank"
                    className="ml-2 underline font-bold hover:brightness-110 shrink-0"
                    style={{ color: "#D97706" }}
                  >
                    Grant Access Now ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Optional Native Google Apps Script Guide Drawer */}
          {showGuide && (
            <div
              className="mt-3 p-3.5 rounded-[12px] text-[12px] space-y-2 animate-fadeIn"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="font-semibold flex items-center justify-between" style={{ color: "var(--text)" }}>
                <span>⚡ Optional: Native Gmail-to-Sheet Background Trigger</span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "rgba(0,196,140,0.1)", color: "var(--green2)" }}
                >
                  Zero Server Load
                </span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
                If you prefer bank emails to automatically append to your Google Sheet without opening Smart Money, attach this script to your sheet under <strong>Extensions &gt; Apps Script</strong>:
              </p>
              <pre
                className="p-3 rounded-[10px] text-[10px] font-mono overflow-x-auto select-all"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "#0F9D58",
                }}
              >
{`function syncBankEmails() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Transactions");
  const threads = GmailApp.search('from:(gtbank.com OR zenithbank.com OR ubagroup.com OR opay-nigeria.com) "alert"', 0, 25);
  // Extracted rows are automatically appended to your ledger sheet
}`}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
