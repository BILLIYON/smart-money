"use client";

import { useEffect, useRef, useState } from "react";
import type { BuddyCategory } from "@/lib/buddies";
import { isImageAvatar } from "@/lib/utils";
import { popup } from "@/store/popupStore";

// ── Types ──────────────────────────────────────────────────
type StudioConfig = {
  // ① Identity
  buddyName: string;
  tag: string;
  desc: string;
  avatarContent: string;
  avatarBg: string;
  avatarIsSerif: boolean;
  bannerColor: string;
  categories: BuddyCategory[];
  isFanSim: boolean;
  disclaimer: string;
  philosophy: string;
  samples: string[];
  includes: string[];
  priceNote: string;
  // ② Knowledge Base — handled via `files` state
  // ③ Personality
  tone: number;
  delivery: number;
  register: number;
  signaturePhrase: string;
  willNotAdviseOn: string;
  // ④ AI Model
  model: "Claude" | "GPT-4" | "Gemini" | "Groq";
  // ⑤ Notifications
  triggers: boolean[];
  maxNotifs: number;
  // ⑥ Pricing
  price: "free" | "paid" | "custom";
  customPrice: string;
};

type PreviewMsg = { role: "user" | "assistant"; content: string; streaming?: boolean };
type KnowledgeFile = { id: string; emoji: string; bg: string; name: string; meta: string };

// ── Constants ──────────────────────────────────────────────
const BANNER_PRESETS = [
  "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
  "linear-gradient(135deg,#1A5E1A,#2D8A2D)",
  "linear-gradient(135deg,#6B1A6B,#A040A0)",
  "linear-gradient(135deg,#1A4A6B,#2E7DAA)",
  "linear-gradient(135deg,#8B4513,#CD853F)",
  "linear-gradient(135deg,#3A0A0A,#701010)",
  "linear-gradient(135deg,#1A0A2E,#3A1060)",
  "linear-gradient(135deg,#00213A,#004070)",
];

const AVATAR_BG_PRESETS = [
  "#1A3A6E", "#2D8A2D", "#A040A0", "#2E7DAA",
  "#CD853F", "#2D5A2D", "#701010", "#3A1060",
  "#004070", "#5A3800", "#7B68EE", "#10A37F",
];

const CATEGORY_OPTIONS: BuddyCategory[] = [
  "Investing", "Budgeting", "Entrepreneurship",
  "Academic", "Crypto", "Real Estate",
];

// ── Small Toggle ───────────────────────────────────────────
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
      <div style={{
        position: "absolute", top: 3,
        left: on ? 19 : 3,
        width: 14, height: 14, borderRadius: "50%",
        background: "#fff", transition: "left .2s",
        boxShadow: "0 1px 3px rgba(0,0,0,.25)",
      }} />
    </button>
  );
}

// ── Image Compressor Helper ──────────────────────────────────
function compressImage(file: File, maxDimension = 300, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

// ── Personality Slider ─────────────────────────────────────
function PersonalitySlider({
  leftLabel, centerLabel, rightLabel, value, onChange,
}: {
  leftLabel: string; centerLabel: string; rightLabel: string;
  value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-[6px]">
        <span className="text-[11px]" style={{ color: "var(--muted)" }}>{leftLabel}</span>
        <span className="text-[11px] font-semibold" style={{ color: "var(--text)" }}>{centerLabel}</span>
        <span className="text-[11px]" style={{ color: "var(--muted)" }}>{rightLabel}</span>
      </div>
      <input
        type="range" min={0} max={100} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-[4px] rounded-full outline-none cursor-pointer"
        style={{ accentColor: "var(--green)" }}
      />
    </div>
  );
}

// ── Step card wrapper ──────────────────────────────────────
function StepCard({
  num, title, done = false, badge, children,
}: {
  num: string; title: string; done?: boolean; badge?: string; children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16 }}>
      <div className="flex items-center gap-3 px-[18px] py-[14px]" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        <div
          className="flex items-center justify-center text-[12px] font-bold flex-shrink-0"
          style={{
            width: 26, height: 26, borderRadius: 8,
            background: done ? "rgba(0,196,140,.15)" : "var(--border)",
            color: done ? "var(--green2)" : "var(--muted)",
          }}
        >
          {done ? "✓" : num}
        </div>
        <div className="flex-1 text-[14px] font-semibold" style={{ color: "var(--text)" }}>{title}</div>
        {badge && <span className="text-[11px] font-medium" style={{ color: "var(--green2)" }}>{badge}</span>}
      </div>
      <div className="p-[18px]">{children}</div>
    </div>
  );
}

// ── Section label inside a StepCard ───────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[.4px] mb-[8px]" style={{ color: "var(--muted)" }}>
      {children}
    </div>
  );
}

// ── Field divider ──────────────────────────────────────────
function FieldDivider() {
  return <div className="my-4" style={{ borderTop: "1px solid var(--border)" }} />;
}

