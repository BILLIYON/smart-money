"use client";

import { useState, useEffect } from "react";
import { SectionHeader, Card } from "../shared";
import toast from "react-hot-toast";

export interface ApiEndpoint {
  method: "GET" | "POST" | "PATCH";
  path: string;
  desc: string;
  params: { name: string; type: string; req?: string; desc: string }[];
  example?: string;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: "GET",
    path: "/api/v1/partner/clients",
    desc: "List all connected clients with pagination and consent scopes",
    params: [
      { name: "status", type: "string", req: "optional", desc: "Filter by: active | needs_attention" },
      { name: "search", type: "string", req: "optional", desc: "Search by client name or email" },
    ],
    example: `{"clients": [{"id": "c-1","name": "Move-E","email": "johnadeolu2@gmail.com","dataShared": "3 of 5 scopes"}]}`,
  },
  {
    method: "GET",
    path: "/api/v1/partner/overview",
    desc: "Live aggregated firm KPIs, active client counts and attention queues",
    params: [
      { name: "orgId", type: "uuid", req: "optional", desc: "Institutional firm ID" },
    ],
    example: `{"kpis": [{"label": "Total Clients", "value": "1"}, {"label": "Pending Approvals", "value": "0"}]}`,
  },
  {
    method: "POST",
    path: "/api/v1/partner/goals",
    desc: "Propose an advisory milestone to a connected client's Goal Tracker",
    params: [
      { name: "userId", type: "uuid", req: "required", desc: "Client user ID" },
      { name: "title", type: "string", req: "required", desc: "Goal name shown to client" },
      { name: "targetAmount", type: "integer", req: "required", desc: "Target amount in Naira" },
      { name: "advisorNote", type: "string", req: "optional", desc: "Advisory rationale shown to client" },
    ],
    example: `{"success": true, "goalId": "g-9201", "status": "pending_client_acceptance"}`,
  },
  {
    method: "POST",
    path: "/api/v1/partner/opportunities",
    desc: "Dispatch time-sensitive investment or rate opportunities to clients",
    params: [
      { name: "title", type: "string", req: "required", desc: "Opportunity title" },
      { name: "category", type: "string", req: "required", desc: "Rate Alert | Investment | Real Estate" },
      { name: "reasoning", type: "string", req: "required", desc: "Financial rationale" },
      { name: "targetUserId", type: "uuid", req: "optional", desc: "Target specific client or broadcast to all" },
    ],
    example: `{"success": true, "opportunityId": "opp-4019", "delivered": 1}`,
  },
  {
    method: "PATCH",
    path: "/api/v1/partner/approvals/:id",
    desc: "Sign-off and execute or decline a pending client agent action",
    params: [
      { name: "decision", type: "string", req: "required", desc: "approve | decline" },
      { name: "note", type: "string", req: "optional", desc: "Reason for decline or sign-off comment" },
    ],
    example: `{"success": true, "actionId": "act-1092", "status": "executed"}`,
  },
  {
    method: "POST",
    path: "/api/v1/partner/webhooks/register",
    desc: "Register a webhook URL for real-time ledger & escalation events",
    params: [
      { name: "url", type: "string", req: "required", desc: "HTTPS webhook endpoint" },
      { name: "events", type: "string[]", req: "required", desc: "Event topics e.g. client.joined, action.pending" },
    ],
    example: `{"success": true, "webhookId": "wh-3109", "secret": "whsec_..."}`,
  },
];

const METHOD_STYLES: Record<ApiEndpoint["method"], { bg: string; color: string }> = {
  GET: { bg: "rgba(0,196,140,.12)", color: "var(--green2)" },
  POST: { bg: "rgba(74,144,217,.12)", color: "#4A90D9" },
  PATCH: { bg: "rgba(245,166,35,.12)", color: "#C47F00" },
};

