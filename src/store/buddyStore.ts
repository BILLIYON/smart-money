import { create } from "zustand";
import { type Buddy } from "@/lib/buddies";
import type { CommunityBuddyRow } from "@/lib/db";

const MODEL_COLOR: Record<string, string> = {
  Claude: "#7B68EE",
  "GPT-4": "#10A37F",
  Gemini: "#4285F4",
  Groq: "#F55036",
};

function rowToBuddy(row: CommunityBuddyRow): Buddy {
  const price =
    row.price_note ||
    (row.price === "free" || row.price === "0" ? "Free" : `₦${row.price}/mo`);
  const badgeType: "free" | "pro" = (row.price === "free" || row.price === "0" || row.price_note === "Free") ? "free" : "pro";
  const rawModel = (row.model ?? "").toLowerCase();
  const model: Buddy["model"] =
    rawModel.includes("groq") || rawModel.includes("llama") ? "Groq" :
    rawModel.includes("gpt") ? "GPT-4" :
    rawModel.includes("gemini") ? "Gemini" :
    "Claude";

  return {
    id: row.id,
    name: row.name,
    tag: row.tag ?? "",
    desc: row.description ?? "",
    price,
    priceNote: row.price_note ?? "",
    badge: price,
    badgeType,
    bannerColor: row.banner_color ?? "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
    avatarBg: row.avatar_bg ?? "#1A3A6E",
    avatarContent: row.avatar_content ?? "🎯",
    avatarIsSerif: row.avatar_is_serif ?? false,
    model,
    modelColor: MODEL_COLOR[model] ?? "#7B68EE",
    rating: row.rating ? String(row.rating) : "4.8",
    reviewCount: row.review_count ? String(row.review_count) : "5.2k",
    isFanSim: row.is_fan_sim ?? false,
    disclaimer: row.disclaimer ?? undefined,
    categories: (row.categories ?? []) as any,
    philosophy: row.philosophy ?? "",
    samples: row.samples ?? [],
    reviews: [],
    includes: row.includes ?? [],
  };
}

type BuddyStore = {
  activeBuddy: Buddy | null;
  subscribedBuddies: Buddy[];
  allBuddies: Buddy[];
  searchQuery: string;

  setActiveBuddy: (buddy: Buddy | string | null) => void;
  setSearchQuery: (query: string) => void;
  loadSubscribedBuddies: () => Promise<void>;
  fetchAllBuddies: () => Promise<Buddy[]>;
};

export const useBuddyStore = create<BuddyStore>((set, get) => ({
  activeBuddy: null,
  subscribedBuddies: [],
  allBuddies: [],
  searchQuery: "",

  setActiveBuddy: (buddy) => {
    if (buddy === null) {
      set({ activeBuddy: null });
      return;
    }
    if (typeof buddy === "string") {
      const match = get().allBuddies.find((b) => b.id === buddy);
      if (match) set({ activeBuddy: match });
    } else {
      set({ activeBuddy: buddy });
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  fetchAllBuddies: async () => {
    try {
      const res = await fetch("/api/studio");
      if (!res.ok) return [];
      const rows = (await res.json()) as CommunityBuddyRow[];
      const buddies = rows.map(rowToBuddy);
      set({ allBuddies: buddies });
      if (!get().activeBuddy && buddies.length > 0) {
        set({ activeBuddy: buddies[0] });
      }
      return buddies;
    } catch (e) {
      console.error("[buddyStore] fetchAllBuddies error:", e);
      return [];
    }
  },

  loadSubscribedBuddies: async () => {
    try {
      let buddies = get().allBuddies;
      if (buddies.length === 0) {
        buddies = await get().fetchAllBuddies();
      }
      const res = await fetch("/api/subscriptions");
      if (!res.ok) return;
      const data = (await res.json()) as { buddy_id: string }[];
      const subSet = new Set(data.map((s) => s.buddy_id));
      const subscribed = buddies.filter((b) => subSet.has(b.id));
      set({ subscribedBuddies: subscribed });
    } catch (e) {
      console.error("[buddyStore] loadSubscribedBuddies:", e);
    }
  },
}));