// ── Revenue row ────────────────────────────────────────────
function RevRow({ label, amount, highlight = false }: { label: string; amount: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between py-[7px] text-[12px]" style={{ borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span className="font-semibold" style={{ color: highlight ? "var(--green2)" : "var(--text)" }}>{amount}</span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────
export default function StudioPage() {
  const [editBuddyId, setEditBuddyId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<string | null>(null);

  const [config, setConfig] = useState<StudioConfig>({
    // Identity
    buddyName: "",
    tag: "",
    desc: "",
    avatarContent: "🎯",
    avatarBg: "#1A3A6E",
    avatarIsSerif: false,
    bannerColor: "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
    categories: [],
    isFanSim: false,
    disclaimer: "",
    philosophy: "",
    samples: ["", ""],
    includes: ["Unlimited chat sessions", "Full DataBank integration"],
    priceNote: "3-day free trial · Cancel anytime",
    // Personality
    tone: 50,
    delivery: 50,
    register: 50,
    signaturePhrase: "",
    willNotAdviseOn: "",
    // AI Model
    model: "Claude",
    // Notifications
    triggers: [true, true, true, true, true, false],
    maxNotifs: 3,
    // Pricing
    price: "paid",
    customPrice: "",
  });

  const [files, setFiles] = useState<KnowledgeFile[]>([]);

  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (!editId) return;

    setEditBuddyId(editId);
    fetch(`/api/studio/edit?id=${editId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.buddy) {
          const b = res.buddy;
          let modelName = "Claude";
          if (b.ai_model) {
            const m = b.ai_model.toLowerCase();
            if (m.includes("gpt")) modelName = "GPT-4";
            else if (m.includes("gemini")) modelName = "Gemini";
            else if (m.includes("groq")) modelName = "Groq";
          }
          setConfig((prev) => ({
            ...prev,
            buddyName: b.name || "",
            tag: b.tag || "",
            desc: b.description || "",
            avatarContent: b.avatar_content || "🤖",
            avatarBg: b.avatar_bg || "#1A3A6E",
            avatarIsSerif: b.avatar_is_serif ?? false,
            bannerColor: b.banner_color || "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
            categories: Array.isArray(b.category) ? b.category : b.category ? [b.category] : [],
            isFanSim: b.is_fan_sim ?? false,
            disclaimer: b.fan_disclaimer || "",
            philosophy: b.philosophy || "",
            model: modelName as any,
            price: b.price_monthly > 0 ? "custom" : "free",
            customPrice: b.price_monthly ? String(Math.round(b.price_monthly / 100)) : "",
          }));
          if (b.rejection_reason) {
            setAdminNote(b.rejection_reason);
          }
        }
      })
      .catch((err) => console.error("Failed to load buddy for edit:", err));
  }, []);

  // ── Preview chat ───────────────────────────────────────
  const [previewMsgs, setPreviewMsgs] = useState<PreviewMsg[]>([
    { role: "assistant", content: "👋 Welcome! I am your real-time preview assistant. Fill in your buddy's details on the left, then send a message here to test how I respond in real-time." },
  ]);
  const [previewInput, setPreviewInput] = useState("");
  const [previewStreaming, setPreviewStreaming] = useState(false);
  const previewEndRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    previewEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [previewMsgs]);

  const effectivePrice =
    config.price === "free" ? 0 :
    config.price === "paid" ? 5 :
    Number(config.customPrice) || 0;

  const rev70 = (n: number) => `$${(n * effectivePrice * 0.7).toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo`;

  const identityDone = config.buddyName.trim() !== "" && config.tag.trim() !== "" && config.desc.trim() !== "";

  async function sendPreview() {
    const text = previewInput.trim();
    if (!text || previewStreaming) return;
    setPreviewInput("");

    const userMsg: PreviewMsg = { role: "user", content: text };
    const history = [...previewMsgs, userMsg];
    setPreviewMsgs(history);

    const streamingMsg: PreviewMsg = { role: "assistant", content: "", streaming: true };
    setPreviewMsgs([...history, streamingMsg]);
    setPreviewStreaming(true);

    try {
      const res = await fetch("/api/chat/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          config: {
            tone: config.tone,
            delivery: config.delivery,
            register: config.register,
            signaturePhrase: config.signaturePhrase,
            willNotAdviseOn: config.willNotAdviseOn,
            model: config.model,
            triggers: config.triggers,
          },
        }),
      });

      if (!res.body) throw new Error("No body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setPreviewMsgs([...history, { role: "assistant", content: accumulated, streaming: true }]);
      }

      setPreviewMsgs([...history, { role: "assistant", content: accumulated }]);
    } catch {
      setPreviewMsgs([...history, { role: "assistant", content: "Preview unavailable — check your API key." }]);
    } finally {
      setPreviewStreaming(false);
    }
  }

  async function handlePublish() {
    if (publishing || published) return;

    if (!config.buddyName.trim() || !config.tag.trim() || !config.desc.trim()) {
      popup.alert("Compulsory Fields Required", "Please fill in all compulsory fields marked with an asterisk (*).");
      return;
    }
    if (config.categories.length === 0) {
      popup.alert("Category Required", "Please select at least one category (*).");
      return;
    }
    if (config.price === "custom" && (!config.customPrice || Number(config.customPrice) <= 0)) {
      popup.alert("Invalid Price", "Please enter a valid custom price (*).");
      return;
    }

    setPublishing(true);
    try {
      const res = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, editBuddyId }),
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        if (res.status === 413) {
          popup.alert(
            "Payload Too Large",
            "The buddy configuration payload is too large. Please reset or choose a smaller photo/file."
          );
          return;
        }
        popup.alert("Submission Error", responseText || "Server returned an invalid response.");
        return;
      }

      if (!res.ok || !data.ok) {
        popup.alert("Submission Failed", data.error || "Failed to submit buddy for review. Please try again.");
        return;
      }

      setPublished(true);
      popup.success("Submitted for Review", "🎉 Your buddy has been submitted successfully and is awaiting admin approval!");
    } catch (err: any) {
      popup.alert("Submission Error", err.message || "An error occurred while submitting your buddy.");
    } finally {
      setPublishing(false);
    }
  }

  function handleKnowledgeFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const uploaded = Array.from(e.target.files || []);
    if (uploaded.length === 0) return;

    const newFiles: KnowledgeFile[] = uploaded.map((file, idx) => ({
      id: `kb-${Date.now()}-${idx}`,
      emoji: file.name.endsWith(".pdf") ? "📄" : file.name.endsWith(".txt") ? "📝" : "📁",
      bg: file.name.endsWith(".pdf") ? "#E3F2FD" : "#F3E5F5",
      name: file.name,
      meta: `${(file.size / 1024).toFixed(1)} KB · Ingested`,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    popup.success("Knowledge Ingested", `Added ${uploaded.length} file(s) to knowledge base.`);
  }

  function removeFile(id: string) {
    setFiles((f) => f.filter((x) => x.id !== id));
  }

  function toggleCategory(cat: BuddyCategory) {
    setConfig((c) => ({
      ...c,
      categories: c.categories.includes(cat)
        ? c.categories.filter((x) => x !== cat)
        : [...c.categories, cat],
    }));
  }

  function handleAddCustomCategory(e: React.FormEvent) {
    e.preventDefault();
    const cat = customCategory.trim();
    if (!cat) return;
    if (!config.categories.includes(cat)) {
      setConfig((c) => ({ ...c, categories: [...c.categories, cat] }));
    }
    setCustomCategory("");
  }

  function updateSample(i: number, val: string) {
    setConfig((c) => {
      const samples = [...c.samples];
      samples[i] = val;
      return { ...c, samples };
    });
  }

  function addSample() {
    setConfig((c) => ({ ...c, samples: [...c.samples, ""] }));
  }

  function removeSample(i: number) {
    setConfig((c) => ({ ...c, samples: c.samples.filter((_, idx) => idx !== i) }));
  }

  function updateInclude(i: number, val: string) {
    setConfig((c) => {
      const includes = [...c.includes];
      includes[i] = val;
      return { ...c, includes };
    });
  }

  function addInclude() {
    setConfig((c) => ({ ...c, includes: [...c.includes, ""] }));
  }

  function removeInclude(i: number) {
    setConfig((c) => ({ ...c, includes: c.includes.filter((_, idx) => idx !== i) }));
  }

  const triggerLabels = [
    { icon: "💰", label: "Salary / Large credit received" },
    { icon: "📉", label: "Spending threshold exceeded" },
    { icon: "🎯", label: "Goal deadline approaching (2 weeks)" },
    { icon: "🔄", label: "New subscription detected" },
    { icon: "📰", label: "Significant market / news event" },
    { icon: "📅", label: "Weekly check-in summary" },
  ];

  const models: { id: StudioConfig["model"]; label: string; sub: string }[] = [
    { id: "Claude", label: "Claude", sub: "Nuanced · Balanced" },
    { id: "GPT-4", label: "GPT-4", sub: "Direct · Bold" },
    { id: "Gemini", label: "Gemini", sub: "Live · Web-aware" },
    { id: "Groq", label: "Groq", sub: "Llama 3.3 · Ultra Fast" },
  ];

  const priceOptions: { id: StudioConfig["price"]; label: string; sub: string }[] = [
    { id: "free", label: "Free", sub: "10 msgs/month" },
    { id: "paid", label: "$5/mo", sub: "Unlimited" },
    { id: "custom", label: "Custom", sub: "You set the price" },
  ];

  // shared input style
  const inputStyle: React.CSSProperties = {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    fontFamily: "var(--font-sora)",
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="px-4 py-6 sm:px-6 lg:px-8 w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="text-[22px] font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
            <em style={{ fontFamily: "var(--font-dm-serif)", fontStyle: "italic", color: "var(--green)" }}>AI Studio</em>
            {" "}<span style={{ color: "var(--muted)", fontSize: 18 }}>— {editBuddyId ? "Edit & Resubmit Buddy" : "Build a Finance Buddy"}</span>
          </div>
          <button
            onClick={handlePublish}
            disabled={publishing || published}
            className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold transition-all duration-150"
            style={{
              background: published ? "rgba(0,196,140,.15)" : "var(--green)",
              color: published ? "var(--green2)" : "#fff",
              border: published ? "1px solid rgba(0,196,140,.3)" : "none",
              opacity: publishing ? 0.75 : 1,
              cursor: publishing ? "wait" : "pointer",
            }}
          >
            {publishing ? "Submitting…" : published ? "✓ Resubmitted for Review" : editBuddyId ? "Resubmit Buddy for Review →" : "Publish to Marketplace"}
          </button>
        </div>

        {/* Admin Correction Note Banner */}
        {adminNote && (
          <div
            className="p-4 rounded-[14px] mb-6 border"
            style={{ background: "rgba(245,166,35,.1)", borderColor: "#F5A623", color: "#C47F00" }}
          >
            <div className="font-bold text-[14px] mb-1">🔄 Admin Correction Instructions</div>
            <div className="text-[13px] italic">&quot;{adminNote}&quot;</div>
            <div className="text-[11px] mt-2 font-medium opacity-90">
              Please adjust the fields below according to the admin&apos;s feedback, then click &quot;Resubmit Buddy for Review&quot;.
            </div>
          </div>
        )}

        {/* Hint badge */}
        {!adminNote && (
          <div
            className="inline-flex items-center gap-2 px-3 py-[5px] rounded-full text-[11px] font-medium mb-6"
            style={{ background: "rgba(245,166,35,.12)", border: "1px solid rgba(245,166,35,.3)", color: "#C47F00" }}
          >
            💡 Complete all 6 steps to publish your buddy and start earning
          </div>
        )}

        {/* Studio layout */}
        <div
          className="grid gap-5 items-start"
          style={{ gridTemplateColumns: "minmax(0,1fr) 300px" }}
        >
          {/* ── Left: Steps ── */}
          <div className="flex flex-col gap-4 min-w-0">

            {/* ─────────────────────────────────────────────────── */}
            {/* Step 1: Buddy Identity                              */}
            {/* ─────────────────────────────────────────────────── */}
            <StepCard
              num="1"
              title="① Buddy Identity"
              done={identityDone}
              badge={identityDone ? "Ready" : undefined}
            >
              {/* Basic info */}
              <div className="flex flex-col gap-3 mb-0">
                <div>
                  <SectionLabel>Buddy Name *</SectionLabel>
                  <input
                    type="text"
                    placeholder="e.g. The Naira Navigator"
                    value={config.buddyName}
                    onChange={(e) => setConfig((c) => ({ ...c, buddyName: e.target.value }))}
                    className="w-full px-3 py-[9px] rounded-[10px] text-[13px] outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <SectionLabel>Tagline *</SectionLabel>
                  <input
                    type="text"
                    placeholder="e.g. Practical Finance · Lagos-Focused"
                    value={config.tag}
                    onChange={(e) => setConfig((c) => ({ ...c, tag: e.target.value }))}
                    className="w-full px-3 py-[9px] rounded-[10px] text-[13px] outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <SectionLabel>Description *</SectionLabel>
                  <textarea
                    rows={3}
                    placeholder="2–3 sentences summarising the buddy's focus and value for users browsing the marketplace."
                    value={config.desc}
                    onChange={(e) => setConfig((c) => ({ ...c, desc: e.target.value }))}
                    className="w-full px-3 py-[9px] rounded-[10px] text-[13px] outline-none resize-none"
                    style={{ ...inputStyle, lineHeight: 1.6 }}
                  />
                </div>
              </div>

              <FieldDivider />

              {/* Avatar */}
              <SectionLabel>Profile Picture</SectionLabel>
              <div className="flex items-center gap-4 mb-3">
                {/* Live preview */}
                <div
                  className="flex items-center justify-center rounded-full border-[3px] flex-shrink-0 text-[22px] overflow-hidden"
                  style={{
                    width: 56, height: 56,
                    background: config.avatarBg,
                    borderColor: "var(--card)",
                    boxShadow: "0 0 0 2px var(--border)",
                    ...(config.avatarIsSerif
                      ? { fontFamily: "var(--font-dm-serif)", fontSize: 20, color: "rgba(255,255,255,.9)" }
                      : {}),
                  }}
                >
                  {isImageAvatar(config.avatarContent) ? (
                    <img src={config.avatarContent} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    config.avatarContent || "?"
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="Emoji or 2-letter initials (e.g. 🎯 or WB)"
                    value={isImageAvatar(config.avatarContent) ? "" : config.avatarContent}
                    onChange={(e) => setConfig((c) => ({ ...c, avatarContent: e.target.value }))}
                    disabled={isImageAvatar(config.avatarContent)}
                    className="w-full px-3 py-[8px] rounded-[10px] text-[13px] outline-none"
                    style={{
                      ...inputStyle,
                      background: isImageAvatar(config.avatarContent) ? "rgba(255,255,255,0.05)" : "var(--bg)",
                      color: isImageAvatar(config.avatarContent) ? "rgba(255,255,255,0.3)" : "var(--text)"
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <label
                      className="px-3 py-1.5 rounded-[8px] text-[11px] font-semibold border cursor-pointer transition-colors hover:bg-neutral-800 flex items-center gap-1.5"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }}
                    >
                      📁 Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            compressImage(file).then((base64) => {
                              if (base64) {
                                setConfig((c) => ({ ...c, avatarContent: base64 }));
                              }
                            });
                          }
                        }}
                      />
                    </label>
                    {isImageAvatar(config.avatarContent) && (
                      <button
                        onClick={() => setConfig((c) => ({ ...c, avatarContent: "🎯" }))}
                        className="px-3 py-1.5 rounded-[8px] text-[11px] font-semibold border transition-colors hover:bg-red-950/20"
                        style={{ borderColor: "rgba(220,38,38,0.2)", color: "#DC2626" }}
                      >
                        Reset to Emoji
                      </button>
                    )}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Toggle
                      on={config.avatarIsSerif}
                      onToggle={() => setConfig((c) => ({ ...c, avatarIsSerif: !c.avatarIsSerif }))}
                      aria-label="Use serif font for initials"
                    />
                    <span className="text-[12px]" style={{ color: "var(--muted)" }}>Serif font (for initials)</span>
                  </label>
                </div>
              </div>
              {/* Avatar bg swatches */}
              <div className="text-[11px] mb-[6px]" style={{ color: "var(--muted)" }}>Background colour</div>
              <div className="flex flex-wrap gap-2 mb-1">
                {AVATAR_BG_PRESETS.map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setConfig((c) => ({ ...c, avatarBg: bg }))}
                    title={bg}
                    className="rounded-full transition-all duration-150"
                    style={{
                      width: 26, height: 26,
                      background: bg,
                      border: config.avatarBg === bg ? "3px solid var(--green)" : "2px solid var(--border)",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>

              <FieldDivider />

              {/* Banner */}
              <SectionLabel>Banner Colour</SectionLabel>
              <div className="flex flex-wrap gap-2 mb-1">
                {BANNER_PRESETS.map((grad) => (
                  <button
                    key={grad}
                    onClick={() => setConfig((c) => ({ ...c, bannerColor: grad }))}
                    title={grad}
                    className="rounded-[6px] transition-all duration-150"
                    style={{
                      width: 44, height: 26,
                      background: grad,
                      border: config.bannerColor === grad ? "3px solid var(--green)" : "2px solid var(--border)",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
              {/* Banner preview strip */}
              <div
                className="mt-3 rounded-[10px] h-[40px]"
                style={{ background: config.bannerColor, border: "1px solid var(--border)" }}
              />

              <FieldDivider />

              {/* Categories */}
              <SectionLabel>Categories *</SectionLabel>
              <div className="flex flex-wrap gap-2 mb-1">
                {Array.from(new Set([...CATEGORY_OPTIONS, ...config.categories])).map((cat) => {
                  const active = config.categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className="px-3 py-[6px] rounded-full text-[12px] font-medium border transition-all duration-150"
                      style={
                        active
                          ? { background: "var(--navy)", color: "#fff", borderColor: "var(--navy)" }
                          : { background: "var(--bg)", color: "var(--muted)", borderColor: "var(--border)" }
                      }
                    >
                      {cat}
                    </button>
                  );
                })}
                <form onSubmit={handleAddCustomCategory} className="flex gap-1">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Other..."
                    className="px-3 py-[6px] rounded-full text-[12px] font-medium border transition-all duration-150 outline-none w-[100px]"
                    style={{ background: "var(--bg)", color: "var(--text)", borderColor: "var(--border)" }}
                  />
                  {customCategory.trim() && (
                    <button
                      type="submit"
                      className="flex items-center justify-center rounded-full text-[14px] font-bold w-[30px] h-[30px] border transition-all duration-150"
                      style={{ background: "var(--navy)", color: "#fff", borderColor: "var(--navy)" }}
                    >
                      +
                    </button>
                  )}
                </form>
              </div>

              <FieldDivider />

              {/* Fan sim */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[13px] font-medium" style={{ color: "var(--text)" }}>Celebrity / Fan Simulation</div>
                  <div className="text-[11px] mt-[2px]" style={{ color: "var(--muted)" }}>Enable if this buddy simulates a real public figure</div>
                </div>
                <Toggle
                  on={config.isFanSim}
                  onToggle={() => setConfig((c) => ({ ...c, isFanSim: !c.isFanSim }))}
                  aria-label="Fan simulation toggle"
                />
              </div>
              {config.isFanSim && (
                <div>
                  <SectionLabel>Legal Disclaimer</SectionLabel>
                  <textarea
                    rows={2}
                    placeholder="e.g. Fan-created simulation based on publicly available books and interviews. Not affiliated with or endorsed by [Name]."
                    value={config.disclaimer}
                    onChange={(e) => setConfig((c) => ({ ...c, disclaimer: e.target.value }))}
                    className="w-full px-3 py-[9px] rounded-[10px] text-[13px] outline-none resize-none"
                    style={{ ...inputStyle, lineHeight: 1.6 }}
                  />
                </div>
              )}

              <FieldDivider />

              {/* Profile page content */}
              <SectionLabel>Philosophy (Profile Page)</SectionLabel>
              <textarea
                rows={3}
                placeholder="A detailed paragraph about the buddy's investment or financial philosophy — shown on the full profile page."
                value={config.philosophy}
                onChange={(e) => setConfig((c) => ({ ...c, philosophy: e.target.value }))}
                className="w-full px-3 py-[9px] rounded-[10px] text-[13px] outline-none resize-none mb-4"
                style={{ ...inputStyle, lineHeight: 1.6 }}
              />

              <SectionLabel>Sample Messages (Profile Page)</SectionLabel>
              <div className="flex flex-col gap-2 mb-1">
                {config.samples.map((s, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <textarea
                      rows={2}
                      placeholder={`Sample message ${i + 1}…`}
                      value={s}
                      onChange={(e) => updateSample(i, e.target.value)}
                      className="flex-1 px-3 py-[9px] rounded-[10px] text-[13px] outline-none resize-none"
                      style={{ ...inputStyle, lineHeight: 1.6 }}
                    />
                    {config.samples.length > 1 && (
                      <button
                        onClick={() => removeSample(i)}
                        className="mt-[10px] text-[16px] w-6 h-6 flex items-center justify-center flex-shrink-0"
                        style={{ color: "var(--muted)", background: "transparent", border: "none", cursor: "pointer" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#E24B4A"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; }}
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addSample}
                className="text-[12px] font-medium mt-1 mb-4"
                style={{ color: "var(--green)", background: "transparent", border: "none", cursor: "pointer" }}
              >
                + Add sample message
              </button>

              <SectionLabel>What&apos;s Included (Profile Page)</SectionLabel>
              <div className="flex flex-col gap-2 mb-1">
                {config.includes.map((inc, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="e.g. Unlimited chat sessions"
                      value={inc}
                      onChange={(e) => updateInclude(i, e.target.value)}
                      className="flex-1 px-3 py-[8px] rounded-[10px] text-[13px] outline-none"
                      style={inputStyle}
                    />
                    {config.includes.length > 1 && (
                      <button
                        onClick={() => removeInclude(i)}
                        className="text-[16px] w-6 h-6 flex items-center justify-center flex-shrink-0"
                        style={{ color: "var(--muted)", background: "transparent", border: "none", cursor: "pointer" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#E24B4A"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; }}
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addInclude}
                className="text-[12px] font-medium mt-1 mb-4"
                style={{ color: "var(--green)", background: "transparent", border: "none", cursor: "pointer" }}
              >
                + Add item
              </button>

              <SectionLabel>Price Note (shown under price on profile page)</SectionLabel>
              <input
                type="text"
                placeholder="e.g. 3-day free trial · Cancel anytime"
                value={config.priceNote}
                onChange={(e) => setConfig((c) => ({ ...c, priceNote: e.target.value }))}
                className="w-full px-3 py-[9px] rounded-[10px] text-[13px] outline-none"
                style={inputStyle}
              />
            </StepCard>

            {/* ─────────────────────────────────────────────────── */}
            {/* Step 2: Knowledge Base                              */}
            {/* ─────────────────────────────────────────────────── */}
            <StepCard num="2" title="② Knowledge Base" done={files.length > 0} badge={files.length > 0 ? `${files.length} sources` : undefined}>
              <label
                className="flex flex-col items-center justify-center gap-1 py-5 rounded-[12px] border-2 border-dashed cursor-pointer transition-all duration-150 mb-3"
                style={{ borderColor: "var(--border)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLLabelElement).style.borderColor = "var(--green)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLLabelElement).style.borderColor = "var(--border)"; }}
              >
                <div className="text-[22px]">📚</div>
                <div className="text-[13px] font-medium" style={{ color: "var(--muted)" }}>Click or drop PDFs, text files, or transcripts</div>
                <div className="text-[11px]" style={{ color: "var(--border)" }}>Books · Articles · Transcripts · Course materials</div>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.doc,.docx,.csv"
                  className="hidden"
                  onChange={handleKnowledgeFileUpload}
                />
              </label>
              <div className="flex flex-col gap-2">
                {files.length === 0 ? (
                  <div className="text-[12px] text-center py-2" style={{ color: "var(--muted)" }}>
                    No knowledge files uploaded yet. Upload PDFs or text files above to add domain context for your buddy.
                  </div>
                ) : (
                  files.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 px-3 py-[10px] rounded-[10px]" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center justify-center rounded-[8px] text-[14px] flex-shrink-0" style={{ width: 32, height: 32, background: f.bg }}>{f.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium truncate" style={{ color: "var(--text)" }}>{f.name}</div>
                        <div className="text-[11px]" style={{ color: "var(--muted)" }}>{f.meta}</div>
                      </div>
                      <button
                        onClick={() => removeFile(f.id)}
                        className="text-[16px] w-6 h-6 flex items-center justify-center"
                        style={{ color: "var(--muted)", background: "transparent", border: "none", cursor: "pointer" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#E24B4A"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)"; }}
                      >×</button>
                    </div>
                  ))
                )}
              </div>
            </StepCard>

            {/* ─────────────────────────────────────────────────── */}
            {/* Step 3: Personality Engineering                     */}
            {/* ─────────────────────────────────────────────────── */}
            <StepCard num="3" title="③ Personality Engineering">
              <PersonalitySlider
                leftLabel="Conservative" centerLabel="Tone" rightLabel="Aggressive"
                value={config.tone} onChange={(v) => setConfig((c) => ({ ...c, tone: v }))}
              />
              <PersonalitySlider
                leftLabel="Soft" centerLabel="Delivery" rightLabel="Blunt"
                value={config.delivery} onChange={(v) => setConfig((c) => ({ ...c, delivery: v }))}
              />
              <PersonalitySlider
                leftLabel="Formal" centerLabel="Register" rightLabel="Casual"
                value={config.register} onChange={(v) => setConfig((c) => ({ ...c, register: v }))}
              />
              <div className="mt-3">
                <div className="text-[11px] font-semibold uppercase tracking-[.4px] mb-[6px]" style={{ color: "var(--muted)" }}>Signature Phrase</div>
                <input
                  type="text"
                  value={config.signaturePhrase}
                  onChange={(e) => setConfig((c) => ({ ...c, signaturePhrase: e.target.value }))}
                  className="w-full px-3 py-[9px] rounded-[10px] text-[13px] outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="mt-3">
                <div className="text-[11px] font-semibold uppercase tracking-[.4px] mb-[6px]" style={{ color: "var(--muted)" }}>Will NOT advise on</div>
                <input
                  type="text"
                  value={config.willNotAdviseOn}
                  onChange={(e) => setConfig((c) => ({ ...c, willNotAdviseOn: e.target.value }))}
                  className="w-full px-3 py-[9px] rounded-[10px] text-[13px] outline-none"
                  style={inputStyle}
                />
              </div>
            </StepCard>

            {/* ─────────────────────────────────────────────────── */}
            {/* Step 4: AI Model                                    */}
            {/* ─────────────────────────────────────────────────── */}
            <StepCard num="4" title="④ AI Model Selection">
              <div className="text-[12px] mb-4" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                Choose the underlying AI model. Each has a distinct reasoning style — match it to the persona you&apos;re building.
              </div>
              <div className="flex gap-2">
                {models.map((m) => {
                  const sel = config.model === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setConfig((c) => ({ ...c, model: m.id }))}
                      className="flex-1 py-3 px-2 rounded-[10px] text-center cursor-pointer transition-all duration-150"
                      style={{
                        border: sel ? "2px solid var(--green)" : "1px solid var(--border)",
                        background: sel ? "rgba(0,196,140,.05)" : "transparent",
                      }}
                    >
                      <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{m.label}</div>
                      <div className="text-[10px] mt-[3px]" style={{ color: sel ? "var(--green2)" : "var(--muted)" }}>{m.sub}</div>
                    </button>
                  );
                })}
              </div>
            </StepCard>

            {/* ─────────────────────────────────────────────────── */}
            {/* Step 5: Notification Triggers                       */}
            {/* ─────────────────────────────────────────────────── */}
            <StepCard num="5" title="⑤ Notification Triggers">
              <div className="text-[12px] mb-4" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                Configure which financial events cause this buddy to reach out proactively. Users can adjust these further in their own settings.
              </div>
              {triggerLabels.map((t, i) => (
                <div
                  key={t.label}
                  className="flex items-center gap-[10px] py-[9px]"
                  style={{ borderBottom: i < triggerLabels.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <span className="text-[15px] w-5 text-center flex-shrink-0">{t.icon}</span>
                  <span className="flex-1 text-[13px]" style={{ color: "var(--text)" }}>{t.label}</span>
                  <Toggle
                    on={config.triggers[i]}
                    aria-label={t.label}
                    onToggle={() => setConfig((c) => {
                      const triggers = [...c.triggers];
                      triggers[i] = !triggers[i];
                      return { ...c, triggers };
                    })}
                  />
                </div>
              ))}
              <div className="flex items-center gap-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                <span className="text-[12px] flex-1" style={{ color: "var(--muted)" }}>Max notifications / week</span>
                <input
                  type="number" min={1} max={7}
                  value={config.maxNotifs}
                  onChange={(e) => setConfig((c) => ({ ...c, maxNotifs: Number(e.target.value) }))}
                  className="text-center text-[13px] outline-none rounded-[8px] py-[7px]"
                  style={{ width: 56, border: "1px solid var(--border)", color: "var(--text)", background: "var(--bg)", fontFamily: "var(--font-sora)" }}
                />
              </div>
            </StepCard>

            {/* ─────────────────────────────────────────────────── */}
            {/* Step 6: Pricing & Publishing                        */}
            {/* ─────────────────────────────────────────────────── */}
            <StepCard num="6" title="⑥ Pricing &amp; Publishing">
              <div className="flex gap-2 mb-4">
                {priceOptions.map((p) => {
                  const sel = config.price === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setConfig((c) => ({ ...c, price: p.id }))}
                      className="flex-1 py-3 px-2 rounded-[10px] text-center cursor-pointer transition-all duration-150"
                      style={{
                        border: sel ? "2px solid var(--green)" : "1px solid var(--border)",
                        background: sel ? "rgba(0,196,140,.05)" : "transparent",
                      }}
                    >
                      <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{p.label}</div>
                      <div className="text-[11px] mt-[2px]" style={{ color: sel ? "var(--green2)" : "var(--muted)" }}>
                        {p.id === "custom" && sel ? "You set the price" : sel ? "Unlimited · Selected" : p.sub}
                      </div>
                    </button>
                  );
                })}
              </div>

              {config.price === "custom" && (
                <div className="mb-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[.4px] mb-[6px]" style={{ color: "var(--muted)" }}>Monthly Price ($) *</div>
                  <input
                    type="number"
                    value={config.customPrice}
                    onChange={(e) => setConfig((c) => ({ ...c, customPrice: e.target.value }))}
                    placeholder="e.g. 1500"
                    className="w-full px-3 py-[9px] rounded-[10px] text-[13px] outline-none"
                    style={inputStyle}
                  />
                </div>
              )}

              {effectivePrice > 0 && (
                <div className="rounded-[10px] p-4 mb-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div className="text-[11px] font-semibold uppercase tracking-[.5px] mb-3" style={{ color: "var(--muted)" }}>Revenue Estimate</div>
                  <div className="flex justify-between text-[13px] mb-1">
                    <span style={{ color: "var(--muted)" }}>100 users × ${effectivePrice.toLocaleString("en-US")}</span>
                    <span className="font-semibold" style={{ color: "var(--text)" }}>${(effectivePrice * 100).toLocaleString("en-US")}/mo</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span style={{ color: "var(--muted)" }}>Your 70% share</span>
                    <span className="font-semibold" style={{ color: "var(--green2)" }}>${(effectivePrice * 100 * 0.7).toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo</span>
                  </div>
                </div>
              )}

              <button
                onClick={handlePublish}
                disabled={publishing || published}
                className="w-full py-[10px] rounded-[10px] text-[13px] font-semibold transition-all duration-150"
                style={{
                  background: published ? "rgba(0,196,140,.15)" : "var(--green)",
                  color: published ? "var(--green2)" : "#fff",
                  border: published ? "1px solid rgba(0,196,140,.3)" : "none",
                  opacity: publishing ? 0.75 : 1,
                  cursor: publishing ? "wait" : "pointer",
                }}
              >
                {publishing ? "Submitting…" : published ? "✓ Submitted for Review" : "Submit for Review & Publish →"}
              </button>

              {published && (
                <div className="mt-3 text-[11px] text-center" style={{ color: "var(--muted)" }}>
                  🎉 Your buddy is in review. Estimated: 24–48 hours. You&apos;ll be notified when it goes live.
                </div>
              )}
            </StepCard>

          </div>

          {/* ── Right: Preview + Revenue ── */}
          <div className="flex flex-col gap-4" style={{ position: "sticky", top: 16 }}>

            {/* Listing preview card */}
            <div className="overflow-hidden rounded-[16px]" style={{ border: "1px solid var(--border)" }}>
              {/* Mini marketplace card preview */}
              <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
                <div className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>Marketplace Card Preview</div>
              </div>
              {/* Banner */}
              <div
                className="h-16 relative"
                style={{ background: config.bannerColor || "var(--bg)" }}
              >
                <span
                  className="absolute top-[8px] right-[8px] px-[8px] py-[2px] rounded-full text-[9px] font-semibold uppercase tracking-[.5px]"
                  style={
                    config.price === "free"
                      ? { background: "rgba(0,196,140,.2)", color: "#00A677" }
                      : { background: "rgba(245,166,35,.2)", color: "#C47F00" }
                  }
                >
                  {config.price === "free" ? "Free" : config.price === "paid" ? "$5/mo" : config.customPrice ? `$${config.customPrice}/mo` : "Custom"}
                </span>
                {/* Avatar */}
                <div
                  className="absolute flex items-center justify-center rounded-full border-[2px] text-[16px] overflow-hidden"
                  style={{
                    width: 44, height: 44,
                    bottom: -16, left: 14,
                    background: config.avatarBg,
                    borderColor: "var(--card)",
                    ...(config.avatarIsSerif
                      ? { fontFamily: "var(--font-dm-serif)", fontSize: 15, color: "rgba(255,255,255,.9)" }
                      : {}),
                  }}
                >
                  {isImageAvatar(config.avatarContent) ? (
                    <img src={config.avatarContent} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    config.avatarContent || "?"
                  )}
                </div>
              </div>
              {/* Card body */}
              <div className="px-3 pt-6 pb-3" style={{ background: "var(--card)" }}>
                <div className="text-[13px] font-semibold mb-[2px]" style={{ color: "var(--text)" }}>
                  {config.buddyName || <span style={{ color: "var(--border)" }}>Buddy Name</span>}
                </div>
                <div className="text-[10px] mb-[8px]" style={{ color: "var(--muted)" }}>
                  {config.tag || <span style={{ color: "var(--border)" }}>Tagline</span>}
                </div>
                <div className="text-[11px] leading-relaxed mb-[10px]" style={{ color: "var(--muted)" }}>
                  {config.desc
                    ? config.desc.slice(0, 90) + (config.desc.length > 90 ? "…" : "")
                    : <span style={{ color: "var(--border)" }}>Description will appear here…</span>}
                </div>
                {/* Categories */}
                {config.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-[8px]">
                    {config.categories.slice(0, 3).map((cat) => (
                      <span
                        key={cat}
                        className="px-2 py-[2px] rounded-full text-[9px] font-medium"
                        style={{ background: "var(--bg)", color: "var(--muted)", border: "1px solid var(--border)" }}
                      >{cat}</span>
                    ))}
                  </div>
                )}
                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[4px] text-[10px]" style={{ color: "var(--muted)" }}>
                    <span
                      className="inline-block w-[5px] h-[5px] rounded-full"
                      style={{
                        background: config.model === "Claude" ? "#7B68EE" : config.model === "GPT-4" ? "#10A37F" : "#4285F4"
                      }}
                    />
                    {config.model}
                  </div>
                  {config.isFanSim && (
                    <span
                      className="px-2 py-[2px] rounded-full text-[9px] font-semibold border"
                      style={{ background: "rgba(245,166,35,.1)", borderColor: "rgba(245,166,35,.25)", color: "#C47F00" }}
                    >Fan Sim</span>
                  )}
                </div>
              </div>
            </div>

            {/* Live Preview panel */}
            <div className="overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 16 }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>Live Preview</div>
                <div className="flex items-center gap-[5px] text-[11px] font-medium" style={{ color: "var(--green)" }}>
                  <span
                    className="inline-block rounded-full"
                    style={{ width: 6, height: 6, background: "var(--green)", animation: "pulse 2s infinite" }}
                  />
                  Real-time
                </div>
              </div>

              <div
                ref={previewScrollRef}
                className="flex flex-col gap-[10px] p-[14px] overflow-y-auto"
                style={{ background: "var(--bg)", minHeight: 200, maxHeight: 300 }}
              >
                {previewMsgs.map((msg, i) => (
                  <div
                    key={i}
                    className="text-[12px] px-[13px] py-[10px] max-w-[88%]"
                    style={{
                      borderRadius: msg.role === "assistant" ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
                      background: msg.role === "assistant" ? "var(--card)" : "var(--navy)",
                      border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
                      color: msg.role === "assistant" ? "var(--text)" : "#fff",
                      lineHeight: 1.55,
                      alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    {msg.content}
                    {msg.streaming && (
                      <span
                        className="inline-block w-[2px] h-[12px] ml-[2px] rounded-sm align-middle"
                        style={{ background: "var(--green)", animation: "blink 1s step-end infinite" }}
                      />
                    )}
                  </div>
                ))}
                <div ref={previewEndRef} />
              </div>

              <div className="flex gap-2 px-[14px] py-[10px]" style={{ borderTop: "1px solid var(--border)" }}>
                <input
                  type="text"
                  placeholder="Test your buddy…"
                  value={previewInput}
                  onChange={(e) => setPreviewInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendPreview()}
                  disabled={previewStreaming}
                  className="flex-1 text-[12px] rounded-[8px] px-[11px] py-[7px] outline-none"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    fontFamily: "var(--font-sora)",
                    opacity: previewStreaming ? 0.7 : 1,
                  }}
                />
                <button
                  onClick={sendPreview}
                  disabled={previewStreaming || !previewInput.trim()}
                  className="flex items-center justify-center rounded-[8px] text-white font-bold text-[14px] flex-shrink-0 transition-all duration-150"
                  style={{
                    width: 30, height: 30,
                    background: previewStreaming || !previewInput.trim() ? "var(--border)" : "var(--green)",
                    border: "none",
                    cursor: previewStreaming || !previewInput.trim() ? "not-allowed" : "pointer",
                  }}
                >→</button>
              </div>
            </div>

            {/* Revenue projection */}
            <div className="rounded-[16px] p-[18px]" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="text-[13px] font-semibold mb-3" style={{ color: "var(--text)" }}>Revenue Projection</div>
              {effectivePrice === 0 ? (
                <div className="text-[12px] text-center py-3" style={{ color: "var(--muted)" }}>
                  Set a paid price tier to see projections
                </div>
              ) : (
                <>
                  <RevRow label="50 subscribers" amount={rev70(50)} />
                  <RevRow label="100 subscribers" amount={rev70(100)} />
                  <RevRow label="500 subscribers" amount={rev70(500)} highlight />
                  <div className="text-[10px] mt-3" style={{ color: "var(--muted)" }}>
                    After Smart Money&apos;s 30% platform fee · Paid monthly
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pulse {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:.5;transform:scale(1.3)}
        }
      `}</style>
    </div>
  );
}
