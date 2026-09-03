"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDatabankStore } from "@/store/databankStore";
import { SpendingExclusionsToolbar } from "@/components/analytics/SpendingExclusionsToolbar";

type Transaction = {
  id: string;
  entry_type: "income" | "expense" | "subscription" | "asset" | "debt";
  amount: number; // kobo
  amountNaira: number;
  description: string;
  category: string;
  entry_date: string;
  source: string;
  metadata?: Record<string, any>;
  created_at?: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type Stats = {
  totalCount: number;
  totalInflowsNaira: number;
  totalOutflowsNaira: number;
  netCashflowNaira: number;
};

const TYPE_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; border: string; sign: string; icon: string }
> = {
  income: {
    label: "Income",
    bg: "rgba(0, 196, 140, 0.12)",
    color: "#00A677",
    border: "rgba(0, 196, 140, 0.3)",
    sign: "+",
    icon: "💰",
  },
  expense: {
    label: "Expense",
    bg: "rgba(226, 75, 74, 0.12)",
    color: "#E24B4A",
    border: "rgba(226, 75, 74, 0.3)",
    sign: "-",
    icon: "💸",
  },
  subscription: {
    label: "Subscription",
    bg: "rgba(155, 89, 182, 0.12)",
    color: "#8E44AD",
    border: "rgba(155, 89, 182, 0.3)",
    sign: "-",
    icon: "🔄",
  },
  asset: {
    label: "Asset",
    bg: "rgba(74, 144, 217, 0.12)",
    color: "#2980B9",
    border: "rgba(74, 144, 217, 0.3)",
    sign: "+",
    icon: "💎",
  },
  debt: {
    label: "Debt",
    bg: "rgba(245, 166, 35, 0.12)",
    color: "#D35400",
    border: "rgba(245, 166, 35, 0.3)",
    sign: "-",
    icon: "⚠️",
  },
};

const COMMON_CATEGORIES = [
  "Food & Dining",
  "Transport & Fuel",
  "Subscriptions",
  "Shopping & Groceries",
  "Utilities & Bills",
  "Phone & Data",
  "Salary & Wages",
  "Business & Sales",
  "Transfers",
  "Healthcare",
  "Entertainment",
  "Paystack",
  "Uncategorized",
];

