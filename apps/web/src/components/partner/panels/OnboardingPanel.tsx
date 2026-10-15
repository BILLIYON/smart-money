"use client";

import { SectionHeader, StatusPill, comingSoon, Card, CardHeader } from "../shared";
import { ONBOARDING_FIELDS, ONBOARDING_DOCS, PENDING_APPLICATIONS } from "../mockData";

export function OnboardingPanel() {
  return (
    <div>
      <SectionHeader
        title="📋 Client"
        emphasis="Onboarding"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => comingSoon("Previewing the application form")}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold border"
              style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
            >
              Preview Form
            </button>
            <button
              onClick={() => comingSoon("Publishing onboarding changes")}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold text-white border-none"
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
              className="w-full mt-2 py-[10px] rounded-[10px] border border-dashed text-[13px]"
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
                  className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold border"
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
            <CardHeader title="Pending Applications" action={<span className="text-[12px]" style={{ color: "var(--muted)" }}>{PENDING_APPLICATIONS.length} awaiting review</span>} />
            <div className="flex flex-col gap-2">
              {PENDING_APPLICATIONS.map((a) => (
                <div key={a.name} className="rounded-[10px] px-3 py-[10px]" style={{ background: "var(--bg)" }}>
                  <div className="flex items-center justify-between mb-[6px]">
                    <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{a.name}</div>
                    <StatusPill label={a.status} tone="pending" />
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--muted)" }}>{a.meta}</div>
                  <div className="flex gap-[6px] mt-2">
                    {a.docsComplete ? (
                      <>
                        <button onClick={() => comingSoon("Approving applications")} className="px-3 py-[6px] rounded-[8px] text-[11px] font-semibold text-white border-none" style={{ background: "var(--green)" }}>Approve</button>
                        <button onClick={() => comingSoon("Reviewing documents")} className="px-3 py-[6px] rounded-[8px] text-[11px] font-semibold border" style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}>Review Docs</button>
                        <button onClick={() => comingSoon("Declining applications")} className="px-3 py-[6px] rounded-[8px] text-[11px] font-semibold border" style={{ color: "#E24B4A", borderColor: "#E24B4A" }}>Decline</button>
                      </>
                    ) : (
                      <button onClick={() => comingSoon("Sending a reminder")} className="px-3 py-[6px] rounded-[8px] text-[11px] font-semibold border" style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}>Send Reminder</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Client Invite Links" />
            <div className="text-[12px] mb-[10px]" style={{ color: "var(--muted)" }}>
              Share these links to bring clients onto your partner workspace
            </div>
            <div className="flex items-center gap-[10px] rounded-[10px] px-[14px] py-[11px] border border-dashed" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
              <span className="flex-1 text-[12px] truncate" style={{ color: "var(--muted)", fontFamily: "monospace" }}>
                partners.smartmoney.ng/your-firm/join
              </span>
              <button
                onClick={() => comingSoon("Copying the invite link")}
                className="px-3 py-[5px] rounded-[8px] text-[11px] font-semibold border whitespace-nowrap"
                style={{ background: "var(--card)", color: "var(--muted)", borderColor: "var(--border)" }}
              >
                Copy
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
