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

export function GoalsPanel() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [title, setTitle] = useState("Emergency Fund — 6 months expenses");
  const [targetAmount, setTargetAmount] = useState("2000000");
  const [targetDate, setTargetDate] = useState("2026-12-31");
  const [advisorNote, setAdvisorNote] = useState(
    "Based on your recent spending analytics, building a 6-month liquidity reserve of ₦2M will protect your investment portfolio from emergency liquidations."
  );
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Live goals written
  const [goalsWritten, setGoalsWritten] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [clientsRes, goalsRes] = await Promise.all([
          fetch("/api/partner/clients"),
          fetch("/api/partner/goals"),
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

        if (goalsRes.ok) {
          const gData = await goalsRes.json();
          if (isMounted && Array.isArray(gData.goals)) {
            setGoalsWritten(gData.goals);
          }
        }
      } catch (err) {
        console.warn("[GoalsPanel] Error loading partner data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handlePublishGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) {
      setFeedback({ success: false, message: "Please select a client to assign this goal." });
      return;
    }
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/partner/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          title,
          targetAmount: parseInt(targetAmount.replace(/[^0-9]/g, ""), 10) || 1000000,
          targetDate,
          advisorNote,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          success: true,
          message: `✓ Goal "${title}" successfully published to client!`,
        });
        // Add to local list
        setGoalsWritten((prev) => [
          {
            id: data.goal.id,
            title,
            clientName: clients.find((c) => (c.userId || c.id) === selectedUserId)?.name || "Client",
            targetAmount: parseInt(targetAmount, 10),
            currentAmount: 0,
            status: "pending_acceptance",
            requiresAcceptance: true,
            advisorNote,
          },
          ...prev,
        ]);
      } else {
        setFeedback({
          success: false,
          message: data.error || "Failed to publish goal",
        });
      }
    } catch {
      setFeedback({ success: false, message: "Network error publishing goal" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <SectionHeader
        title="🎯 Write"
        emphasis="Client Goals"
        action={
          <div className="text-[12px]" style={{ color: "var(--muted)" }}>
            Goals appear in client&apos;s Goal Tracker with your advisor badge and rationale
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Create Goal for Client" />
          <form onSubmit={handlePublishGoal}>
            <label style={labelStyle}>Select Client</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              style={{ ...inputStyle, appearance: "auto" }}
              required
            >
              {clients.length > 0 ? (
                clients.map((c) => (
                  <option key={c.id || c.name} value={c.userId || c.id}>
                    {c.name} ({c.email || c.status})
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  No clients connected yet
                </option>
              )}
            </select>

            <label style={labelStyle}>Goal Title</label>
            <input
              style={inputStyle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-[10px]">
              <div>
                <label style={labelStyle}>Target Amount (₦)</label>
                <input
                  type="number"
                  style={inputStyle}
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Target Date</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            </div>

            <label style={labelStyle}>Advisory Rationale to Client</label>
            <textarea
              style={{ ...inputStyle, resize: "none" }}
              rows={3}
              value={advisorNote}
              onChange={(e) => setAdvisorNote(e.target.value)}
              placeholder="Explain why you recommend this milestone..."
            />

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
              disabled={submitting || clients.length === 0}
              className="w-full py-[10px] rounded-[10px] text-[13px] font-semibold text-white border-none cursor-pointer transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--green)" }}
            >
              {submitting ? "Publishing..." : "Publish Goal to Client →"}
            </button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Published Client Goals" />
          {loading ? (
            <div className="py-8 text-center text-[12px]" style={{ color: "var(--muted)" }}>
              Loading goals...
            </div>
          ) : goalsWritten.length === 0 ? (
            <div
              className="py-10 text-center rounded-[10px]"
              style={{ background: "var(--bg)", border: "1px dashed var(--border)" }}
            >
              <div className="text-[24px] mb-2">🎯</div>
              <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>No Goals Published Yet</div>
              <div className="text-[11px] max-w-[320px] mx-auto mt-1" style={{ color: "var(--muted)" }}>
                Use the form on the left to write financial milestones and targets for your connected clients.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-[10px]">
              {goalsWritten.map((g: any, idx: number) => {
                const clientName = g.clientName || g.client || "Client";
                const goalTitle = g.title || g.meta || "Financial Goal";
                const status = g.requiresAcceptance ? "Pending Client Approval" : g.status === "active" ? "Active" : g.status;
                const progress = g.targetAmount > 0 ? Math.min(100, Math.round(((g.currentAmount || 0) / g.targetAmount) * 100)) : 0;

                return (
                  <div key={g.id || idx} className="rounded-[10px] px-3 py-[10px]" style={{ background: "var(--bg)" }}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{clientName}</div>
                      <StatusPill label={status} tone={g.requiresAcceptance ? "pending" : "active"} />
                    </div>
                    <div className="text-[12px] font-medium" style={{ color: "var(--green2)" }}>{goalTitle}</div>
                    {g.advisorNote && (
                      <div className="text-[11px] mt-1 italic" style={{ color: "var(--muted)" }}>
                        “{g.advisorNote}”
                      </div>
                    )}
                    <div className="h-[6px] rounded-[3px] mt-[8px] overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-[3px]" style={{ width: `${progress}%`, background: "var(--green)" }} />
                    </div>
                    <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--muted)" }}>
                      <span>Progress: {progress}%</span>
                      <span>Target: ₦{(g.targetAmount || 0).toLocaleString()}</span>
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
