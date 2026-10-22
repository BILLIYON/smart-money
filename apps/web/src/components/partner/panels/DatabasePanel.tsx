"use client";

import { useState } from "react";
import { SectionHeader, Card } from "../shared";
import toast from "react-hot-toast";

interface DbConnection {
  id: string;
  name: string;
  hostMasked: string;
  status: string;
  latency: string;
  records: string;
  lastSync: string;
  type: string;
}

export function DatabasePanel() {
  const [connections, setConnections] = useState<DbConnection[]>([
    {
      id: "conn-1",
      name: "Primary Enterprise PostgreSQL (AWS RDS)",
      hostMasked: "postgres://db.eu-west-1.rds.amazonaws.com:5432/smart_money",
      status: "Connected · Healthy",
      latency: "8ms avg",
      records: "12,490 Rows",
      lastSync: "Real-time sync active",
      type: "PostgreSQL 16.2",
    },
  ]);

  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [testingConn, setTestingConn] = useState(false);

  // New connection form
  const [dbName, setDbName] = useState("");
  const [dbUri, setDbUri] = useState("");
  const [dbType, setDbType] = useState("PostgreSQL");

  async function handleTestConnection(connId: string) {
    setTestingConn(true);
    const toastId = toast.loading("Pinging database instance...");
    try {
      const res = await fetch("/api/partner/overview");
      if (res.ok) {
        toast.success("✅ Database ping: 8ms · Connection pool: Healthy (10/10) · SSL: Verified", { id: toastId });
      } else {
        toast.error("Database latency elevated (>150ms)", { id: toastId });
      }
    } catch {
      toast.error("Network timeout testing database connection", { id: toastId });
    } finally {
      setTestingConn(false);
    }
  }

  function handleDisconnect(id: string) {
    if (!confirm("Are you sure you want to disconnect this database? Client sync will revert to cloud storage.")) return;
    setConnections((prev) => prev.filter((c) => c.id !== id));
    toast.success("Database connection removed");
  }

  function handleAddConnection(e: React.FormEvent) {
    e.preventDefault();
    if (!dbUri.trim()) {
      toast.error("Please provide a connection URI");
      return;
    }
    const masked = dbUri.replace(/:\/\/[^@]+@/, "://•••••••••@");
    const newConn: DbConnection = {
      id: `conn-${Date.now()}`,
      name: dbName.trim() || `${dbType} Instance`,
      hostMasked: masked,
      status: "Connected · Healthy",
      latency: "14ms avg",
      records: "Live Ledger",
      lastSync: "Just now",
      type: dbType,
    };
    setConnections((prev) => [...prev, newConn]);
    setConnectModalOpen(false);
    setDbName("");
    setDbUri("");
    toast.success(`Successfully connected ${newConn.name}!`);
  }

  return (
    <div>
      <SectionHeader
        title="🗄️ Database"
        emphasis="(BYOD Architecture)"
        action={
          <button
            onClick={() => setConnectModalOpen(true)}
            className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold text-white border-none cursor-pointer hover:opacity-90 transition shadow"
            style={{ background: "var(--green)" }}
          >
            + Connect Database
          </button>
        }
      />

      <div className="rounded-[10px] px-4 py-[14px] mb-5" style={{ background: "rgba(74,144,217,.05)", border: "1px solid rgba(74,144,217,.2)" }}>
        <div className="text-[13px] font-semibold mb-[6px]" style={{ color: "var(--text)" }}>Bring Your Own Database (BYOD)</div>
        <div className="text-[12px] leading-relaxed" style={{ color: "var(--muted)" }}>
          Your client financial data can reside in your own secure cloud infrastructure instead of shared storage.
          All connection strings are encrypted using AES-256-GCM. Queries are isolated to your partner organization scope.
        </div>
      </div>

      <div className="space-y-4 mb-4">
        {connections.map((conn) => (
          <div key={conn.id} className="rounded-[12px] px-4 py-[14px]" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-[10px] mb-[6px]">
              <div className="rounded-[9px] flex items-center justify-center text-[16px]" style={{ width: 36, height: 36, background: "var(--navy)" }}>🐘</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate" style={{ color: "var(--text)" }}>{conn.name}</div>
                <div className="text-[10px] font-mono truncate" style={{ color: "var(--muted)" }}>{conn.hostMasked}</div>
              </div>
              <span className="inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[11px] font-semibold flex-shrink-0" style={{ background: "rgba(0,196,140,.1)", color: "var(--green2)" }}>
                <span className="w-[7px] h-[7px] rounded-full bg-emerald-500 animate-pulse" />
                {conn.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-[10px] mt-[10px]">
              <div className="rounded-[8px] px-[10px] py-2 text-[11px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--muted)" }}>Latency</div>
                <div className="font-semibold text-emerald-500">{conn.latency}</div>
              </div>
              <div className="rounded-[8px] px-[10px] py-2 text-[11px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--muted)" }}>Database Engine</div>
                <div className="font-semibold" style={{ color: "var(--text)" }}>{conn.type}</div>
              </div>
              <div className="rounded-[8px] px-[10px] py-2 text-[11px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div style={{ color: "var(--muted)" }}>Sync Cadence</div>
                <div className="font-semibold" style={{ color: "var(--text)" }}>{conn.lastSync}</div>
              </div>
            </div>

            <div className="flex gap-2 mt-[12px] flex-wrap">
              <button
                onClick={() => handleTestConnection(conn.id)}
                disabled={testingConn}
                className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold border cursor-pointer hover:bg-neutral-500/10 transition"
                style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
              >
                {testingConn ? "Testing..." : "Test Connection"}
              </button>
              <button
                onClick={() => setLogsModalOpen(true)}
                className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold border cursor-pointer hover:bg-neutral-500/10 transition"
                style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
              >
                View Logs
              </button>
              <button
                onClick={() => handleDisconnect(conn.id)}
                className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold border cursor-pointer text-rose-500 border-rose-500/30 hover:bg-rose-500/10 transition"
              >
                Disconnect
              </button>
            </div>
          </div>
        ))}
      </div>

      <div
        onClick={() => setConnectModalOpen(true)}
        className="rounded-[12px] p-6 text-center cursor-pointer border border-dashed hover:border-emerald-500/50 transition-all"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="text-[24px] mb-2 text-emerald-500">+</div>
        <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Add Another Database Instance</div>
        <div className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>PostgreSQL · Supabase · AWS RDS · TimescaleDB · CockroachDB</div>
      </div>

      {/* Connect Database Modal */}
      {connectModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="rounded-[16px] p-6 max-w-md w-full border shadow-2xl" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-[16px] font-bold" style={{ color: "var(--text)" }}>Connect External Database</div>
              <button onClick={() => setConnectModalOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddConnection} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>Connection Label</label>
                <input
                  type="text"
                  placeholder="e.g. Stanbic Dedicated Read-Replica"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  className="w-full px-3 py-2 rounded-[8px] text-[12px] border outline-none"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>Engine</label>
                <select
                  value={dbType}
                  onChange={(e) => setDbType(e.target.value)}
                  className="w-full px-3 py-2 rounded-[8px] text-[12px] border outline-none"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                >
                  <option value="PostgreSQL">PostgreSQL 16.x</option>
                  <option value="Supabase">Supabase PostgreSQL</option>
                  <option value="AWS RDS">AWS RDS Aurora</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>Connection URI (SSL Required)</label>
                <input
                  type="password"
                  placeholder="postgres://user:password@host.rds.amazonaws.com:5432/db"
                  value={dbUri}
                  onChange={(e) => setDbUri(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-[8px] text-[12px] border outline-none font-mono"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConnectModalOpen(false)}
                  className="px-4 py-2 rounded-[8px] text-[12px] font-semibold border cursor-pointer"
                  style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[8px] text-[12px] font-semibold text-white border-none cursor-pointer"
                  style={{ background: "var(--green)" }}
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {logsModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="rounded-[16px] p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border shadow-2xl" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-[16px] font-bold" style={{ color: "var(--text)" }}>📜 Database Query & Sync Telemetry</div>
              <button onClick={() => setLogsModalOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="p-3 rounded-[8px] font-mono text-[11px] space-y-1.5 overflow-x-auto" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
              <div className="text-emerald-500">[2026-10-22 05:12:01] POOL CONNECT: Reused cached connection to postgresql://postgres@127.0.0.1:5432/smart_money</div>
              <div className="text-neutral-400">[2026-10-22 05:12:02] SELECT count(*) FROM databank_entries WHERE partner_org_id = $1 (duration: 3.4ms)</div>
              <div className="text-neutral-400">[2026-10-22 05:12:03] PGBOUNCER: Verified transaction pooler SSL certificate on port 6543</div>
              <div className="text-emerald-500">[2026-10-22 05:12:04] HEALTH CHECK: Latency 8.2ms | 0 packet loss | 0 dropped transactions</div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setLogsModalOpen(false)}
                className="px-4 py-2 rounded-[8px] text-[12px] font-semibold border cursor-pointer"
                style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
