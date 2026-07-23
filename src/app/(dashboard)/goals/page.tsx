"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useUserStore } from "@/store/userStore";
import { currencySymbol } from "@/lib/currency";
import { popup } from "@/store/popupStore";

// ── Types ─────────────────────────────────────────────────
type Goal = {
  id: string;
  emoji: string;
  title: string;
  meta: string;
  buddy: string;
  buddyEmoji: string;
  buddyColor: string;
  current: number;
  target: number;
  deadline: string;
  barColor: string | null;
  label?: string;
  sublabel?: string;
  milestoneMessage: string;
};

// ── Milestone Toast ───────────────────────────────────────
function MilestoneToast({
  goal,
  onDismiss,
}: {
  goal: Goal;
  onDismiss: () => void;
}) {
  // Auto-dismiss after 5s
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ y: -80, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -80, opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="fixed top-5 left-1/2 z-[100]"
      style={{ transform: "translateX(-50%)", width: "min(480px, calc(100vw - 32px))" }}
    >
      <div
        className="rounded-[16px] p-5 shadow-2xl"
        style={{
          background: "linear-gradient(135deg,var(--navy2),var(--navy))",
          border: "1px solid rgba(0,196,140,.3)",
        }}
      >
        {/* Confetti dots */}
        <div className="absolute inset-0 overflow-hidden rounded-[16px] pointer-events-none">
          {["#00C48C", "#F5A623", "#4A90D9", "#fff"].map((c, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{ width: 6, height: 6, background: c, left: `${15 + i * 22}%`, top: "20%" }}
              animate={{ y: [0, -18, 0], opacity: [0.8, 1, 0] }}
              transition={{ duration: 1.2, delay: i * 0.12, repeat: 2, ease: "easeOut" }}
            />
          ))}
        </div>

        <div className="flex items-start gap-4 relative">
          {/* Buddy avatar */}
          <div
            className="flex items-center justify-center rounded-[10px] text-[20px] flex-shrink-0"
            style={{ width: 44, height: 44, background: goal.buddyColor }}
          >
            {goal.buddyEmoji}
          </div>

          <div className="flex-1 min-w-0">
            {/* Celebration header */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[13px]">🎉</span>
              <span className="text-[12px] font-semibold" style={{ color: "var(--green)" }}>
                Milestone reached!
              </span>
              <span className="text-[11px]" style={{ color: "rgba(255,255,255,.4)" }}>
                — {goal.title}
              </span>
            </div>
            {/* Buddy quote */}
            <p className="text-[13px] italic mb-2" style={{ color: "rgba(255,255,255,.85)", lineHeight: 1.55 }}>
              &ldquo;{goal.milestoneMessage}&rdquo;
            </p>
            <div className="text-[10px] font-semibold uppercase tracking-[.5px]" style={{ color: "rgba(255,255,255,.35)" }}>
              {goal.buddy}
            </div>
          </div>

          {/* Close */}
          <button
            onClick={onDismiss}
            className="w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 text-[14px]"
            style={{ color: "rgba(255,255,255,.4)", background: "rgba(255,255,255,.08)" }}
          >
            ×
          </button>
        </div>

        {/* Progress strip */}
        <div className="mt-4 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.1)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--green)" }}
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 5, ease: "linear" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ── KPI stat card ─────────────────────────────────────────
function StatCard({
  label,
  value,
  change,
  changeUp,
}: {
  label: string;
  value: string;
  change: string;
  changeUp?: boolean;
}) {
  return (
    <div
      className="rounded-[14px] p-5 transition-all duration-200"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <div
        className="text-[11px] font-semibold uppercase tracking-[.5px] mb-2"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </div>
      <div
        className="text-[26px] font-bold mb-1"
        style={{ color: "var(--text)", fontFamily: "var(--font-dm-serif)" }}
      >
        {value}
      </div>
      <div
        className="text-[11px] font-medium"
        style={{ color: changeUp ? "var(--green2)" : "var(--muted)" }}
      >
        {changeUp ? "↑ " : ""}{change}
      </div>
    </div>
  );
}

