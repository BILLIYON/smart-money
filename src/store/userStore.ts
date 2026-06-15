import { create } from "zustand";

type UserProfile = {
  currency: string;
  full_name: string | null;
  email: string | null;
  primary_goal: string | null;
  risk_tolerance: string | null;
  income_range: string | null;
  plan: string;
};

type UserStore = {
  userCurrency: string;
  profile: UserProfile | null;
  loadProfile: () => Promise<void>;
  setUserCurrency: (code: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
};

export const useUserStore = create<UserStore>((set) => ({
  userCurrency: "NGN",
  profile: null,

  loadProfile: async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) return;
      const data = (await res.json()) as UserProfile;
      set({ profile: data, userCurrency: data.currency ?? "NGN" });
    } catch (e) {
      console.error("[userStore] loadProfile:", e);
    }
  },

  setUserCurrency: async (code: string) => {
    set({ userCurrency: code });
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: code }),
      });
    } catch (e) {
      console.error("[userStore] setUserCurrency:", e);
    }
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : null,
          ...(updates.currency && { userCurrency: updates.currency }),
        }));
        return true;
      }
      return false;
    } catch (e) {
      console.error("[userStore] updateProfile:", e);
      return false;
    }
  },
}));
