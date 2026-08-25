"use client";

import { useState } from "react";
import type { DbBuddy } from "@/lib/db";
import {
  hideBuddyAction,
  unhideBuddyAction,
  createBuddyAction,
  updateBuddyAction,
  deleteBuddyAction,
} from "@/app/admin/buddies/actions";
import { popup } from "@/store/popupStore";
import { isImageAvatar } from "@/lib/utils";

interface Props {
  initialBuddies: DbBuddy[];
  initialHiddenIds: string[];
}

export function AdminBuddiesManager({ initialBuddies, initialHiddenIds }: Props) {
  const [buddies, setBuddies] = useState<DbBuddy[]>(initialBuddies);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set(initialHiddenIds));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBuddy, setEditingBuddy] = useState<DbBuddy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live AI Model Testing Sandbox state
  const [testPrompt, setTestPrompt] = useState("How should I allocate my ₦300,000 monthly income between savings, investments, and personal expenses?");
  const [testResponse, setTestResponse] = useState("");
  const [isTestingAi, setIsTestingAi] = useState(false);

  // Form Fields
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formTag, setFormTag] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPhilosophy, setFormPhilosophy] = useState("");
  const [formPriceNaira, setFormPriceNaira] = useState(0);
  const [formAiModel, setFormAiModel] = useState("claude");
  const [formStatus, setFormStatus] = useState("live");
  const [formAvatarContent, setFormAvatarContent] = useState("🤖");
  const [formAvatarBg, setFormAvatarBg] = useState("#1A3A6E");
  const [formAvatarIsSerif, setFormAvatarIsSerif] = useState(false);
  const [formBannerColor, setFormBannerColor] = useState("linear-gradient(135deg,#0B1E3D,#1A3A6E)");
  const [formCategories, setFormCategories] = useState("Investing, Value Investing");
  const [formIsFanSim, setFormIsFanSim] = useState(false);
  const [formFanDisclaimer, setFormFanDisclaimer] = useState("");

  const handleTestAiResponse = async () => {
    if (!testPrompt.trim()) {
      popup.error("Validation Error", "Please enter a test prompt for the AI.");
      return;
    }
    setIsTestingAi(true);
    setTestResponse("");

    try {
      const res = await fetch("/api/admin/test-buddy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          tag: formTag,
          philosophy: formPhilosophy,
          ai_model: formAiModel,
          is_fan_sim: formIsFanSim,
          fan_disclaimer: formFanDisclaimer,
          testPrompt: testPrompt.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate test AI response.");
      }

      setTestResponse(data.response || "No response text generated.");
      popup.success("AI Model Response Ready!", `Successfully generated response using model engine: ${data.modelUsed}.`);
    } catch (err: any) {
      console.error(err);
      popup.error("AI Test Error", err.message || "Failed to query AI model.");
    } finally {
      setIsTestingAi(false);
    }
  };

  const openCreateModal = () => {
    setEditingBuddy(null);
    setFormId("");
    setFormName("");
    setFormTag("");
    setFormDescription("");
    setFormPhilosophy("");
    setFormPriceNaira(0);
    setFormAiModel("claude");
    setFormStatus("live");
    setFormAvatarContent("🤖");
    setFormAvatarBg("#1A3A6E");
    setFormAvatarIsSerif(false);
    setFormBannerColor("linear-gradient(135deg,#0B1E3D,#1A3A6E)");
    setFormCategories("Investing");
    setFormIsFanSim(false);
    setFormFanDisclaimer("");
    setTestResponse("");
    setModalOpen(true);
  };

  const openEditModal = (buddy: DbBuddy) => {
    setEditingBuddy(buddy);
    setFormId(buddy.id);
    setFormName(buddy.name || "");
    setFormTag(buddy.tag || "");
    setFormDescription(buddy.description || "");
    setFormPhilosophy(buddy.philosophy || "");
    setFormPriceNaira(Math.round((buddy.price_monthly || 0) / 100));
    setFormAiModel(buddy.ai_model || "claude");
    setFormStatus(buddy.status || "live");
    setFormAvatarContent(buddy.avatar_content || "🤖");
    setFormAvatarBg(buddy.avatar_bg || "#1A3A6E");
    setFormAvatarIsSerif(buddy.avatar_is_serif ?? false);
    setFormBannerColor(buddy.banner_color || "linear-gradient(135deg,#0B1E3D,#1A3A6E)");
    setFormCategories((buddy.category || []).join(", "));
    setFormIsFanSim(buddy.is_fan_sim || false);
    setFormFanDisclaimer(buddy.fan_disclaimer || "");
    setTestResponse("");
    setModalOpen(true);
  };

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    compressImage(file).then((dataUrl) => {
      if (dataUrl) {
        setFormAvatarContent(dataUrl);
        popup.success("Photo Prepared", "Buddy photo processed & optimized! Click Save to update database.");
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      popup.error("Validation Error", "Please provide a buddy name.");
      return;
    }

    setIsSubmitting(true);
    const categoryArray = formCategories
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const priceMonthlyKobo = Math.max(0, Math.round(formPriceNaira * 100));

    const payload: Partial<DbBuddy> = {
      name: formName.trim(),
      tag: formTag.trim(),
      description: formDescription.trim(),
      philosophy: formPhilosophy.trim(),
      price_monthly: priceMonthlyKobo,
      ai_model: formAiModel,
      status: formStatus,
      avatar_content: formAvatarContent.trim() || "🤖",
      avatar_bg: formAvatarBg.trim() || "#1A3A6E",
      avatar_is_serif: formAvatarIsSerif,
      banner_color: formBannerColor.trim() || "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
      category: categoryArray.length > 0 ? categoryArray : ["General"],
      is_fan_sim: formIsFanSim,
      fan_disclaimer: formIsFanSim ? formFanDisclaimer.trim() : null,
    };

    try {
      if (editingBuddy) {
        const updated = await updateBuddyAction(editingBuddy.id, payload);
        setBuddies((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        popup.success("Buddy Updated", `Successfully updated ${updated.name}.`);
      } else {
        if (formId.trim()) payload.id = formId.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
        const created = await createBuddyAction(payload);
        setBuddies((prev) => [created, ...prev]);
        popup.success("Buddy Created", `Successfully added ${created.name} to the database.`);
      }
      setModalOpen(false);
    } catch (err: any) {
      console.error(err);
      popup.error("Save Error", err.message || "Failed to save buddy to database.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (buddy: DbBuddy) => {
    popup.danger(
      `Delete "${buddy.name}"?`,
      "This will permanently delete this Buddy from the database along with its configuration. This action cannot be undone.",
      async () => {
        try {
          await deleteBuddyAction(buddy.id);
          setBuddies((prev) => prev.filter((b) => b.id !== buddy.id));
          popup.success("Buddy Deleted", `"${buddy.name}" was deleted from the database.`);
        } catch (err: any) {
          popup.error("Delete Error", err.message || "Failed to delete buddy.");
        }
      },
      "Delete Permanently"
    );
  };

  const handleToggleHide = async (buddyId: string) => {
    const isCurrentlyHidden = hiddenIds.has(buddyId);
    try {
      if (isCurrentlyHidden) {
        await unhideBuddyAction(buddyId);
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(buddyId);
          return next;
        });
        popup.success("Visibility Updated", "Buddy is now visible in the Marketplace.");
      } else {
        await hideBuddyAction(buddyId);
        setHiddenIds((prev) => new Set(prev).add(buddyId));
        popup.success("Visibility Updated", "Buddy hidden from the Marketplace.");
      }
    } catch (err: any) {
      popup.error("Action Failed", err.message || "Could not update visibility.");
    }
  };

  // Filter Buddies
  const filteredBuddies = buddies.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.tag && b.tag.toLowerCase().includes(search.toLowerCase())) ||
      (b.description && b.description.toLowerCase().includes(search.toLowerCase()));

    const isHidden = hiddenIds.has(b.id);
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "hidden"
        ? isHidden
        : statusFilter === "pending"
        ? (b.status === "pending" || b.status === "in_review") && !isHidden
        : b.status === statusFilter && !isHidden;

    const matchesCategory =
      categoryFilter === "all"
        ? true
        : categoryFilter === "fan_sim"
        ? b.is_fan_sim
        : categoryFilter === "archetype"
        ? !b.is_fan_sim
        : (b.category || []).includes(categoryFilter);

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div>
      {/* Top Header & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--text)" }}>
            🤖 Marketplace Buddy Catalogue
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--muted)" }}>
            {buddies.length} Total Buddies in Database · {hiddenIds.size} Hidden from Marketplace
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-5 py-2.5 rounded-[10px] text-[13px] font-bold text-white transition-all shadow-md flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg, #00C48C 0%, #009E70 100%)",
            cursor: "pointer",
          }}
        >
          <span>＋</span> Add New Buddy
        </button>
      </div>

      {/* Filter Bar */}
      <div
        className="p-4 rounded-[14px] border mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
          boxShadow: "0 2px 8px var(--shadow)",
        }}
      >
        <div className="relative flex-1 min-w-[240px]">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px]" style={{ color: "var(--muted)" }}>🔍</span>
          <input
            type="text"
            placeholder="Search buddies by name, tag, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-[10px] text-[13px] outline-none transition-all"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-[10px] text-[12px] font-semibold outline-none border cursor-pointer"
            style={{
              background: "var(--bg)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          >
            <option value="all">Status: All</option>
            <option value="live">Live Only</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending Review</option>
            <option value="rejected">Rejected</option>
            <option value="hidden">Hidden Only</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-[10px] text-[12px] font-semibold outline-none border cursor-pointer"
            style={{
              background: "var(--bg)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          >
            <option value="all">Category: All</option>
            <option value="archetype">Archetypes Only</option>
            <option value="fan_sim">Celebrity Sims</option>
            <option value="Investing">Investing</option>
            <option value="Budgeting">Budgeting</option>
            <option value="Entrepreneurship">Entrepreneurship</option>
            <option value="Real Estate">Real Estate</option>
          </select>
        </div>
      </div>

      {/* Grid of Buddies */}
      {filteredBuddies.length === 0 ? (
        <div
          className="rounded-[16px] p-12 text-center border"
          style={{
            background: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--muted)",
          }}
        >
          <div className="text-[36px] mb-2">🤖</div>
          <div className="text-[16px] font-bold mb-1" style={{ color: "var(--text)" }}>
            No Buddies Found
          </div>
          <div className="text-[13px]">
            {search ? `No buddy matches "${search}".` : "Try resetting your search or filter parameters."}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredBuddies.map((buddy) => {
            const isHidden = hiddenIds.has(buddy.id);
            const priceLabel =
              buddy.price_monthly === 0
                ? "Free"
                : `₦${(buddy.price_monthly / 100).toLocaleString()}/mo`;

            return (
              <div
                key={buddy.id}
                className="rounded-[16px] overflow-hidden border flex flex-col transition-all duration-200 shadow-sm hover:shadow-md"
                style={{
                  background: "var(--card)",
                  borderColor: isHidden ? "rgba(226,75,74,0.5)" : "var(--border)",
                  opacity: isHidden ? 0.65 : 1,
                }}
              >
                {/* Banner */}
                <div className="h-16 relative" style={{ background: buddy.banner_color || "var(--navy)" }}>
                  {isHidden && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: "#E24B4A", color: "#fff" }}>
                      Hidden
                    </span>
                  )}
                  <span
                    className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                    style={{
                      background: "rgba(0,0,0,0.5)",
                      color: "#fff",
                    }}
                  >
                    {buddy.status}
                  </span>
                  <div
                    className="absolute -bottom-4 left-4 w-11 h-11 rounded-full border-2 flex items-center justify-center text-[18px] font-bold overflow-hidden"
                    style={{
                      background: buddy.avatar_bg || "var(--navy)",
                      borderColor: "var(--card)",
                      color: "#fff",
                      fontFamily: buddy.avatar_is_serif ? "var(--font-dm-serif), serif" : "inherit",
                    }}
                  >
                    {isImageAvatar(buddy.avatar_content) ? (
                      <img
                        src={buddy.avatar_content!}
                        alt={buddy.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      buddy.avatar_content || "🤖"
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 pt-6 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-[15px] font-bold truncate" style={{ color: "var(--text)" }}>
                      {buddy.name}
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: buddy.price_monthly === 0 ? "rgba(0,196,140,0.12)" : "rgba(123,104,238,0.12)",
                        color: buddy.price_monthly === 0 ? "var(--green2)" : "#7B68EE",
                      }}
                    >
                      {priceLabel}
                    </span>
                  </div>

                  <div className="text-[12px] mb-3 line-clamp-1" style={{ color: "var(--muted)" }}>
                    {buddy.tag}
                  </div>

                  <div className="flex gap-1.5 flex-wrap mb-4">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-[6px] uppercase"
                      style={{
                        background: "var(--bg)",
                        color: "var(--muted)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {buddy.ai_model}
                    </span>
                    {(buddy.category || []).slice(0, 2).map((cat) => (
                      <span
                        key={cat}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px]"
                        style={{
                          background: "var(--bg)",
                          color: "var(--muted)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {cat}
                      </span>
                    ))}
                    {buddy.is_fan_sim && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px]"
                        style={{
                          background: "rgba(245,166,35,.12)",
                          color: "#C47F00",
                        }}
                      >
                        Fan Sim
                      </span>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div
                    className="mt-auto pt-3 border-t flex items-center justify-between gap-1.5"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleHide(buddy.id)}
                      className="flex-1 py-1.5 px-2 rounded-[8px] text-[11px] font-bold border transition-all text-center"
                      style={{
                        background: "var(--bg)",
                        borderColor: "var(--border)",
                        color: isHidden ? "var(--green2)" : "var(--muted)",
                        cursor: "pointer",
                      }}
                    >
                      {isHidden ? "👁️ Unhide" : "🚫 Hide"}
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(buddy)}
                      className="py-1.5 px-3 rounded-[8px] text-[11px] font-bold text-white transition-all text-center"
                      style={{
                        background: "var(--navy)",
                        cursor: "pointer",
                      }}
                    >
                      Quick Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => window.location.href = `/studio?edit=${buddy.id}`}
                      className="py-1.5 px-2.5 rounded-[8px] text-[11px] font-bold border transition-all text-center"
                      style={{
                        background: "rgba(0,196,140,0.12)",
                        borderColor: "rgba(0,196,140,0.3)",
                        color: "var(--green2)",
                        cursor: "pointer",
                      }}
                    >
                      Studio 🎨
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(buddy)}
                      className="py-1.5 px-2 rounded-[8px] text-[11px] font-bold border transition-all text-center"
                      style={{
                        background: "rgba(226,75,74,0.12)",
                        borderColor: "rgba(226,75,74,0.3)",
                        color: "#E24B4A",
                        cursor: "pointer",
                      }}
                      title="Delete Buddy"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Create & Edit */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            className="rounded-[20px] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border shadow-2xl transition-colors duration-200"
            style={{
              background: "var(--card)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 className="text-[18px] font-bold margin-0" style={{ color: "var(--text)" }}>
                {editingBuddy ? `✏️ Edit Buddy: ${editingBuddy.name}` : "✦ Create New Buddy"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[22px] cursor-pointer bg-none border-none"
                style={{ color: "var(--muted)" }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {!editingBuddy && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                    Custom ID / Slug (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. crypto-guru (auto-generated if empty)"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                  />
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                    Buddy Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. The Contrarian Investor"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                    Tagline *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Value Investing · Long-Term Wealth"
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                  />
                </div>
              </div>

              {/* 📷 Photo Upload & Avatar Manager */}
              <div
                style={{
                  background: "linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)",
                  padding: 16,
                  borderRadius: 14,
                  border: "1px solid #DBEAFE",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1E40AF", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>📷</span> Buddy Avatar Photo &amp; Visuals
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {/* Live Preview Avatar */}
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: formAvatarBg || "#1A3A6E",
                      border: "3px solid #ffffff",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      color: "#fff",
                      fontFamily: formAvatarIsSerif ? "serif" : "inherit",
                      fontWeight: 700,
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {isImageAvatar(formAvatarContent) ? (
                      <img
                        src={formAvatarContent}
                        alt="Preview"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      formAvatarContent || "🤖"
                    )}
                  </div>

                  {/* Upload Actions */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <label
                        style={{
                          padding: "8px 16px",
                          borderRadius: 8,
                          background: "#2563EB",
                          color: "#ffffff",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          boxShadow: "0 2px 4px rgba(37,99,235,0.25)",
                        }}
                      >
                        <span>📁</span> Upload Photo File
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          style={{ display: "none" }}
                        />
                      </label>

                      {isImageAvatar(formAvatarContent) && (
                        <button
                          type="button"
                          onClick={() => setFormAvatarContent("🤖")}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid #CBD5E1",
                            background: "#ffffff",
                            color: "#E24B4A",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Reset to Emoji
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>
                      Supports PNG, JPG, WebP (Max 2MB). Uploaded photo will replace emoji.
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 4 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "#475569", fontWeight: 600, display: "block", marginBottom: 4 }}>
                      Image URL or Emoji
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 🎯 or https://..."
                      value={formAvatarContent}
                      onChange={(e) => setFormAvatarContent(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, background: "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#475569", fontWeight: 600, display: "block", marginBottom: 4 }}>
                      Avatar Background Hex
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. #1A3A6E"
                      value={formAvatarBg}
                      onChange={(e) => setFormAvatarBg(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, background: "#fff" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "#475569", fontWeight: 600, display: "block", marginBottom: 4 }}>
                      Banner Gradient CSS
                    </label>
                    <input
                      type="text"
                      placeholder="linear-gradient(...)"
                      value={formBannerColor}
                      onChange={(e) => setFormBannerColor(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, background: "#fff" }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                  Short Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary displayed on marketplace cards..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, outline: "none" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                  Financial Philosophy &amp; System Prompt
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed guidelines and mindset of this AI..."
                  value={formPhilosophy}
                  onChange={(e) => setFormPhilosophy(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, outline: "none" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                    Price (NGN / month)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    placeholder="0 for Free"
                    value={formPriceNaira}
                    onChange={(e) => setFormPriceNaira(Number(e.target.value))}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                    AI Model Engine *
                  </label>
                  <select
                    value={formAiModel}
                    onChange={(e) => setFormAiModel(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, background: "#fff" }}
                  >
                    <option value="bedrock-sonnet">Amazon Bedrock (Claude 3.5 Sonnet)</option>
                    <option value="bedrock-haiku">Amazon Bedrock (Claude 3.5 Haiku)</option>
                    <option value="bedrock-llama">Amazon Bedrock (Meta Llama 3.3 70B)</option>
                    <option value="bedrock-nova">Amazon Bedrock (Amazon Nova Pro)</option>
                    <option value="claude">Claude (Anthropic Direct)</option>
                    <option value="gpt4">GPT-4 (OpenAI Direct)</option>
                    <option value="gemini">Gemini (Google AI Direct)</option>
                    <option value="groq">Groq (Llama 3.3 70B)</option>
                    <option value="gemma">Gemma 4 31B (NVIDIA Build)</option>
                    <option value="nvidia">Llama 3.3 70B (NVIDIA NIM)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                    Status *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, background: "#fff" }}
                  >
                    <option value="live">Live</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending Review</option>
                    <option value="rejected">Rejected</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                  Categories (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Value Investing, Long-Term Wealth"
                  value={formCategories}
                  onChange={(e) => setFormCategories(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                />
              </div>

              {/* Fan Sim Controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#0B1E3D" }}>
                  <input
                    type="checkbox"
                    checked={formIsFanSim}
                    onChange={(e) => setFormIsFanSim(e.target.checked)}
                  />
                  This is a Celebrity / Person Fan Simulation
                </label>

                {formIsFanSim && (
                  <div>
                    <label style={{ fontSize: 11, color: "#64748B", display: "block", marginBottom: 4 }}>
                      Fan Simulation Disclaimer Notice
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Fan-created simulation based on publicly available books..."
                      value={formFanDisclaimer}
                      onChange={(e) => setFormFanDisclaimer(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12 }}
                    />
                  </div>
                )}
              </div>

              {/* 🧪 Live AI Model Response Testing Sandbox */}
              <div
                style={{
                  background: "#F8FAFC",
                  padding: 16,
                  borderRadius: 14,
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0B1E3D", display: "flex", alignItems: "center", gap: 6 }}>
                    🧪 Live AI Model Testing Sandbox
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", background: "#E2E8F0", padding: "2px 8px", borderRadius: 12 }}>
                    Selected Engine: {formAiModel}
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: "#475569", fontWeight: 600, display: "block", marginBottom: 4 }}>
                    Test Prompt
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Enter a test prompt to send to the selected AI model..."
                      value={testPrompt}
                      onChange={(e) => setTestPrompt(e.target.value)}
                      style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, background: "#fff" }}
                    />
                    <button
                      type="button"
                      onClick={handleTestAiResponse}
                      disabled={isTestingAi}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 8,
                        background: isTestingAi ? "#94A3B8" : "#7B68EE",
                        color: "#ffffff",
                        border: "none",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: isTestingAi ? "wait" : "pointer",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {isTestingAi ? "⚡ Running Test..." : "⚡ Test AI Model Response"}
                    </button>
                  </div>
                </div>

                {testResponse && (
                  <div style={{ background: "#ffffff", padding: 12, borderRadius: 8, border: "1px solid #CBD5E1" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#0B1E3D", marginBottom: 4, textTransform: "uppercase" }}>
                      🤖 Live Output ({formAiModel}):
                    </div>
                    <div style={{ fontSize: 13, color: "#1E293B", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {testResponse}
                    </div>
                  </div>
                )}
              </div>

              {/* Single Unified Submit / Cancel Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #CBD5E1", background: "transparent", fontSize: 13, fontWeight: 600, color: "#64748B", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 10,
                    background: isSubmitting ? "#94A3B8" : "#00C48C",
                    color: "#ffffff",
                    border: "none",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: isSubmitting ? "wait" : "pointer",
                    boxShadow: "0 2px 8px rgba(0,196,140,0.3)",
                  }}
                >
                  {isSubmitting ? "Saving to Database..." : editingBuddy ? "✓ Update Buddy in Database" : "✦ Save Buddy to Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