// ── Goal progress bar (interactive) ──────────────────────
function GoalBar({
  goal,
  onMilestone,
}: {
  goal: Goal;
  onMilestone: (g: Goal) => void;
}) {
  const pct = Math.round((goal.current / goal.target) * 100);
  const barFill = goal.barColor ?? "linear-gradient(90deg,var(--green),#00E0A1)";
  const barRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  function handleClick() {
    if (clicked) return;
    setClicked(true);
    onMilestone(goal);
    // POST milestone
    fetch("/api/goals/milestone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId: goal.id }),
    });
  }

  const label = goal.label ?? `${pct}% complete`;
  const { userCurrency } = useUserStore();
  const sym = currencySymbol(userCurrency);
  const sublabel =
    goal.sublabel ??
    `${sym}${Math.round((goal.target - goal.current) / 1000)}k remaining`;

  return (
    <div>
      {/* Bar */}
      <div
        ref={barRef}
        className="relative h-[8px] rounded-full overflow-hidden cursor-pointer group"
        style={{ background: "var(--bg)" }}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="Click to celebrate this milestone"
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: barFill }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
        {/* Hover pulse */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: "rgba(0,196,140,.18)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
          )}
        </AnimatePresence>
        {/* Click ripple */}
        <AnimatePresence>
          {clicked && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: "rgba(0,196,140,.35)" }}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-2 text-[10px]" style={{ color: "var(--muted)" }}>
        <span>{label}</span>
        <span>{sublabel}</span>
      </div>
    </div>
  );
}