function EndpointCard({ ep }: { ep: ApiEndpoint }) {
  const [open, setOpen] = useState(false);
  const m = METHOD_STYLES[ep.method];
  return (
    <div className="rounded-[12px] overflow-hidden mb-[10px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div onClick={() => setOpen(!open)} className="flex items-center gap-3 px-4 py-[14px] cursor-pointer hover:bg-neutral-500/5 transition">
        <span className="px-[9px] py-1 rounded-[6px] text-[11px] font-bold" style={{ background: m.bg, color: m.color, fontFamily: "monospace" }}>{ep.method}</span>
        <span className="text-[13px] font-semibold" style={{ color: "var(--text)", fontFamily: "monospace" }}>{ep.path}</span>
        <span className="text-[12px] ml-auto hidden sm:inline" style={{ color: "var(--muted)" }}>{ep.desc}</span>
        <span style={{ color: "var(--muted)", fontSize: 16 }}>{open ? "˅" : "›"}</span>
      </div>
      {open && (
        <div className="px-[18px] py-4" style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
          <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2" style={{ color: "var(--muted)" }}>
            {ep.method === "GET" ? "Query Parameters" : ep.path.includes("webhooks") ? "Available Event Types" : "Request Body"}
          </div>
          {ep.params.map((p) => (
            <div key={p.name} className="flex flex-wrap items-start gap-[10px] py-[7px] text-[12px]" style={{ borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#4A90D9", minWidth: 150 }}>{p.name}</span>
              <span style={{ color: "var(--gold)", minWidth: 60 }}>{p.type}</span>
              {p.req && <span style={{ color: "#E24B4A", fontSize: 10, fontWeight: 600, minWidth: 50 }}>{p.req}</span>}
              <span style={{ color: "var(--muted)", flex: 1 }}>{p.desc}</span>
            </div>
          ))}
          {ep.example && (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-[.5px] mt-3 mb-2" style={{ color: "var(--muted)" }}>Example Response</div>
              <div className="rounded-[8px] px-[14px] py-3 text-[12px] overflow-x-auto" style={{ background: "var(--card)", border: "1px solid var(--border)", fontFamily: "monospace", color: "var(--text)" }}>
                {ep.example}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ApiPanel() {
  const [activeKey, setActiveKey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rawKeyModal, setRawKeyModal] = useState<string | null>(null);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Webhook state
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [registeringWebhook, setRegisteringWebhook] = useState(false);

  useEffect(() => {
    loadKeyAndWebhooks();
  }, []);

  async function loadKeyAndWebhooks() {
    setLoading(true);
    try {
      const [kRes, wRes] = await Promise.all([
        fetch("/api/partner/keys"),
        fetch("/api/partner/webhooks"),
      ]);
      if (kRes.ok) {
        const kData = await kRes.json();
        setActiveKey(kData.activeKey || null);
      }
      if (wRes.ok) {
        const wData = await wRes.json();
        setWebhooks(wData.webhooks || []);
      }
    } catch (e) {
      console.warn("Failed to load partner API state:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateKey() {
    if (activeKey && !confirm("Generating a new API key will immediately revoke your existing key. Do you want to proceed?")) {
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/partner/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Primary Production Advisory Key" }),
      });
      const data = await res.json();
      if (res.ok && data.apiKey) {
        setActiveKey(data.keyRecord);
        setRawKeyModal(data.apiKey);
        toast.success("API key generated successfully!");
      } else {
        toast.error(data.error || "Failed to generate API key");
      }
    } catch {
      toast.error("Network error generating API key");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevokeKey() {
    if (!confirm("Are you sure you want to revoke this API key? All external B2B integrations using it will immediately fail.")) {
      return;
    }
    try {
      const res = await fetch("/api/partner/keys", { method: "DELETE" });
      if (res.ok) {
        setActiveKey(null);
        toast.success("API key revoked");
      }
    } catch {
      toast.error("Failed to revoke API key");
    }
  }

  async function handleRegisterWebhook(e: React.FormEvent) {
    e.preventDefault();
    if (!webhookUrl.trim().startsWith("http")) {
      toast.error("Please enter a valid HTTP/HTTPS webhook URL");
      return;
    }
    setRegisteringWebhook(true);
    try {
      const res = await fetch("/api/partner/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl.trim(),
          events: ["action.pending", "goal.accepted", "client.joined"],
        }),
      });
      const data = await res.json();
      if (res.ok && data.webhook) {
        setWebhooks((prev) => [data.webhook, ...prev]);
        setWebhookUrl("");
        toast.success("Webhook URL registered and verified!");
      } else {
        toast.error(data.error || "Failed to register webhook");
      }
    } catch {
      toast.error("Error registering webhook");
    } finally {
      setRegisteringWebhook(false);
    }
  }

  return (
    <div>
      <SectionHeader
        title="📡 API &"
        emphasis="Documentation"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setDocsModalOpen(true)}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold border cursor-pointer hover:bg-neutral-500/10 transition"
              style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
            >
              Full Docs ↗
            </button>
            <button
              onClick={handleGenerateKey}
              disabled={generating}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold text-white border-none cursor-pointer hover:opacity-90 transition disabled:opacity-50"
              style={{ background: "var(--green)" }}
            >
              {generating ? "Generating..." : activeKey ? "Rotate API Key" : "Generate API Key"}
            </button>
          </div>
        }
      />

      {/* Key & Base URL Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div className="rounded-[12px] px-4 py-[14px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="text-[11px] uppercase tracking-[.5px] mb-[6px]" style={{ color: "var(--muted)" }}>Active Production API Key</div>
          <div className="text-[13px] mb-2 font-mono" style={{ color: activeKey ? "var(--green2)" : "var(--muted)" }}>
            {loading ? "Checking database..." : activeKey ? activeKey.key_prefix : "No key generated yet"}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateKey}
              disabled={generating}
              className="px-3 py-[6px] rounded-[8px] text-[11px] font-semibold border cursor-pointer hover:bg-neutral-500/10 transition"
              style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
            >
              {activeKey ? "Regenerate" : "Generate"}
            </button>
            {activeKey && (
              <button
                onClick={handleRevokeKey}
                className="px-3 py-[6px] rounded-[8px] text-[11px] font-semibold border cursor-pointer text-rose-500 border-rose-500/30 hover:bg-rose-500/10 transition"
              >
                Revoke Key
              </button>
            )}
          </div>
        </div>

        <div className="rounded-[12px] px-4 py-[14px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="text-[11px] uppercase tracking-[.5px] mb-[6px]" style={{ color: "var(--muted)" }}>Base URL & Authentication</div>
          <div className="text-[13px] mb-1 font-mono" style={{ color: "var(--text)" }}>
            https://api.smartmoney.technology/v1/partner/
          </div>
          <div className="text-[11px]" style={{ color: "var(--muted)" }}>
            Rate limit: 1,000 req/min · Header: <code className="text-emerald-500">Authorization: Bearer sm_live_...</code>
          </div>
        </div>
      </div>

      {/* Webhooks Section */}
      <Card className="mb-6">
        <div className="text-[14px] font-semibold mb-1" style={{ color: "var(--text)" }}>🔗 Real-time Webhooks</div>
        <div className="text-[12px] mb-4" style={{ color: "var(--muted)" }}>
          Receive HTTP POST event notifications whenever client agent actions require sign-off or new clients connect.
        </div>

        <form onSubmit={handleRegisterWebhook} className="flex gap-2 flex-wrap mb-4">
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://your-crm.com/api/smart-money-webhook"
            required
            className="flex-1 min-w-[280px] px-3.5 py-2 rounded-[8px] text-[12px] border outline-none font-mono"
            style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
          />
          <button
            type="submit"
            disabled={registeringWebhook}
            className="px-4 py-2 rounded-[8px] text-[12px] font-semibold text-white border-none cursor-pointer hover:opacity-90 transition disabled:opacity-50"
            style={{ background: "var(--navy)" }}
          >
            {registeringWebhook ? "Registering..." : "+ Register Webhook"}
          </button>
        </form>

        {webhooks.length > 0 ? (
          <div className="space-y-2">
            {webhooks.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between p-3 rounded-[8px] border text-[12px] font-mono"
                style={{ background: "var(--bg)", borderColor: "var(--border)" }}
              >
                <div className="truncate mr-2">
                  <span className="text-emerald-500 mr-2">● Active</span>
                  <span style={{ color: "var(--text)" }}>{w.url}</span>
                </div>
                <span className="text-[10px] text-neutral-400">
                  {new Date(w.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[12px] italic text-neutral-400">No webhooks registered yet. Enter an HTTPS endpoint above.</div>
        )}
      </Card>

      {/* Endpoints List */}
      <div className="text-[14px] font-semibold mb-3" style={{ color: "var(--text)" }}>Interactive Endpoints & Specifications</div>
      {API_ENDPOINTS.map((ep) => <EndpointCard key={ep.path + ep.method} ep={ep} />)}

      {/* Raw Key Reveal Modal */}
      {rawKeyModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="rounded-[16px] p-6 max-w-lg w-full border shadow-2xl" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="text-[18px] font-bold mb-2 text-emerald-500">🔑 Production API Key Generated</div>
            <p className="text-[12px] leading-relaxed mb-4" style={{ color: "var(--muted)" }}>
              Please copy your secret key right now and store it safely in your password manager or vault. <strong>For your security, you will not be able to view this key again.</strong>
            </p>

            <div className="p-3.5 rounded-[10px] border mb-4 font-mono text-[13px] break-all select-all flex items-center justify-between" style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}>
              <span>{rawKeyModal}</span>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(rawKeyModal);
                  toast.success("Copied API key to clipboard!");
                }}
                className="px-4 py-2 rounded-[8px] text-[12px] font-semibold text-white border-none cursor-pointer"
                style={{ background: "var(--green)" }}
              >
                Copy Key 📋
              </button>
              <button
                onClick={() => setRawKeyModal(null)}
                className="px-4 py-2 rounded-[8px] text-[12px] font-semibold border cursor-pointer"
                style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
              >
                I Have Saved It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documentation Modal */}
      {docsModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="rounded-[16px] p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto border shadow-2xl" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-[18px] font-bold" style={{ color: "var(--text)" }}>📚 Smart Money B2B Partner API Reference</div>
              <button onClick={() => setDocsModalOpen(false)} className="text-[18px] text-neutral-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="space-y-4 text-[12px]" style={{ color: "var(--muted)" }}>
              <div>
                <h4 className="font-bold text-[13px] mb-1" style={{ color: "var(--text)" }}>Authentication</h4>
                <p>Pass your production API key in the HTTP <code className="text-emerald-500">Authorization</code> header as a Bearer token:</p>
                <div className="mt-2 p-3 rounded-[8px] font-mono text-[11px] overflow-x-auto" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
                  curl -X GET https://api.smartmoney.technology/v1/partner/clients \<br />
                  &nbsp;&nbsp;-H "Authorization: Bearer sm_live_YOUR_SECRET_KEY" \<br />
                  &nbsp;&nbsp;-H "Content-Type: application/json"
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[13px] mb-1" style={{ color: "var(--text)" }}>Threshold Approvals Example</h4>
                <p>Approve and execute a client's queued financial transaction directly into their ledger:</p>
                <div className="mt-2 p-3 rounded-[8px] font-mono text-[11px] overflow-x-auto" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
                  curl -X PATCH https://api.smartmoney.technology/v1/partner/approvals/act_991823 \<br />
                  &nbsp;&nbsp;-H "Authorization: Bearer sm_live_YOUR_SECRET_KEY" \<br />
                  &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                  &nbsp;&nbsp;-d '&#123;"decision": "approve", "note": "Approved per quarterly allocation schedule"&#125;'
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setDocsModalOpen(false)}
                className="px-4 py-2 rounded-[8px] text-[12px] font-semibold border cursor-pointer"
                style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
              >
                Close Reference
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
