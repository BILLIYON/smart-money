"use client";

import { useState, useEffect } from "react";
import { SectionHeader, StatusPill, Card, CardHeader } from "../shared";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 13,
  color: "var(--text)",
  outline: "none",
  marginBottom: 12,
};
const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: ".5px",
  marginBottom: 5,
  display: "block",
};

const STATUS_TONE: Record<string, "active" | "pending" | "inactive"> = {
  Active: "active",
  active: "active",
  "Acted On": "active",
  acted: "active",
  Missed: "inactive",
  missed: "inactive",
  pending: "pending",
};

export function PartnerOpportunitiesPanel() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [title, setTitle] = useState("Move idle cash into a high-yield T-bill tranche");
  const [category, setCategory] = useState("Rate Alert");
  const [reasoning, setReasoning] = useState(
    "T-bill yields have spiked to 17.2%. You have idle balances in savings earning 5.5%. Reallocating idle reserves will generate extra passive income."
  );
  const [valueEstimate, setValueEstimate] = useState("+₦42,000/yr vs savings rate");
  const [windowLabel, setWindowLabel] = useState("Subscription closes Friday");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const [oppsSent, setOppsSent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [clientsRes, oppsRes] = await Promise.all([
          fetch("/api/partner/clients"),
          fetch("/api/partner/opportunities"),
        ]);

        if (clientsRes.ok) {
          const cData = await clientsRes.json();
          if (isMounted && Array.isArray(cData.clients)) {
            setClients(cData.clients);
            if (cData.clients[0]) {
              setSelectedUserId(cData.clients[0].userId || cData.clients[0].id);
            }
          }
        }

        if (oppsRes.ok) {
          const oData = await oppsRes.json();
          if (isMounted && Array.isArray(oData.opportunities)) {
            setOppsSent(oData.opportunities);
          }
        }
      } catch (err) {
        console.warn("[PartnerOpportunitiesPanel] Error loading data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSendOpportunity(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/partner/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          reasoning,
          valueEstimate,
          windowLabel,
          targetUserId: selectedUserId || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          success: true,
          message: `✓ Opportunity "${title}" dispatched to client!`,
        });
        setOppsSent((prev) => [
          {
            id: data.opportunity.id,
            title,
            category,
            client: clients.find((c) => (c.userId || c.id) === selectedUserId)?.name || "All Clients",
            status: "active",
            sentAgo: "Just now",
            reasoning,
            valueEstimate,
          },
          ...prev,
        ]);
      } else {
        setFeedback({
          success: false,
          message: data.error || "Failed to send opportunity",
        });
      }
    } catch {
      setFeedback({ success: false, message: "Network error sending opportunity" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <SectionHeader
        title="💡 Send Client"
        emphasis="Opportunities"
        action={
          <div className="text-[12px]" style={{ color: "var(--muted)" }}>
            Time-sensitive suggestions appear in the client&apos;s Opportunities tab
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Dispatch Opportunity" />
          <form onSubmit={handleSendOpportunity}>
            <label style={labelStyle}>Target Client</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              style={{ ...inputStyle, appearance: "auto" }}
            >
              <option value="">All Consented Clients (Broadcast)</option>
              {clients.map((c) => (
                <option key={c.id || c.name} value={c.userId || c.id}>
                  {c.name} ({c.email || c.status})
                </option>
              ))}
            </select>

            <label style={labelStyle}>Title</label>
            <input
              style={inputStyle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. REIT allocation matching your stated goals"
              required
            />

            <label style={labelStyle}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ ...inputStyle, appearance: "auto" }}
            >
              <option>Rate Alert</option>
              <option>Investment</option>
              <option>Real Estate</option>
              <option>Mutual Funds</option>
              <option>Tax Strategy</option>
            </select>

            <label style={labelStyle}>Investment Rationale (shown to client)</label>
            <textarea
              style={{ ...inputStyle, resize: "none" }}
              rows={3}
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Explain why this opportunity fits their financial plan..."
              required
            />

            <div className="grid grid-cols-2 gap-[10px]">
              <div>
                <label style={labelStyle}>Estimated Value</label>
                <input
                  style={inputStyle}
                  value={valueEstimate}
                  onChange={(e) => setValueEstimate(e.target.value)}
                  placeholder="e.g. +₦40,000/yr"
                />
              </div>
              <div>
                <label style={labelStyle}>Window Closes</label>
                <input
                  style={inputStyle}
                  value={windowLabel}
                  onChange={(e) => setWindowLabel(e.target.value)}
                  placeholder="e.g. Closes Friday"
                />
              </div>
            </div>

            {feedback && (
              <div
                className="p-3 mb-3 rounded-lg text-[12px] font-medium"
                style={{
                  background: feedback.success ? "rgba(0,196,140,0.1)" : "rgba(226,75,74,0.1)",
                  color: feedback.success ? "var(--green)" : "#E24B4A",
                  border: `1px solid ${feedback.success ? "rgba(0,196,140,0.3)" : "rgba(226,75,74,0.3)"}`,
                }}
              >
                {feedback.message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-[10px] rounded-[10px] text-[13px] font-semibold text-white border-none cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--green)" }}
            >
              {submitting ? "Sending..." : "Dispatch Opportunity →"}
            </button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Dispatched Opportunities" />
          {loading ? (
            <div className="py-8 text-center text-[12px]" style={{ color: "var(--muted)" }}>
              Loading dispatched opportunities...
            </div>
          ) : oppsSent.length === 0 ? (
            <div
              className="py-10 text-center rounded-[10px]"
              style={{ background: "var(--bg)", border: "1px dashed var(--border)" }}
            >
              <div className="text-[24px] mb-2">💡</div>
              <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>No Opportunities Dispatched Yet</div>
              <div className="text-[11px] max-w-[320px] mx-auto mt-1" style={{ color: "var(--muted)" }}>
                Use the dispatch console on the left to send market yields, rate alerts, and investment tranches to your clients.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-[10px]">
              {oppsSent.map((o: any, i: number) => {
                const clientLabel = o.client || o.sourceName || o.clientName || "Consented Clients";
                const titleText = o.title || "Investment Tranche";
                const status = o.status || "active";
                const timeLabel = o.sentAgo || (o.created_at || o.createdAt ? new Date(o.created_at || o.createdAt).toLocaleDateString() : "Active");

                return (
                  <div key={o.id || i} className="rounded-[10px] px-3 py-[10px]" style={{ background: "var(--bg)" }}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{clientLabel}</div>
                      <StatusPill label={status} tone={STATUS_TONE[status] ?? "active"} />
                    </div>
                    <div className="text-[12px] font-medium" style={{ color: "var(--green2)" }}>{titleText}</div>
                    {o.reasoning && (
                      <div className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>
                        {o.reasoning}
                      </div>
                    )}
                    <div className="flex justify-between text-[10px] mt-2" style={{ color: "var(--muted)" }}>
                      <span>{o.valueEstimate || o.value_estimate || "+ High Yield"}</span>
                      <span>{timeLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
