"use client";

import { useState, useEffect } from "react";
import { SectionHeader, StatusPill, comingSoon, Card, CardHeader } from "../shared";
import toast from "react-hot-toast";

const ONBOARDING_FIELDS = [
  { type: "Text", label: "Full Legal Name", req: "Required" },
  { type: "Email", label: "Email Address", req: "Required" },
  { type: "Phone", label: "Phone Number", req: "Required" },
  { type: "Select", label: "Annual Income Range", req: "Required" },
  { type: "Textarea", label: "Primary Financial Goals", req: "Required" },
  { type: "Upload", label: "Government-issued ID", req: "KYC" },
];

const ONBOARDING_DOCS = [
  { title: "Investment Policy Statement", sub: "Client must review and sign", required: true },
  { title: "Risk Disclosure Document", sub: "Must acknowledge before investment allocation", required: true },
  { title: "Data Sharing Consent", sub: "Authorises partner to view DataBank ledgers", required: true },
  { title: "Advisory Fee Schedule", sub: "Institutional fee structure & billing terms", required: false },
];

export function OnboardingPanel() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      const res = await fetch("/api/partner/applications");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.applications)) {
          setApplications(data.applications);
        }
      }
    } catch (err) {
      console.warn("[OnboardingPanel] Error loading applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleUpdateStatus = async (id: string, status: "approved" | "declined") => {
    setProcessingId(id);
    try {
      const res = await fetch("/api/partner/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      if (res.ok) {
        toast.success(`Application marked as ${status}`);
        setApplications((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: status === "approved" ? "Approved" : "Declined" } : a))
        );
      } else {
        toast.error("Failed to update application status");
      }
    } catch {
      toast.error("Network error updating application");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = applications.filter((a) => a.status === "Pending Review").length;

  return (
    <div>
      <SectionHeader
        title="📋 Client"
        emphasis="Onboarding"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => comingSoon("Previewing application form")}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold border cursor-pointer hover:bg-neutral-800 transition-all"
              style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
            >
              Preview Form
            </button>
            <button
              onClick={() => comingSoon("Publishing onboarding changes")}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold text-white border-none cursor-pointer hover:bg-emerald-600 transition-all shadow"
              style={{ background: "var(--green)" }}
            >
              Publish Changes
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="📝 Application Form Fields" />
            <div className="flex flex-col gap-2">
              {ONBOARDING_FIELDS.map((f) => (
                <div key={f.label} className="flex items-center gap-[10px] rounded-[10px] px-[14px] py-[11px]" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <span className="text-[16px]" style={{ color: "var(--muted)" }}>⠿</span>
                  <span className="px-2 py-[3px] rounded-[6px] text-[10px] font-semibold" style={{ background: "rgba(74,144,217,.1)", color: "#4A90D9" }}>{f.type}</span>
                  <span className="text-[13px] font-medium flex-1" style={{ color: "var(--text)" }}>{f.label}</span>
                  <span className="text-[10px] font-semibold" style={{ color: f.req === "Required" ? "#E24B4A" : "var(--muted)" }}>{f.req}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => comingSoon("Adding a form field")}
              className="w-full mt-2 py-[10px] rounded-[10px] border border-dashed text-[13px] cursor-pointer hover:opacity-80 transition-all"
              style={{ borderColor: "var(--border)", color: "var(--muted)" }}
            >
              + Add Field
            </button>
          </Card>

          <Card>
            <CardHeader
              title="📄 Legal Documents & Policies"
              action={
                <button
                  onClick={() => comingSoon("Uploading a legal document")}
                  className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold border cursor-pointer hover:bg-neutral-800 transition-all"
                  style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
                >
                  + Upload
                </button>
              }
            />
            <div className="flex flex-col gap-2">
              {ONBOARDING_DOCS.map((d) => (
                <div key={d.title} className="flex items-center justify-between px-3 py-2 rounded-[8px]" style={{ background: "var(--bg)" }}>
                  <div>
                    <div className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{d.title}</div>
                    <div className="text-[11px]" style={{ color: "var(--muted)" }}>{d.sub}</div>
                  </div>
                  <StatusPill label={d.required ? "Required" : "Optional"} tone={d.required ? "active" : "pending"} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader
              title="Client Applications"
              action={
                <span className="text-[12px]" style={{ color: "var(--muted)" }}>
                  {pendingCount} awaiting review
                </span>
              }
            />
            {loading ? (
              <div className="py-8 text-center text-[12px]" style={{ color: "var(--muted)" }}>
                Loading applications...
              </div>
            ) : applications.length === 0 ? (
              <div
                className="py-10 text-center rounded-[10px]"
                style={{ background: "var(--bg)", border: "1px dashed var(--border)" }}
              >
                <div className="text-[24px] mb-2">📥</div>
                <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>No Applications Submitted Yet</div>
                <div className="text-[11px] max-w-[320px] mx-auto mt-1" style={{ color: "var(--muted)" }}>
                  Client applications submitted through Find a Partner or your profile will appear here for review.
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {applications.map((a) => (
                  <div key={a.id} className="rounded-[10px] px-3 py-[10px]" style={{ background: "var(--bg)" }}>
                    <div className="flex items-center justify-between mb-[6px]">
                      <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{a.name}</div>
                      <StatusPill label={a.status} tone={a.status === "Approved" ? "active" : a.status === "Declined" ? "inactive" : "pending"} />
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--muted)" }}>{a.meta}</div>
                    {a.goalsText && (
                      <div className="text-[11px] mt-1.5 p-2 rounded bg-white/5 text-zinc-300 italic">
                        &ldquo;{a.goalsText}&rdquo;
                      </div>
                    )}
                    {a.status === "Pending Review" && (
                      <div className="flex gap-[6px] mt-3">
                        <button
                          disabled={processingId === a.id}
                          onClick={() => handleUpdateStatus(a.id, "approved")}
                          className="px-3 py-[6px] rounded-[8px] text-[11px] font-semibold text-white border-none cursor-pointer hover:bg-emerald-600 disabled:opacity-50"
                          style={{ background: "var(--green)" }}
                        >
                          Approve
                        </button>
                        <button
                          disabled={processingId === a.id}
                          onClick={() => handleUpdateStatus(a.id, "declined")}
                          className="px-3 py-[6px] rounded-[8px] text-[11px] font-semibold border cursor-pointer hover:bg-rose-500/10 disabled:opacity-50"
                          style={{ color: "#E24B4A", borderColor: "#E24B4A" }}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Client Invite Links" />
            <div className="text-[12px] mb-[10px]" style={{ color: "var(--muted)" }}>
              Share this link to direct prospective clients straight to your partner firm profile
            </div>
            <div className="flex items-center gap-[10px] rounded-[10px] px-[14px] py-[11px] border border-dashed" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
              <span className="flex-1 text-[12px] truncate" style={{ color: "var(--muted)", fontFamily: "monospace" }}>
                https://smartmoney.technology/partners/stanbic-wealth
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText("https://smartmoney.technology/partners/stanbic-wealth");
                  toast.success("Profile link copied to clipboard!");
                }}
                className="px-3 py-[5px] rounded-[8px] text-[11px] font-semibold border whitespace-nowrap cursor-pointer hover:bg-white/10"
                style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
              >
                Copy Link
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
