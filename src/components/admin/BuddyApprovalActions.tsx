"use client";

import { useState, useTransition } from "react";
import {
  approveBuddyAction,
  requestBuddyRevisionAction,
  flagBuddyViolationAction,
  rejectBuddyAction,
  updateBuddyByAdminAction,
} from "@/app/admin/approvals/actions";
import { PendingBuddy } from "@/lib/db";
import { isImageAvatar } from "@/lib/utils";

export function BuddyApprovalActions({ buddy }: { buddy: PendingBuddy }) {
  const [mode, setMode] = useState<"idle" | "revision" | "flag" | "edit">("idle");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [isPending, startTransition] = useTransition();

  // Edit form states
  const [editName, setEditName] = useState(buddy.name);
  const [editTag, setEditTag] = useState(buddy.tag || "");
  const [editDesc, setEditDesc] = useState(buddy.description || "");
  const [editPhilosophy, setEditPhilosophy] = useState(buddy.philosophy || "");
  const [editModel, setEditModel] = useState(buddy.ai_model || "claude");
  const [editPrice, setEditPrice] = useState(String(buddy.price_monthly ?? 0));
  const [editAvatarContent, setEditAvatarContent] = useState(buddy.avatar_content || "🤖");
  const [editAvatarBg, setEditAvatarBg] = useState(buddy.avatar_bg || "#1A3A6E");
  const [editAvatarIsSerif, setEditAvatarIsSerif] = useState(buddy.avatar_is_serif ?? false);
  const [editDisclaimer, setEditDisclaimer] = useState(buddy.fan_disclaimer || "");

  function handleApprove() {
    startTransition(async () => {
      await approveBuddyAction(buddy.id);
    });
  }

  function handleRequestRevision() {
    if (!feedbackInput.trim() || isPending) return;
    startTransition(async () => {
      await requestBuddyRevisionAction(buddy.id, feedbackInput.trim());
      setMode("idle");
      setFeedbackInput("");
    });
  }

  function handleFlagViolation() {
    if (!feedbackInput.trim() || isPending) return;
    startTransition(async () => {
      await flagBuddyViolationAction(buddy.id, feedbackInput.trim());
      setMode("idle");
      setFeedbackInput("");
    });
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim() || isPending) return;
    startTransition(async () => {
      await updateBuddyByAdminAction(buddy.id, {
        name: editName.trim(),
        tag: editTag.trim() || null,
        description: editDesc.trim() || null,
        philosophy: editPhilosophy.trim() || null,
        ai_model: editModel,
        price_monthly: Number(editPrice) || 0,
        avatar_content: editAvatarContent,
        avatar_bg: editAvatarBg,
        avatar_is_serif: editAvatarIsSerif,
        fan_disclaimer: editDisclaimer.trim() || null,
      });
      setMode("idle");
    });
  }

  const compressImage = (file: File, maxDimension = 300, quality = 0.85): Promise<string> => {
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
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImage(file).then((dataUrl) => {
      if (dataUrl) setEditAvatarContent(dataUrl);
    });
  };

  return (
    <div style={{ marginTop: 14 }}>
      {/* ── Status Banner if not purely pending ── */}
      {buddy.status !== "pending" && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 12,
            background:
              buddy.status === "revision_requested"
                ? "rgba(245,166,35,.12)"
                : buddy.status === "flagged" || buddy.status === "rejected"
                ? "rgba(220,38,38,.1)"
                : "rgba(0,196,140,.1)",
            border: `1px solid ${
              buddy.status === "revision_requested"
                ? "rgba(245,166,35,.3)"
                : buddy.status === "flagged" || buddy.status === "rejected"
                ? "rgba(220,38,38,.25)"
                : "rgba(0,196,140,.2)"
            }`,
            color:
              buddy.status === "revision_requested"
                ? "#C47F00"
                : buddy.status === "flagged" || buddy.status === "rejected"
                ? "#DC2626"
                : "#00A677",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 2 }}>
            Status: {buddy.status === "revision_requested" ? "🔄 Corrections Requested" : buddy.status === "flagged" ? "🚩 Flagged for Violation" : buddy.status}
          </div>
          {buddy.rejection_reason && (
            <div style={{ fontSize: 11, fontStyle: "italic", opacity: 0.9 }}>
              &quot;{buddy.rejection_reason}&quot;
            </div>
          )}
        </div>
      )}

      {/* ── Revision / Flag Input Mode ── */}
      {(mode === "revision" || mode === "flag") && (
        <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 10, border: "1px solid #E2E7F0" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#0B1E3D", marginBottom: 6 }}>
            {mode === "revision" ? "🔄 Send Correction Feedback to Creator" : "🚩 Flag Buddy for Violation"}
          </div>
          <textarea
            value={feedbackInput}
            onChange={(e) => setFeedbackInput(e.target.value)}
            placeholder={
              mode === "revision"
                ? "Explain specific corrections needed (e.g., update description to avoid misleading financial claims)..."
                : "Enter violation reason (e.g., violates policy regarding illegal investment schemes)..."
            }
            rows={3}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #CBD5E1",
              borderRadius: 8,
              fontSize: 12,
              color: "#0B1E3D",
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={() => { setMode("idle"); setFeedbackInput(""); }}
              disabled={isPending}
              style={{
                flex: 1,
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                background: "#fff",
                fontSize: 12,
                fontWeight: 600,
                color: "#64748B",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={mode === "revision" ? handleRequestRevision : handleFlagViolation}
              disabled={!feedbackInput.trim() || isPending}
              style={{
                flex: 1,
                padding: "7px 12px",
                borderRadius: 8,
                border: "none",
                background: mode === "revision" ? "#F5A623" : "#DC2626",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: !feedbackInput.trim() || isPending ? "not-allowed" : "pointer",
                opacity: !feedbackInput.trim() || isPending ? 0.6 : 1,
              }}
            >
              {isPending ? "Sending…" : mode === "revision" ? "Send Corrections" : "Flag Violation"}
            </button>
          </div>
        </div>
      )}

      {/* ── Admin Edit Buddy Modal / Inline Form ── */}
      {mode === "edit" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setMode("idle"); }}
        >
          <form
            onSubmit={handleSaveEdit}
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 520,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0B1E3D" }}>✏️ Admin Edit Buddy</div>
              <button
                type="button"
                onClick={() => setMode("idle")}
                style={{ background: "none", border: "none", fontSize: 20, color: "#64748B", cursor: "pointer" }}
              >×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Avatar Preview & Photo Picker */}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: "50%",
                    background: editAvatarBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: isImageAvatar(editAvatarContent) ? 14 : 20,
                    overflow: "hidden",
                    border: "2px solid #E2E7F0",
                  }}
                >
                  {isImageAvatar(editAvatarContent) ? (
                    <img src={editAvatarContent} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    editAvatarContent
                  )}
                </div>
                <div>
                  <label
                    style={{
                      display: "inline-block",
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "1px solid #CBD5E1",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#0B1E3D",
                      cursor: "pointer",
                    }}
                  >
                    📁 Upload Photo
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
                  </label>
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Or type emoji/initials below</div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Buddy Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Tagline</label>
                <input
                  type="text"
                  value={editTag}
                  onChange={(e) => setEditTag(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, fontFamily: "inherit" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Philosophy / Core Mindset</label>
                <textarea
                  value={editPhilosophy}
                  onChange={(e) => setEditPhilosophy(e.target.value)}
                  rows={2}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, fontFamily: "inherit" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>AI Engine</label>
                  <select
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                  >
                    <option value="claude">Claude</option>
                    <option value="gpt-4">GPT-4</option>
                    <option value="gemini">Gemini</option>
                    <option value="groq">Groq (Llama 3.3 70B)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Monthly Price (₦)</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Fan / Simulator Disclaimer</label>
                <input
                  type="text"
                  value={editDisclaimer}
                  onChange={(e) => setEditDisclaimer(e.target.value)}
                  placeholder="e.g. Parody / Fan simulation for educational purposes"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12 }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                onClick={() => setMode("idle")}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: 8,
                  border: "1px solid #CBD5E1",
                  background: "#fff",
                  color: "#64748B",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: 8,
                  border: "none",
                  background: "#00C48C",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: isPending ? "not-allowed" : "pointer",
                }}
              >
                {isPending ? "Saving Changes…" : "Save Buddy Edits"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Main Action Buttons Grid ── */}
      {mode === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              onClick={() => setMode("edit")}
              disabled={isPending}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                background: "#ffffff",
                fontSize: 12,
                fontWeight: 600,
                color: "#0B1E3D",
                cursor: "pointer",
              }}
            >
              ✏️ Edit Details
            </button>

            <button
              onClick={handleApprove}
              disabled={isPending}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "none",
                background: "#00C48C",
                fontSize: 12,
                fontWeight: 600,
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              {isPending ? "Approving…" : "✅ Approve"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              onClick={() => setMode("revision")}
              disabled={isPending}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #F5A623",
                background: "rgba(245,166,35,.08)",
                fontSize: 12,
                fontWeight: 600,
                color: "#C47F00",
                cursor: "pointer",
              }}
            >
              🔄 Request Correction
            </button>

            <button
              onClick={() => setMode("flag")}
              disabled={isPending}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(220,38,38,.4)",
                background: "rgba(220,38,38,.08)",
                fontSize: 12,
                fontWeight: 600,
                color: "#DC2626",
                cursor: "pointer",
              }}
            >
              🚩 Flag Violation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
