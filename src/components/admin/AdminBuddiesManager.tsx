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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0B1E3D", margin: 0 }}>
            🤖 Marketplace Buddies Manager
          </h1>
          <p style={{ fontSize: 14, color: "#6B7A99", marginTop: 4, margin: 0 }}>
            {buddies.length} Total Buddies in Database · {hiddenIds.size} Hidden from Marketplace
          </p>
        </div>

        <button
          onClick={openCreateModal}
          style={{
            padding: "10px 20px",
            background: "#00C48C",
            color: "#ffffff",
            border: "none",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 2px 8px rgba(0,196,140,0.3)",
          }}
        >
          <span>＋</span> Add New Buddy
        </button>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: "#ffffff",
          padding: 16,
          borderRadius: 14,
          boxShadow: "0 1px 4px rgba(11,30,61,.06)",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <input
          type="text"
          placeholder="Search buddies by name, tag, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 260,
            padding: "9px 14px",
            borderRadius: 8,
            border: "1px solid #CBD5E1",
            fontSize: 13,
            outline: "none",
          }}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "9px 14px",
            borderRadius: 8,
            border: "1px solid #CBD5E1",
            fontSize: 13,
            background: "#ffffff",
            cursor: "pointer",
          }}
        >
          <option value="all">All Statuses</option>
          <option value="live">Live</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending Review</option>
          <option value="rejected">Rejected</option>
          <option value="hidden">Hidden Only</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: "9px 14px",
            borderRadius: 8,
            border: "1px solid #CBD5E1",
            fontSize: 13,
            background: "#ffffff",
            cursor: "pointer",
          }}
        >
          <option value="all">All Types / Categories</option>
          <option value="archetype">Archetypes Only</option>
          <option value="fan_sim">Celebrity Sims Only</option>
          <option value="Investing">Investing</option>
          <option value="Budgeting">Budgeting</option>
          <option value="Entrepreneurship">Entrepreneurship</option>
          <option value="Real Estate">Real Estate</option>
        </select>
      </div>

      {/* Grid of Buddies */}
      {filteredBuddies.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            padding: "60px 24px",
            textAlign: "center",
            color: "#6B7A99",
            boxShadow: "0 1px 4px rgba(11,30,61,.06)",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>🤖</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0B1E3D", marginBottom: 4 }}>
            No Buddies Found
          </div>
          <div style={{ fontSize: 13 }}>
            {search ? `No buddy matches "${search}".` : "Try resetting your search or filter parameters."}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {filteredBuddies.map((buddy) => {
            const isHidden = hiddenIds.has(buddy.id);
            const priceLabel =
              buddy.price_monthly === 0
                ? "Free"
                : `₦${(buddy.price_monthly / 100).toLocaleString()}/mo`;

            return (
              <div
                key={buddy.id}
                style={{
                  background: "#ffffff",
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(11,30,61,.08)",
                  display: "flex",
                  flexDirection: "column",
                  opacity: isHidden ? 0.6 : 1,
                  transition: "all .2s",
                  border: isHidden ? "1px dashed #E24B4A" : "1px solid #E2E8F0",
                }}
              >
                {/* Banner */}
                <div style={{ height: 60, background: buddy.banner_color || "#0B1E3D", position: "relative" }}>
                  {isHidden && (
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: "#E24B4A",
                        color: "#fff",
                        textTransform: "uppercase",
                      }}
                    >
                      Hidden
                    </span>
                  )}
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "rgba(0,0,0,0.5)",
                      color: "#fff",
                      textTransform: "uppercase",
                    }}
                  >
                    {buddy.status}
                  </span>
                  <div
                    style={{
                      position: "absolute",
                      bottom: -18,
                      left: 16,
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: buddy.avatar_bg || "#1A3A6E",
                      border: "2px solid #ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      color: "#fff",
                      fontFamily: buddy.avatar_is_serif ? "serif" : "inherit",
                      fontWeight: 700,
                      overflow: "hidden",
                    }}
                  >
                    {isImageAvatar(buddy.avatar_content) ? (
                      <img
                        src={buddy.avatar_content!}
                        alt={buddy.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      buddy.avatar_content || "🤖"
                    )}
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: "26px 16px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0B1E3D" }}>
                      {buddy.name}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 12,
                        background: buddy.price_monthly === 0 ? "rgba(0,196,140,0.12)" : "rgba(123,104,238,0.12)",
                        color: buddy.price_monthly === 0 ? "#00C48C" : "#7B68EE",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {priceLabel}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: "#6B7A99", marginBottom: 10, lineHeight: 1.4 }}>
                    {buddy.tag}
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: "#F1F5F9",
                        color: "#475569",
                        textTransform: "uppercase",
                      }}
                    >
                      {buddy.ai_model}
                    </span>
                    {(buddy.category || []).slice(0, 2).map((cat) => (
                      <span
                        key={cat}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: "#F8FAFC",
                          color: "#64748B",
                          border: "1px solid #E2E8F0",
                        }}
                      >
                        {cat}
                      </span>
                    ))}
                    {buddy.is_fan_sim && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 6,
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
                    style={{
                      marginTop: "auto",
                      paddingTop: 12,
                      borderTop: "1px solid #E2E8F0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <button
                      onClick={() => handleToggleHide(buddy.id)}
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #CBD5E1",
                        background: isHidden ? "#F8FAFC" : "#ffffff",
                        fontSize: 12,
                        fontWeight: 600,
                        color: isHidden ? "#00C48C" : "#64748B",
                        cursor: "pointer",
                      }}
                    >
                      {isHidden ? "👁️ Unhide" : "🚫 Hide"}
                    </button>

                    <button
                      onClick={() => openEditModal(buddy)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        border: "none",
                        background: "#0B1E3D",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      ✏️ Edit Photo &amp; Info
                    </button>

                    <button
                      onClick={() => handleDelete(buddy)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "none",
                        background: "rgba(226,75,74,0.12)",
                        fontSize: 12,
                        fontWeight: 600,
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
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 20,
              maxWidth: 680,
              width: "100%",
              padding: 24,
              boxShadow: "0 20px 30px rgba(0,0,0,0.2)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0B1E3D", margin: 0 }}>
                {editingBuddy ? `✏️ Edit Buddy: ${editingBuddy.name}` : "✦ Create New Buddy"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#64748B" }}
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
                    <option value="claude">Claude (Anthropic)</option>
                    <option value="gpt4">GPT-4 (OpenAI)</option>
                    <option value="gemini">Gemini (Google)</option>
                    <option value="groq">Groq (Llama 3.3 70B)</option>
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

              {/* Submit / Cancel Buttons */}
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
                  style={{ padding: "10px 24px", borderRadius: 10, background: "#00C48C", color: "#ffffff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  {isSubmitting ? "Saving..." : editingBuddy ? "Update Buddy" : "Create Buddy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
