"use client";

import { useState, useEffect } from "react";
import { SectionHeader, StatusPill, Card, CardHeader } from "../shared";
import toast from "react-hot-toast";

interface FormField {
  id: string;
  type: string;
  label: string;
  req: "Required" | "Optional" | "KYC";
}

interface DocItem {
  id: string;
  title: string;
  sub: string;
  required: boolean;
}

export function OnboardingPanel() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Dynamic Form Fields state
  const [fields, setFields] = useState<FormField[]>([
    { id: "f-1", type: "Text", label: "Full Legal Name", req: "Required" },
    { id: "f-2", type: "Email", label: "Email Address", req: "Required" },
    { id: "f-3", type: "Phone", label: "Phone Number", req: "Required" },
    { id: "f-4", type: "Select", label: "Annual Income Range", req: "Required" },
    { id: "f-5", type: "Textarea", label: "Primary Financial Goals", req: "Required" },
    { id: "f-6", type: "Upload", label: "Government-issued ID", req: "KYC" },
  ]);

  // Legal Documents state
  const [docs, setDocs] = useState<DocItem[]>([
    { id: "d-1", title: "Investment Policy Statement", sub: "Client must review and sign", required: true },
    { id: "d-2", title: "Risk Disclosure Document", sub: "Must acknowledge before investment allocation", required: true },
    { id: "d-3", title: "Data Sharing Consent", sub: "Authorises partner to view DataBank ledgers", required: true },
    { id: "d-4", title: "Advisory Fee Schedule", sub: "Institutional fee structure & billing terms", required: false },
  ]);

  // Modals
  const [previewOpen, setPreviewOpen] = useState(false);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [uploadDocOpen, setUploadDocOpen] = useState(false);

  // New field form state
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("Text");
  const [newFieldReq, setNewFieldReq] = useState<"Required" | "Optional" | "KYC">("Required");

  // New doc form state
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocSub, setNewDocSub] = useState("");
  const [newDocRequired, setNewDocRequired] = useState(true);

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

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldLabel.trim()) return;
    const newField: FormField = {
      id: `f-${Date.now()}`,
      label: newFieldLabel.trim(),
      type: newFieldType,
      req: newFieldReq,
    };
    setFields((prev) => [...prev, newField]);
    setNewFieldLabel("");
    setAddFieldOpen(false);
    toast.success(`Added form field: ${newField.label}`);
  };

  const handleRemoveField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    toast.success("Field removed from onboarding form");
  };

  const handleUploadDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;
    const newDoc: DocItem = {
      id: `d-${Date.now()}`,
      title: newDocTitle.trim(),
      sub: newDocSub.trim() || "Uploaded advisory document",
      required: newDocRequired,
    };
    setDocs((prev) => [...prev, newDoc]);
    setNewDocTitle("");
    setNewDocSub("");
    setUploadDocOpen(false);
    toast.success(`Uploaded: ${newDoc.title}`);
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
              onClick={() => setPreviewOpen(true)}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold border cursor-pointer hover:bg-neutral-500/10 transition-all"
              style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
            >
              Preview Form 👁️
            </button>
            <button
              onClick={() => toast.success("✅ Onboarding form configuration published live for incoming clients!")}
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
              {fields.map((f) => (
                <div key={f.id} className="flex items-center gap-[10px] rounded-[10px] px-[14px] py-[11px]" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <span className="text-[16px]" style={{ color: "var(--muted)" }}>⠿</span>
                  <span className="px-2 py-[3px] rounded-[6px] text-[10px] font-semibold" style={{ background: "rgba(74,144,217,.1)", color: "#4A90D9" }}>{f.type}</span>
                  <span className="text-[13px] font-medium flex-1" style={{ color: "var(--text)" }}>{f.label}</span>
                  <span className="text-[10px] font-semibold mr-2" style={{ color: f.req === "Required" ? "#E24B4A" : "var(--muted)" }}>{f.req}</span>
                  <button
                    onClick={() => handleRemoveField(f.id)}
                    className="text-neutral-400 hover:text-rose-500 text-[12px] cursor-pointer"
                    title="Remove field"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setAddFieldOpen(true)}
              className="w-full mt-2 py-[10px] rounded-[10px] border border-dashed text-[13px] cursor-pointer hover:border-emerald-500/50 transition-all"
              style={{ borderColor: "var(--border)", color: "var(--muted)" }}
            >
              + Add Custom Field
            </button>
          </Card>

          <Card>
            <CardHeader
              title="📄 Legal Documents & Policies"
              action={
                <button
                  onClick={() => setUploadDocOpen(true)}
                  className="px-3 py-[7px] rounded-[8px] text-[11px] font-semibold border cursor-pointer hover:bg-neutral-500/10 transition-all"
                  style={{ background: "var(--card)", color: "var(--text)", borderColor: "var(--border)" }}
                >
                  + Upload
                </button>
              }
            />
            <div className="flex flex-col gap-2">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-[8px]" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div>
                    <div className="text-[13px] font-medium" style={{ color: "var(--text)" }}>{d.title}</div>
                    <div className="text-[11px]" style={{ color: "var(--muted)" }}>{d.sub}</div>
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: d.required ? "var(--gold)" : "var(--muted)" }}>
                    {d.required ? "Required" : "Optional"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Live Applications Queue */}
        <div>
          <Card>
            <CardHeader
              title={`📥 Inbound Applications (${pendingCount} Pending)`}
              action={
                <span className="text-[11px] font-medium text-emerald-500">
                  Live Database
                </span>
              }
            />
            {loading ? (
              <div className="text-center py-10 text-[13px] text-neutral-400">Loading incoming applications...</div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12" style={{ color: "var(--muted)" }}>
                <div className="text-[28px] mb-2">📬</div>
                <div className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>No Inbound Applications</div>
                <div className="text-[12px] mt-1">Prospective clients who click &apos;Apply for Advisory&apos; will appear here.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 rounded-[12px] border transition"
                    style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-[14px] font-bold" style={{ color: "var(--text)" }}>{app.name}</div>
                        <div className="text-[11px]" style={{ color: "var(--muted)" }}>{app.email} · {app.phone}</div>
                      </div>
                      <StatusPill
                        label={app.status}
                        tone={app.status === "Approved" ? "active" : app.status === "Declined" ? "danger" : "pending"}
                      />
                    </div>

                    <div className="text-[12px] my-2" style={{ color: "var(--text)" }}>
                      <span className="font-semibold">Income:</span> {app.income_range || "Not specified"}
                    </div>
                    {app.goals && (
                      <div className="text-[11px] italic p-2 rounded-[6px] mb-3" style={{ background: "var(--card)", color: "var(--muted)" }}>
                        &ldquo;{app.goals}&rdquo;
                      </div>
                    )}

                    {app.status === "Pending Review" && (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleUpdateStatus(app.id, "approved")}
                          disabled={processingId === app.id}
                          className="px-3 py-1.5 rounded-[6px] text-[11px] font-semibold text-white border-none cursor-pointer hover:bg-emerald-600 transition"
                          style={{ background: "var(--green)" }}
                        >
                          Approve & Onboard
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(app.id, "declined")}
                          disabled={processingId === app.id}
                          className="px-3 py-1.5 rounded-[6px] text-[11px] font-semibold border cursor-pointer text-rose-500 border-rose-500/30 hover:bg-rose-500/10 transition"
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
        </div>
      </div>

      {/* Add Field Modal */}
      {addFieldOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="rounded-[16px] p-6 max-w-md w-full border shadow-2xl" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-[16px] font-bold" style={{ color: "var(--text)" }}>Add Onboarding Form Field</div>
              <button onClick={() => setAddFieldOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddField} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>Field Label</label>
                <input
                  type="text"
                  placeholder="e.g. Bank Verification Number (BVN)"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-[8px] text-[12px] border outline-none"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>Field Type</label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                  className="w-full px-3 py-2 rounded-[8px] text-[12px] border outline-none"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                >
                  <option value="Text">Text Input</option>
                  <option value="Email">Email Address</option>
                  <option value="Phone">Phone Number</option>
                  <option value="Select">Dropdown Select</option>
                  <option value="Textarea">Long Paragraph / Bio</option>
                  <option value="Upload">File / ID Document</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>Requirement Level</label>
                <select
                  value={newFieldReq}
                  onChange={(e: any) => setNewFieldReq(e.target.value)}
                  className="w-full px-3 py-2 rounded-[8px] text-[12px] border outline-none"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                >
                  <option value="Required">Required</option>
                  <option value="Optional">Optional</option>
                  <option value="KYC">Mandatory KYC</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddFieldOpen(false)}
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
                  Add Field
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {uploadDocOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="rounded-[16px] p-6 max-w-md w-full border shadow-2xl" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-[16px] font-bold" style={{ color: "var(--text)" }}>Upload Legal Policy / Document</div>
              <button onClick={() => setUploadDocOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleUploadDoc} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. Terms of Advisory & Custody"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-[8px] text-[12px] border outline-none"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>Description Note</label>
                <input
                  type="text"
                  placeholder="e.g. Client must accept before portfolio deployment"
                  value={newDocSub}
                  onChange={(e) => setNewDocSub(e.target.value)}
                  className="w-full px-3 py-2 rounded-[8px] text-[12px] border outline-none"
                  style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reqDoc"
                  checked={newDocRequired}
                  onChange={(e) => setNewDocRequired(e.target.checked)}
                />
                <label htmlFor="reqDoc" className="text-[12px]" style={{ color: "var(--text)" }}>Mandatory signature required</label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUploadDocOpen(false)}
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
                  Upload Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Form Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="rounded-[16px] p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto border shadow-2xl" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[16px] font-bold" style={{ color: "var(--text)" }}>Client Application Preview</div>
                <div className="text-[11px]" style={{ color: "var(--muted)" }}>This is how prospective clients see your advisory onboarding form.</div>
              </div>
              <button onClick={() => setPreviewOpen(false)} className="text-neutral-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="space-y-3.5 my-4">
              {fields.map((f) => (
                <div key={f.id}>
                  <label className="text-[11px] font-semibold uppercase tracking-wider block mb-1" style={{ color: "var(--muted)" }}>
                    {f.label} {f.req === "Required" && <span className="text-rose-500">*</span>}
                  </label>
                  {f.type === "Textarea" ? (
                    <textarea
                      placeholder={`Enter your ${f.label.toLowerCase()}...`}
                      rows={3}
                      className="w-full px-3 py-2 rounded-[8px] text-[12px] border outline-none"
                      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                    />
                  ) : f.type === "Select" ? (
                    <select
                      className="w-full px-3 py-2 rounded-[8px] text-[12px] border outline-none"
                      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                    >
                      <option>₦10M – ₦50M</option>
                      <option>₦50M – ₦250M</option>
                      <option>₦250M+</option>
                    </select>
                  ) : (
                    <input
                      type={f.type === "Email" ? "email" : "text"}
                      placeholder={`Enter your ${f.label.toLowerCase()}...`}
                      className="w-full px-3 py-2 rounded-[8px] text-[12px] border outline-none"
                      style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-2 rounded-[8px] text-[12px] font-semibold text-white border-none cursor-pointer"
                style={{ background: "var(--green)" }}
              >
                Done Previewing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
