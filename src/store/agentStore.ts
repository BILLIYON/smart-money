import { create } from "zustand";
import { useMilestoneToast } from "@/components/ui/MilestoneToast";
import { ALL_BUDDIES } from "@/lib/buddies";

// ── Types ──────────────────────────────────────────────────
export type AgentAction = {
  id: string;
  buddy_id: string | null;
  action_type: string;
  description: string;
  amount: number | null;       // kobo
  currency: string;
  from_account: string | null;
  to_account: string | null;
  status: "pending" | "approved" | "executed" | "declined";
  reference: string | null;
  approved_at: string | null;
  executed_at: string | null;
  created_at: string;
  // UI-only fields populated from buddy catalogue
  buddyName?: string;
  buddyEmoji?: string;
  buddyBg?: string;
};

export type BankConnection = {
  id: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  status: "connected" | "pending" | "error";
};

type AgentStore = {
  // ── State ──────────────────────────────────────────────
  pendingActions: AgentAction[];
  history: AgentAction[];
  walletBalance: number;   // kobo
  connections: BankConnection[];
  isLoading: boolean;
  limits: { perAction: number; daily: number; monthly: number } | null;

  // ── Actions ────────────────────────────────────────────
  loadPending: () => Promise<void>;

  /**
   * Executes a pending action after user confirmation.
   * Updates the local state immediately on success.
   */
  executeAction: (actionId: string) => Promise<{ reference: string } | null>;

  /**
   * Declines a pending action (local optimistic update + API call).
   */
  declineAction: (actionId: string) => Promise<void>;

  loadHistory: () => Promise<void>;

  /** Called by RealtimeProvider when an action status changes. */
  patchAction: (actionId: string, patch: Partial<AgentAction>) => void;

  fetchWalletBalance: () => Promise<void>;
  fetchLimits: () => Promise<void>;
  saveLimits: (newLimits: { perAction: number; daily: number; monthly: number }) => Promise<boolean>;
};

export const useAgentStore = create<AgentStore>((set, get) => ({
  pendingActions: [],
  history: [],
  walletBalance: 0,
  connections: [],
  isLoading: false,
  limits: null,

  loadPending: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/agent/pending");
      if (!res.ok) return;
      const data = (await res.json()) as AgentAction[];
      
      const mapped = data.map((action) => {
        const buddy = ALL_BUDDIES.find((b) => b.id === action.buddy_id);
        return {
          ...action,
          buddyName: buddy?.name || "AI Buddy",
          buddyEmoji: buddy?.avatarContent || "⚡",
          buddyBg: buddy?.avatarBg || "var(--border)",
        };
      });

      set({ pendingActions: mapped });
    } catch (e) {
      console.error("[agentStore] loadPending:", e);
    } finally {
      set({ isLoading: false });
    }
  },

  executeAction: async (actionId: string) => {
    const res = await fetch("/api/agent/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to execute action");
    }
    
    const { reference } = await res.json() as { reference: string };

    // Capture action details before mutating state
    let executedAction: AgentAction | undefined;
    set((s) => {
      executedAction = s.pendingActions.find((a) => a.id === actionId);
      if (!executedAction) return s;
      const updated: AgentAction = {
        ...executedAction,
        status: "executed",
        reference,
        executed_at: new Date().toISOString(),
      };
      return {
        pendingActions: s.pendingActions.filter((a) => a.id !== actionId),
        history: [updated, ...s.history],
      };
    });

    // Fire milestone celebration toast
    if (executedAction) {
      useMilestoneToast.getState().show(
        "Action Executed!",
        executedAction.description || "Your financial action was completed.",
        executedAction.buddyEmoji ?? "🏆",
      );
    }

    // Refresh wallet balance
    await get().fetchWalletBalance();

    return { reference };
  },

  declineAction: async (actionId: string) => {
    // Optimistic: remove from pending immediately
    set((s) => {
      const action = s.pendingActions.find((a) => a.id === actionId);
      if (!action) return s;
      return {
        pendingActions: s.pendingActions.filter((a) => a.id !== actionId),
        history: [{ ...action, status: "declined" as const }, ...s.history],
      };
    });

    try {
      await fetch("/api/agent/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId }),
      });
    } catch (e) {
      console.error("[agentStore] declineAction:", e);
      // TODO: rollback optimistic update on network error
    }
  },

  loadHistory: async () => {
    try {
      const res = await fetch("/api/agent/history");
      if (!res.ok) return;
      const data = (await res.json()) as AgentAction[];
      set({ history: data });
    } catch (e) {
      console.error("[agentStore] loadHistory:", e);
    }
  },

  patchAction: (actionId, patch) =>
    set((s) => {
      const inPending = s.pendingActions.some((a) => a.id === actionId);
      if (inPending) {
        return {
          pendingActions: s.pendingActions.map((a) =>
            a.id === actionId ? { ...a, ...patch } : a
          ),
        };
      }
      return {
        history: s.history.map((a) =>
          a.id === actionId ? { ...a, ...patch } : a
        ),
      };
    }),

  fetchWalletBalance: async () => {
    try {
      const res = await fetch("/api/agent/wallet");
      if (!res.ok) return;
      const { balance } = await res.json() as { balance: number };
      set({ walletBalance: balance });
    } catch (e) {
      console.error("[agentStore] fetchWalletBalance:", e);
    }
  },

  fetchLimits: async () => {
    try {
      const res = await fetch("/api/agent/limits");
      if (!res.ok) return;
      const data = await res.json() as { limitPerAction: number; limitDaily: number; limitMonthly: number };
      set({
        limits: {
          perAction: data.limitPerAction,
          daily: data.limitDaily,
          monthly: data.limitMonthly,
        }
      });
    } catch (e) {
      console.error("[agentStore] fetchLimits:", e);
    }
  },

  saveLimits: async (newLimits) => {
    try {
      const res = await fetch("/api/agent/limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limitPerAction: newLimits.perAction,
          limitDaily: newLimits.daily,
          limitMonthly: newLimits.monthly,
        }),
      });
      if (res.ok) {
        set({ limits: newLimits });
        return true;
      }
      return false;
    } catch (e) {
      console.error("[agentStore] saveLimits:", e);
      return false;
    }
  },
}));
