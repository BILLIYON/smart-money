import { create } from "zustand";

type UserProfile = {
  currency: string;
  full_name: string | null;
  email: string | null;
};

type UserStore = {
  userCurrency: string;
  profile: UserProfile | null;
  loadProfile: () => Promise<void>;
  setUserCurrency: (code: string) => Promise<void>;
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
}));