// ── Goal card ──────────────────────────────────────────────
function GoalCard({
  goal,
  onMilestone,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  onMilestone: (g: Goal) => void;
  onEdit: (g: Goal) => void;
  onDelete: (id: string) => void;
}) {
  const { userCurrency: goalCurrency } = useUserStore();
  const gsym = currencySymbol(goalCurrency);
  const fmt = (n: number) =>
    n >= 1000 ? `${gsym}${(n / 1000).toFixed(0)}k` : `${gsym}${n.toLocaleString()}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-[14px] p-5 relative group"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 mr-4">
          <div className="text-[14px] font-semibold mb-[3px]" style={{ color: "var(--text)" }}>
            {goal.emoji} {goal.title}
          </div>
          <div className="text-[11px]" style={{ color: "var(--muted)" }}>
            {goal.meta} · Set with {goal.buddy}
          </div>
        </div>
        <div className="text-right flex-shrink-0 flex items-start gap-4">
          <div>
            <div
              className="text-[18px] font-bold"
              style={{ color: "var(--text)", fontFamily: "var(--font-dm-serif)" }}
            >
              {fmt(goal.current)}
            </div>
            <div className="text-[11px]" style={{ color: "var(--muted)" }}>
              {goal.sublabel ? "saved so far" : `of ${fmt(goal.target)}`}
            </div>
          </div>

          {/* Quick Edit/Delete Actions */}
          <div className="flex items-center gap-1.5 ml-2 mt-0.5">
            <button
              onClick={() => onEdit(goal)}
              className="p-1.5 rounded-[8px] border transition-colors hover:bg-neutral-800"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
              title="Edit Goal"
            >
              ✏️
            </button>
            <button
              onClick={() => onDelete(goal.id)}
              className="p-1.5 rounded-[8px] border transition-colors hover:bg-red-950/20"
              style={{ borderColor: "rgba(220,38,38,0.2)", color: "#DC2626" }}
              title="Delete Goal"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar (interactive) */}
      <GoalBar goal={goal} onMilestone={onMilestone} />

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
        {/* Buddy tag */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-[7px] text-[12px]"
            style={{ width: 24, height: 24, background: goal.buddyColor }}
          >
            {goal.buddyEmoji}
          </div>
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>
            {goal.buddy}
          </span>
        </div>
        {/* Deadline */}
        <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--muted)" }}>
          <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, stroke: "var(--muted)", fill: "none", strokeWidth: 2 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {goal.deadline}
        </div>
      </div>
    </motion.div>
  );
}

// ── Skeleton goal card ────────────────────────────────────
function SkeletonGoalCard() {
  return (
    <div className="rounded-[14px] p-5 animate-pulse" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="h-4 w-44 rounded mb-2" style={{ background: "var(--border)" }} />
          <div className="h-3 w-32 rounded" style={{ background: "var(--border)" }} />
        </div>
        <div className="h-6 w-16 rounded" style={{ background: "var(--border)" }} />
      </div>
      <div className="h-2 w-full rounded-full mb-2" style={{ background: "var(--border)" }} />
      <div className="flex justify-between mt-2 mb-4">
        <div className="h-3 w-20 rounded" style={{ background: "var(--border)" }} />
        <div className="h-3 w-24 rounded" style={{ background: "var(--border)" }} />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[7px]" style={{ background: "var(--border)" }} />
          <div className="h-3 w-28 rounded" style={{ background: "var(--border)" }} />
        </div>
        <div className="h-3 w-16 rounded" style={{ background: "var(--border)" }} />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────
export default function GoalsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Goal | null>(null);

  // Edit Goal modal state
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCurrent, setEditCurrent] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchGoals = () => {
    fetch("/api/goals/list")
      .then((r) => r.json())
      .then((d) => {
        setGoals(d);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  function handleMilestone(goal: Goal) {
    setToast(goal);
  }

  // Delete Goal handler
  function handleDelete(id: string) {
    popup.danger(
      "Delete Financial Goal",
      "Are you sure you want to delete this financial goal?",
      async () => {
        try {
          const res = await fetch(`/api/goals/${id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            fetchGoals();
            popup.success("Goal Deleted", "Your financial goal has been deleted.");
          } else {
            popup.error("Error", "Failed to delete goal");
          }
        } catch (err) {
          console.error(err);
          popup.error("Error", "Error deleting goal");
        }
      },
      "Delete Goal"
    );
  }

  // Clear All Goals handler
  function handleClearAllGoals() {
    popup.danger(
      "Clear All Goals",
      "Are you sure you want to permanently delete all financial goals from the database? This action cannot be undone.",
      async () => {
        try {
          const res = await fetch("/api/goals/list", {
            method: "DELETE",
          });
          if (res.ok) {
            setGoals([]);
            popup.success("Goals Cleared", "All goals have been permanently deleted from the database.");
          } else {
            popup.error("Error", "Failed to clear goals.");
          }
        } catch (err) {
          console.error(err);
          popup.error("Error", "An unexpected error occurred while clearing goals.");
        }
      },
      "Clear Everything"
    );
  }

  // Start Edit handler
  function handleStartEdit(goal: Goal) {
    setEditingGoal(goal);
    setEditTitle(goal.title);
    setEditCurrent(String(goal.current));
    setEditTarget(String(goal.target));
    setEditDeadline("");
  }

  // Create Goal handler
  async function handleCreateGoal() {
    if (!editTitle || !editTarget) {
      popup.alert("Missing Required Fields", "Title and Target Amount are required.");
      return;
    }

    setSaving(true);
    try {
      const target_amount = Math.round(Number(editTarget) * 100);
      const current_amount = Math.round(Number(editCurrent || "0") * 100);

      const body: any = {
        title: editTitle,
        target_amount,
        current_amount,
        category: "General",
        status: "in_progress",
        ai_advice: "Manually created goal.",
      };

      if (editDeadline) {
        body.target_date = editDeadline;
      }

      const res = await fetch(`/api/goals/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setEditingGoal(null); // Close modal
        fetchGoals();
        popup.success("Goal Created", "Your new financial goal has been created.");
      } else {
        popup.error("Error", "Failed to create goal");
      }
    } catch (err) {
      console.error(err);
      popup.error("Error", "Error creating goal");
    } finally {
      setSaving(false);
    }
  }

  // Save Edit handler
  async function handleSaveEdit() {
    if (editingGoal && editingGoal.id === "new") {
      return handleCreateGoal();
    }

    if (!editingGoal) return;
    if (!editTitle || !editTarget) {
      popup.alert("Missing Required Fields", "Title and Target Amount are required.");
      return;
    }

    setSaving(true);
    try {
      // API expects kobo (Naira * 100)
      const current_amount = Math.round(Number(editCurrent) * 100);
      const target_amount = Math.round(Number(editTarget) * 100);

      const body: any = {
        title: editTitle,
        target_amount,
        current_amount,
      };

      if (editDeadline) {
        body.target_date = editDeadline;
      }

      const res = await fetch(`/api/goals/${editingGoal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setEditingGoal(null);
        fetchGoals();
        popup.success("Goal Updated", "Your goal details have been saved.");
      } else {
        popup.error("Error", "Failed to update goal");
      }
    } catch (err) {
      console.error(err);
      popup.error("Error", "Error saving goal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "var(--bg)" }}>
      {/* Milestone toast */}
      <AnimatePresence>
        {toast && (
          <MilestoneToast
            key={toast.id}
            goal={toast}
            onDismiss={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      <div className="px-4 py-6 sm:px-6 lg:px-8 w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="text-[22px] font-semibold" style={{ color: "var(--text)", fontFamily: "var(--font-sora)" }}>
            Your{" "}
            <em style={{ fontFamily: "var(--font-dm-serif)", fontStyle: "italic", color: "var(--green)" }}>
              Financial Goals
            </em>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {goals.length > 0 && (
              <button
                onClick={handleClearAllGoals}
                className="px-3.5 py-[9px] rounded-[10px] text-[12px] font-semibold transition-all duration-150 border cursor-pointer"
                style={{ borderColor: "rgba(220,38,38,0.3)", color: "#DC2626", background: "rgba(220,38,38,0.05)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,38,38,0.15)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(220,38,38,0.05)"; }}
              >
                🗑️ Clear All Goals
              </button>
            )}
            <button
              onClick={() => {
                setEditingGoal({ id: "new", title: "", current: 0, target: 0 } as any);
                setEditTitle("");
                setEditCurrent("");
                setEditTarget("");
                setEditDeadline("");
              }}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold transition-all duration-150 border cursor-pointer"
              style={{ borderColor: "var(--border)", color: "var(--text)", background: "transparent" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--navy)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              + Manual Goal
            </button>
            <button
              onClick={() => router.push("/chat")}
              className="px-4 py-[9px] rounded-[10px] text-[12px] font-semibold transition-all duration-150 cursor-pointer"
              style={{ background: "var(--green)", color: "#fff", border: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green)"; }}
            >
              + New Goal in Chat
            </button>
          </div>
        </div>

        {/* Hint badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-[5px] rounded-full text-[11px] font-medium mb-6"
          style={{
            background: "rgba(245,166,35,.12)",
            border: "1px solid rgba(245,166,35,.3)",
            color: "#C47F00",
          }}
        >
          💡 Goals set inside a chat are automatically tracked here
        </div>

        {/* KPI stats */}
        <div
          className="grid gap-4 mb-7"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
        >
          <StatCard label="Total Saved" value="₦820k" change="+₦145k this month" changeUp />
          <StatCard label="Active Goals" value="3" change="1 ahead of schedule" changeUp />
          <StatCard label="Advice Acted On" value="68%" change="+12% vs last month" changeUp />
          <StatCard label="Next Milestone" value="18d" change="Emergency fund" />
        </div>

        {/* Goal list */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => <SkeletonGoalCard key={i} />)}
          </div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-[48px] mb-4">🎯</div>
            <div className="text-[15px] font-semibold mb-2" style={{ color: "var(--text)" }}>
              No goals set yet
            </div>
            <div className="text-[13px] mb-5 max-w-[340px]" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
              Your Finance Buddy can help you set your first goal. Start a chat and ask: &ldquo;Help me set a savings goal.&rdquo;
            </div>
            <button
              onClick={() => router.push("/chat")}
              className="px-5 py-[10px] rounded-[10px] text-[13px] font-semibold"
              style={{ background: "var(--green)", color: "#fff", border: "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green)"; }}
            >
              Start a Chat →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onMilestone={handleMilestone}
                onEdit={handleStartEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal Overlay */}
      {editingGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md rounded-[16px] p-6 shadow-2xl transition-all border text-white"
            style={{ background: "var(--navy2)", borderColor: "rgba(0,196,140,.3)" }}
          >
            <h3 className="text-[18px] font-semibold mb-4 flex items-center gap-2">
              {editingGoal.id === "new" ? "🎯 Create Financial Goal" : "✏️ Edit Financial Goal"}
            </h3>
            
            <div className="flex flex-col gap-4 text-left">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] block mb-1" style={{ color: "var(--muted)" }}>
                  Goal Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-[8px] border text-[13px]"
                  style={{ background: "var(--navy)", borderColor: "var(--border)", color: "#fff" }}
                  placeholder="e.g. Emergency Fund"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.5px] block mb-1" style={{ color: "var(--muted)" }}>
                    Current Saved (₦)
                  </label>
                  <input
                    type="number"
                    value={editCurrent}
                    onChange={(e) => setEditCurrent(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] border text-[13px]"
                    style={{ background: "var(--navy)", borderColor: "var(--border)", color: "#fff" }}
                    placeholder="e.g. 150000"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.5px] block mb-1" style={{ color: "var(--muted)" }}>
                    Target Amount (₦)
                  </label>
                  <input
                    type="number"
                    value={editTarget}
                    onChange={(e) => setEditTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] border text-[13px]"
                    style={{ background: "var(--navy)", borderColor: "var(--border)", color: "#fff" }}
                    placeholder="e.g. 500000"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-[0.5px] block mb-1" style={{ color: "var(--muted)" }}>
                  Target Date (Optional)
                </label>
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-[8px] border text-[13px]"
                  style={{ background: "var(--navy)", borderColor: "var(--border)", color: "#fff" }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingGoal(null)}
                className="px-4 py-2 rounded-[8px] text-[12px] font-semibold border transition-colors hover:bg-neutral-800"
                style={{ borderColor: "var(--border)", color: "var(--muted)", background: "transparent" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 rounded-[8px] text-[12px] font-semibold transition-colors text-white"
                style={{ background: "var(--green)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green2)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--green)"; }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
