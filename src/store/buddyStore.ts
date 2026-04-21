import { create } from "zustand";
import { ALL_BUDDIES, getBuddy, type Buddy } from "@/lib/buddies";

type BuddyStore = {
  // ── State ──────────────────────────────────────────────
  activeBuddy: Buddy | null;
  subscribedBuddies: Buddy[];
  allBuddies: Buddy[];

  // ── Actions ────────────────────────────────────────────
  setActiveBuddy: (buddy: Buddy | string | null) => void;

  /**
   * Fetches the user's active subscriptions from /api/subscriptions
   * and resolves them against the static buddy catalogue.
   */
  loadSubscribedBuddies: () => Promise<void>;
};

export const useBuddyStore = create<BuddyStore>((set) => ({
  activeBuddy: getBuddy("contrarian") ?? null,
  subscribedBuddies: [],
  allBuddies: ALL_BUDDIES,

  setActiveBuddy: (buddy) => {
    if (buddy === null) {
      set({ activeBuddy: null });
      return;
    }
    const resolved =
      typeof buddy === "string" ? (getBuddy(buddy) ?? null) : buddy;
    set({ activeBuddy: resolved });
  },

  loadSubscribedBuddies: async () => {
    try {
      const res = await fetch("/api/subscriptions");
      if (!res.ok) return;
      const data = (await res.json()) as { buddy_id: string }[];
      const buddies = data
        .map((s) => getBuddy(s.buddy_id))
        .filter((b): b is Buddy => b !== undefined);
      set({ subscribedBuddies: buddies });
    } catch (e) {
      console.error("[buddyStore] loadSubscribedBuddies:", e);
    }
  },
}));