export function DatabankTransactionsTable({
  onDataChanged,
}: {
  onDataChanged?: () => void;
}) {
  const [entries, setEntries] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });
  const [stats, setStats] = useState<Stats>({
    totalCount: 0,
    totalInflowsNaira: 0,
    totalOutflowsNaira: 0,
    netCashflowNaira: 0,
  });
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [sources, setSources] = useState<{ name: string; count: number }[]>([]);

  // Filter States
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [limit, setLimit] = useState(25);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("entry_date");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [editingEntry, setEditingEntry] = useState<Transaction | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [batchAction, setBatchAction] = useState<"delete" | "category" | null>(null);
  const [batchCategory, setBatchCategory] = useState("");
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Edit Form Fields
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState<Transaction["entry_type"]>("expense");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");

  // Add Form Fields
  const [addDesc, setAddDesc] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addType, setAddType] = useState<Transaction["entry_type"]>("expense");
  const [addCategory, setAddCategory] = useState("Uncategorized");
  const [addDate, setAddDate] = useState(new Date().toISOString().split("T")[0]);
  const [addSource, setAddSource] = useState("manual");

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Transactions
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        type: typeFilter,
        category: categoryFilter,
        source: sourceFilter,
        sortBy,
        sortOrder,
      });
      if (debouncedSearch) params.append("search", debouncedSearch);

      const res = await fetch(`/api/databank/entries?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load transactions");
      const data = await res.json();

      setEntries(data.entries || []);
      setPagination(
        data.pagination || { page: 1, limit, total: 0, totalPages: 1 }
      );
      setStats(
        data.stats || {
          totalCount: 0,
          totalInflowsNaira: 0,
          totalOutflowsNaira: 0,
          netCashflowNaira: 0,
        }
      );
      setCategories(data.categories || []);
      setSources(data.sources || []);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("[DatabankTransactionsTable] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, typeFilter, categoryFilter, sourceFilter, sortBy, sortOrder, debouncedSearch]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Open Edit Modal
  const openEdit = (t: Transaction) => {
    setEditingEntry(t);
    setEditDesc(t.description);
    setEditAmount(t.amountNaira.toString());
    setEditType(t.entry_type);
    setEditCategory(t.category);
    setEditDate(t.entry_date);
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/databank/entries/${editingEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editDesc,
          amount: parseFloat(editAmount) || 0,
          isNaira: true,
          entry_type: editType,
          category: editCategory,
          entry_date: editDate,
        }),
      });

      if (!res.ok) throw new Error("Failed to save changes");
      setEditingEntry(null);
      await fetchEntries();
      await useDatabankStore.getState().loadContext();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error("Save edit error:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Single
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/databank/entries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete entry");
      setDeleteConfirmId(null);
      await fetchEntries();
      await useDatabankStore.getState().loadContext();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete transaction.");
    }
  };

  // Add Transaction
  const handleAddTransaction = async () => {
    if (!addDesc || !addAmount) {
      alert("Please provide a description and amount.");
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch("/api/databank/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: addDesc,
          amount: parseFloat(addAmount) || 0,
          isNaira: true,
          entry_type: addType,
          category: addCategory,
          entry_date: addDate,
          source: addSource,
        }),
      });

      if (!res.ok) throw new Error("Failed to add entry");
      setIsAdding(false);
      setAddDesc("");
      setAddAmount("");
      await fetchEntries();
      await useDatabankStore.getState().loadContext();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error("Add error:", err);
      alert("Failed to add transaction.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Batch Delete / Category
  const handleBatchSubmit = async () => {
    if (selectedIds.size === 0) return;
    setBatchProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch("/api/databank/entries/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: batchAction === "delete" ? "delete" : "set_category",
          ids,
          category: batchCategory,
        }),
      });

      if (!res.ok) throw new Error("Batch operation failed");
      setBatchAction(null);
      setSelectedIds(new Set());
      await fetchEntries();
      await useDatabankStore.getState().loadContext();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      console.error("Batch error:", err);
      alert("Batch operation failed.");
    } finally {
      setBatchProcessing(false);
    }
  };

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Formatters
  const formatNaira = (amtNaira: number) => {
    return `₦${amtNaira.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime())
        ? dateStr
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (entries.length === 0) return;
    const headers = ["Date", "Description", "Type", "Category", "Amount (NGN)", "Source"];
    const rows = entries.map((e) => [
      e.entry_date,
      `"${e.description.replace(/"/g, '""')}"`,
      e.entry_type,
      `"${e.category}"`,
      e.amountNaira.toFixed(2),
      e.source,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `smart_money_transactions_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="rounded-[16px] p-5 flex flex-col gap-5 text-[13px] shadow-sm"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        color: "var(--text)",
      }}
    >
      {/* ── 1. HEADER & KPI SUMMARY STRIP ── */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div>
          <div className="flex items-center gap-3">
            <span className="text-[20px] font-bold" style={{ color: "var(--text)" }}>
              DataBank <span style={{ color: "var(--green, #00C48C)" }}>Transactions</span>
            </span>
            <span
              className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: "rgba(0,196,140,0.12)", color: "var(--green, #00C48C)" }}
            >
              {stats.totalCount.toLocaleString()} Records
            </span>
          </div>
          <p className="text-[12px] mt-1" style={{ color: "var(--muted)" }}>
            Complete database of financial transactions parsed from Gmail alerts, statements, and manual entries.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-[12px] font-semibold shadow-sm transition-all cursor-pointer hover:opacity-90"
            style={{
              background: "var(--green, #00C48C)",
              color: "#0B0E17",
            }}
          >
            <span>+</span> Add Transaction
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[9px] text-[12px] font-medium transition-all cursor-pointer hover:bg-[var(--border)]/30"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text)",
              background: "var(--bg)",
            }}
          >
            📥 Export CSV
          </button>
          <button
            onClick={() => fetchEntries()}
            title="Refresh transactions"
            className="p-2 rounded-[9px] transition-all cursor-pointer hover:bg-[var(--border)]/30"
            style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "var(--bg)" }}
          >
            🔄
          </button>
        </div>
      </div>

      {/* ── SPENDING ANALYTICS EXCLUSIONS (CLICK-TO-TOGGLE PLATFORMS: PAYSTACK, OPAY, PALMPAY, ETC.) ── */}
      <SpendingExclusionsToolbar />

      {/* ── 2. SUMMARY METRIC STRIP ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          className="rounded-[12px] p-3.5 flex flex-col"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        >
          <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>Total Inflows</span>
          <span className="text-[16px] font-bold mt-1" style={{ color: "var(--green, #00C48C)" }}>
            +{formatNaira(stats.totalInflowsNaira)}
          </span>
        </div>
        <div
          className="rounded-[12px] p-3.5 flex flex-col"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        >
          <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>Total Outflows</span>
          <span className="text-[16px] font-bold mt-1" style={{ color: "#E24B4A" }}>
            -{formatNaira(stats.totalOutflowsNaira)}
          </span>
        </div>
        <div
          className="rounded-[12px] p-3.5 flex flex-col"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        >
          <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>Net DataBank Flow</span>
          <span
            className="text-[16px] font-bold mt-1"
            style={{ color: stats.netCashflowNaira >= 0 ? "var(--green, #00C48C)" : "#E24B4A" }}
          >
            {stats.netCashflowNaira >= 0 ? "+" : ""}
            {formatNaira(stats.netCashflowNaira)}
          </span>
        </div>
        <div
          className="rounded-[12px] p-3.5 flex flex-col"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        >
          <span className="text-[11px] font-medium" style={{ color: "var(--muted)" }}>Database Records</span>
          <span className="text-[16px] font-bold mt-1" style={{ color: "var(--text)" }}>
            {stats.totalCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── 3. SEARCH & FILTER CONTROLS ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
          {/* Live Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search transactions, merchants, bank alerts..."
              className="w-full pl-9 pr-8 py-2 rounded-[10px] text-[12px] transition-all focus:outline-none"
              style={{
                background: "var(--input-bg, var(--bg))",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-2 text-[11px] cursor-pointer"
                style={{ color: "var(--muted)" }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-[10px] text-[12px] focus:outline-none cursor-pointer"
              style={{
                background: "var(--input-bg, var(--bg))",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <option value="all">All Categories ({categories.reduce((s, c) => s + c.count, 0)})</option>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.count})
                </option>
              ))}
            </select>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-[10px] text-[12px] focus:outline-none cursor-pointer"
              style={{
                background: "var(--input-bg, var(--bg))",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <option value="all">All Sources</option>
              {sources.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name === "gmail"
                    ? "📧 Gmail Alerts"
                    : s.name === "upload"
                    ? "📄 Statement Upload"
                    : s.name === "manual"
                    ? "✏️ Manual Entry"
                    : s.name} ({s.count})
                </option>
              ))}
            </select>

            {/* Per Page */}
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2 rounded-[10px] text-[12px] focus:outline-none cursor-pointer"
              style={{
                background: "var(--input-bg, var(--bg))",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <option value={15}>15 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: "all", label: "All Types" },
            { id: "income", label: "Income 💰" },
            { id: "expense", label: "Expense 💸" },
            { id: "subscription", label: "Subscription 🔄" },
            { id: "asset", label: "Asset 💎" },
            { id: "debt", label: "Debt ⚠️" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTypeFilter(t.id);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-[8px] text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer"
              style={{
                background: typeFilter === t.id ? "var(--green, #00C48C)" : "var(--bg)",
                color: typeFilter === t.id ? "#0B0E17" : "var(--muted)",
                border: "1px solid",
                borderColor: typeFilter === t.id ? "var(--green, #00C48C)" : "var(--border)",
                fontWeight: typeFilter === t.id ? 700 : 500,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. BATCH ACTIONS BAR (When items selected) ── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-[10px] p-2.5 flex items-center justify-between gap-3"
            style={{ background: "rgba(0,196,140,0.1)", border: "1px solid rgba(0,196,140,0.3)" }}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-[12px]" style={{ color: "var(--green, #00C48C)" }}>
                {selectedIds.size} transaction{selectedIds.size > 1 ? "s" : ""} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setBatchAction("category");
                  setBatchCategory(COMMON_CATEGORIES[0]);
                }}
                className="px-2.5 py-1 rounded-[7px] text-[11px] font-semibold border cursor-pointer hover:opacity-80"
                style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text)" }}
              >
                🏷️ Change Category
              </button>
              <button
                onClick={() => setBatchAction("delete")}
                className="px-2.5 py-1 rounded-[7px] text-[11px] font-semibold text-white bg-[#E24B4A] cursor-pointer hover:opacity-90"
              >
                🗑️ Delete Selected
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-2 py-1 text-[11px] cursor-pointer hover:opacity-80"
                style={{ color: "var(--muted)" }}
              >
                Deselect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 5. TRANSACTIONS TABLE ── */}
      <div
        className="rounded-[12px] overflow-hidden"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead>
              <tr
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  background: "var(--bg)",
                  borderBottom: "1px solid var(--border)",
                  color: "var(--muted)",
                }}
              >
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={entries.length > 0 && selectedIds.size === entries.length}
                    onChange={toggleSelectAll}
                    className="rounded cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => {
                    if (sortBy === "entry_date") setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
                    else {
                      setSortBy("entry_date");
                      setSortOrder("DESC");
                    }
                  }}
                  className="py-3 px-3 cursor-pointer select-none hover:opacity-80"
                  style={{ color: "var(--muted)" }}
                >
                  Date {sortBy === "entry_date" && (sortOrder === "DESC" ? "↓" : "↑")}
                </th>
                <th className="py-3 px-3" style={{ color: "var(--muted)" }}>Description / Merchant</th>
                <th className="py-3 px-3" style={{ color: "var(--muted)" }}>Category</th>
                <th className="py-3 px-3" style={{ color: "var(--muted)" }}>Type</th>
                <th className="py-3 px-3" style={{ color: "var(--muted)" }}>Source</th>
                <th
                  onClick={() => {
                    if (sortBy === "amount") setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
                    else {
                      setSortBy("amount");
                      setSortOrder("DESC");
                    }
                  }}
                  className="py-3 px-3 text-right cursor-pointer select-none hover:opacity-80"
                  style={{ color: "var(--muted)" }}
                >
                  Amount {sortBy === "amount" && (sortOrder === "DESC" ? "↓" : "↑")}
                </th>
                <th className="py-3 px-3 text-center w-20" style={{ color: "var(--muted)" }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center" style={{ color: "var(--muted)" }}>
                    <div className="inline-block animate-spin mr-2">⏳</div> Loading DataBank transactions...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center" style={{ color: "var(--muted)" }}>
                    <div className="text-[24px] mb-2">📂</div>
                    <div className="font-semibold text-[14px]" style={{ color: "var(--text)" }}>No transactions found</div>
                    <p className="text-[11px] mt-1" style={{ color: "var(--muted)" }}>
                      {search || typeFilter !== "all" || categoryFilter !== "all"
                        ? "Try clearing filters or search term."
                        : "Sync your Gmail, upload a statement, or add a transaction to begin."}
                    </p>
                  </td>
                </tr>
              ) : (
                entries.map((t) => {
                  const cfg = TYPE_CONFIG[t.entry_type] || TYPE_CONFIG.expense;
                  const isSelected = selectedIds.has(t.id);
                  const bankName =
                    t.metadata?.bank || t.metadata?.provider || (t.source === "gmail" ? "Gmail Alert" : null);

                  return (
                    <tr
                      key={t.id}
                      className="group transition-all cursor-pointer hover:bg-[var(--bg)]/70"
                      style={{
                        background: isSelected ? "rgba(0,196,140,0.08)" : "transparent",
                        borderBottom: "1px solid var(--border)",
                      }}
                      onClick={() => openEdit(t)}
                    >
                      <td
                        className="py-3 px-3 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectOne(t.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(t.id)}
                          className="rounded cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-[11px]" style={{ color: "var(--muted)" }}>
                        {formatDate(t.entry_date)}
                      </td>
                      <td className="py-3 px-3 max-w-[280px]">
                        <div className="font-semibold truncate" style={{ color: "var(--text)" }}>
                          {t.description}
                        </div>
                        {bankName && (
                          <div className="text-[11px] mt-0.5 truncate" style={{ color: "var(--muted)" }}>
                            🏦 {bankName} {t.metadata?.account_number ? `(${t.metadata.account_number})` : ""}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{
                            background: "var(--bg)",
                            border: "1px solid var(--border)",
                            color: "var(--text)",
                          }}
                        >
                          {t.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            background: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                          }}
                        >
                          <span>{cfg.icon}</span> {cfg.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-[11px] capitalize" style={{ color: "var(--muted)" }}>
                          {t.source === "gmail" ? "📧 Gmail" : t.source === "upload" ? "📄 Statement" : "✏️ Manual"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-[13px]">
                        <span style={{ color: t.entry_type === "income" ? "var(--green, #00A677)" : "var(--text)" }}>
                          {cfg.sign}
                          {formatNaira(t.amountNaira)}
                        </span>
                      </td>
                      <td
                        className="py-3 px-3 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(t)}
                            title="Edit transaction"
                            className="p-1 rounded cursor-pointer transition-all hover:bg-[var(--border)]/40"
                            style={{ color: "var(--muted)" }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(t.id)}
                            title="Delete transaction"
                            className="p-1 rounded cursor-pointer transition-all hover:bg-[#E24B4A]/20"
                            style={{ color: "var(--muted)" }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── 6. PAGINATION FOOTER ── */}
        <div
          className="p-3.5 flex items-center justify-between flex-wrap gap-3 text-[12px]"
          style={{
            borderTop: "1px solid var(--border)",
            background: "var(--bg)",
            color: "var(--muted)",
          }}
        >
          <div>
            Showing{" "}
            <span className="font-semibold" style={{ color: "var(--text)" }}>
              {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold" style={{ color: "var(--text)" }}>
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-semibold" style={{ color: "var(--text)" }}>{pagination.total.toLocaleString()}</span> entries
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(1)}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded-[6px] text-[11px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--border)]/40 cursor-pointer"
              style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--card)" }}
            >
              « First
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 rounded-[6px] text-[11px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--border)]/40 cursor-pointer"
              style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--card)" }}
            >
              ‹ Prev
            </button>
            <span className="px-3 text-[11px] font-semibold" style={{ color: "var(--text)" }}>
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-2.5 py-1 rounded-[6px] text-[11px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--border)]/40 cursor-pointer"
              style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--card)" }}
            >
              Next ›
            </button>
            <button
              onClick={() => setPage(pagination.totalPages)}
              disabled={page >= pagination.totalPages}
              className="px-2.5 py-1 rounded-[6px] text-[11px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--border)]/40 cursor-pointer"
              style={{ border: "1px solid var(--border)", color: "var(--text)", background: "var(--card)" }}
            >
              Last »
            </button>
          </div>
        </div>
      </div>

      {/* ── 7. EDIT TRANSACTION MODAL ── */}
      <AnimatePresence>
        {editingEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-[16px] p-6 shadow-2xl flex flex-col gap-4"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <div
                className="flex items-center justify-between pb-3"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="font-bold text-[16px] flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <span>✏️ Edit Transaction</span>
                </div>
                <button
                  onClick={() => setEditingEntry(null)}
                  className="cursor-pointer hover:opacity-80 text-[16px]"
                  style={{ color: "var(--muted)" }}
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-3 text-[12px]">
                <div>
                  <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--muted)" }}>
                    Description / Merchant
                  </label>
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] focus:outline-none"
                    style={{
                      background: "var(--input-bg, var(--bg))",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--muted)" }}>
                      Amount (₦ Naira)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-[8px] focus:outline-none"
                      style={{
                        background: "var(--input-bg, var(--bg))",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--muted)" }}>
                      Transaction Type
                    </label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as Transaction["entry_type"])}
                      className="w-full px-3 py-2 rounded-[8px] focus:outline-none cursor-pointer"
                      style={{
                        background: "var(--input-bg, var(--bg))",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                    >
                      <option value="income">Income 💰</option>
                      <option value="expense">Expense 💸</option>
                      <option value="subscription">Subscription 🔄</option>
                      <option value="asset">Asset 💎</option>
                      <option value="debt">Debt ⚠️</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--muted)" }}>
                      Category
                    </label>
                    <input
                      type="text"
                      list="edit-categories-list"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-[8px] focus:outline-none"
                      style={{
                        background: "var(--input-bg, var(--bg))",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                    />
                    <datalist id="edit-categories-list">
                      {COMMON_CATEGORIES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--muted)" }}>
                      Date
                    </label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-[8px] focus:outline-none"
                      style={{
                        background: "var(--input-bg, var(--bg))",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div
                className="flex items-center justify-end gap-2 pt-3"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <button
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 rounded-[8px] text-[12px] cursor-pointer hover:opacity-80"
                  style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "var(--bg)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-[8px] text-[12px] font-semibold text-[#0B0E17] bg-[var(--green)] hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 8. ADD TRANSACTION MODAL ── */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-[16px] p-6 shadow-2xl flex flex-col gap-4"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <div
                className="flex items-center justify-between pb-3"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="font-bold text-[16px] flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <span>➕ Add New Transaction</span>
                </div>
                <button
                  onClick={() => setIsAdding(false)}
                  className="cursor-pointer hover:opacity-80 text-[16px]"
                  style={{ color: "var(--muted)" }}
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-3 text-[12px]">
                <div>
                  <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--muted)" }}>
                    Description / Merchant
                  </label>
                  <input
                    type="text"
                    value={addDesc}
                    onChange={(e) => setAddDesc(e.target.value)}
                    placeholder="e.g. Salary Payment, Uber Ride, Netflix"
                    className="w-full px-3 py-2 rounded-[8px] focus:outline-none"
                    style={{
                      background: "var(--input-bg, var(--bg))",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--muted)" }}>
                      Amount (₦ Naira)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      placeholder="e.g. 25000"
                      className="w-full px-3 py-2 rounded-[8px] focus:outline-none"
                      style={{
                        background: "var(--input-bg, var(--bg))",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--muted)" }}>
                      Type
                    </label>
                    <select
                      value={addType}
                      onChange={(e) => setAddType(e.target.value as Transaction["entry_type"])}
                      className="w-full px-3 py-2 rounded-[8px] focus:outline-none cursor-pointer"
                      style={{
                        background: "var(--input-bg, var(--bg))",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                    >
                      <option value="income">Income 💰</option>
                      <option value="expense">Expense 💸</option>
                      <option value="subscription">Subscription 🔄</option>
                      <option value="asset">Asset 💎</option>
                      <option value="debt">Debt ⚠️</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--muted)" }}>
                      Category
                    </label>
                    <input
                      type="text"
                      list="add-categories-list"
                      value={addCategory}
                      onChange={(e) => setAddCategory(e.target.value)}
                      placeholder="e.g. Food & Dining"
                      className="w-full px-3 py-2 rounded-[8px] focus:outline-none"
                      style={{
                        background: "var(--input-bg, var(--bg))",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                    />
                    <datalist id="add-categories-list">
                      {COMMON_CATEGORIES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--muted)" }}>
                      Date
                    </label>
                    <input
                      type="date"
                      value={addDate}
                      onChange={(e) => setAddDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-[8px] focus:outline-none"
                      style={{
                        background: "var(--input-bg, var(--bg))",
                        border: "1px solid var(--border)",
                        color: "var(--text)",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div
                className="flex items-center justify-end gap-2 pt-3"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 rounded-[8px] text-[12px] cursor-pointer hover:opacity-80"
                  style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "var(--bg)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTransaction}
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-[8px] text-[12px] font-semibold text-[#0B0E17] bg-[var(--green)] hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? "Adding..." : "Add Transaction"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 9. DELETE CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-[16px] p-5 shadow-2xl flex flex-col gap-4 text-[13px]"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <div className="font-bold text-[15px] text-[#E24B4A]">Delete Transaction?</div>
              <p className="text-[12px]" style={{ color: "var(--muted)" }}>
                Are you sure you want to permanently delete this transaction from your DataBank?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3.5 py-1.5 rounded-[8px] text-[12px] cursor-pointer hover:opacity-80"
                  style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "var(--bg)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold text-white bg-[#E24B4A] hover:opacity-90 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 10. BATCH ACTION MODAL ── */}
      <AnimatePresence>
        {batchAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-[16px] p-5 shadow-2xl flex flex-col gap-4 text-[13px]"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <div className="font-bold text-[15px]" style={{ color: "var(--text)" }}>
                {batchAction === "delete" ? "Delete Multiple Transactions" : "Batch Change Category"}
              </div>

              {batchAction === "delete" ? (
                <p className="text-[12px]" style={{ color: "var(--muted)" }}>
                  Are you sure you want to delete{" "}
                  <strong style={{ color: "var(--text)" }}>{selectedIds.size}</strong> selected transactions from your database?
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-[11px]" style={{ color: "var(--muted)" }}>Select New Category</label>
                  <select
                    value={batchCategory}
                    onChange={(e) => setBatchCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] text-[12px] cursor-pointer focus:outline-none"
                    style={{
                      background: "var(--input-bg, var(--bg))",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    {COMMON_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setBatchAction(null)}
                  className="px-3.5 py-1.5 rounded-[8px] text-[12px] cursor-pointer hover:opacity-80"
                  style={{ border: "1px solid var(--border)", color: "var(--muted)", background: "var(--bg)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBatchSubmit}
                  disabled={batchProcessing}
                  className={`px-3.5 py-1.5 rounded-[8px] text-[12px] font-semibold text-white cursor-pointer ${
                    batchAction === "delete" ? "bg-[#E24B4A]" : "bg-[var(--green)] text-[#0B0E17]"
                  }`}
                >
                  {batchProcessing ? "Processing..." : batchAction === "delete" ? "Confirm Delete" : "Apply Category"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
