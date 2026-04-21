import { create } from "zustand";

// ── Types ──────────────────────────────────────────────────
export type DatabankContextResponse = {
  monthlySummary: {
    income: number;
    expenses: number;
    net: number;
    savingsRate: number;
  };
  topCategories: { category: string; amount: number }[];
  activeGoals: {
    title: string;
    targetAmount: number;
    currentAmount: number;
    progress: number;
    targetDate: string | null;
  }[];
  recentTransactions: {
    description: string;
    amount: number;
    date: string;
    category: string;
  }[];
  subscriptions: { description: string; amount: number; date: string }[];
  netWorth: number;
  savingsBalance: number;
};

export type DataSource = {
  id: string;
  label: string;
  connected: boolean;
  type: "upload" | "gmail" | "openbanking" | "manual";
};

export type ManualEntry = {
  entry_type: "income" | "expense" | "subscription" | "asset" | "debt";
  amount: number;   // kobo
  description: string;
  date: string;     // ISO date
  category?: string;
};

export type UploadResult = {
  parsed: number;
  totalIncome: number;
  totalExpenses: number;
  categories: string[];
};

type DatabankStore = {
  // ── State ──────────────────────────────────────────────
  context: DatabankContextResponse | null;
  sources: DataSource[];
  isLoading: boolean;
  uploadError: string | null;

  // ── Actions ────────────────────────────────────────────
  /** Fetches the aggregated DataBank context for the current user. */
  loadContext: () => Promise<void>;

  /** Uploads a PDF or CSV bank statement. */
  uploadStatement: (file: File) => Promise<UploadResult>;

  /** Adds a single manual entry and refreshes context. */
  addManualEntry: (entry: ManualEntry) => Promise<void>;
};

export const useDatabankStore = create<DatabankStore>((set, get) => ({
  context: null,
  sources: [
    { id: "upload",      label: "Bank Statements",    connected: false, type: "upload" },
    { id: "gmail",       label: "Gmail Integration",  connected: false, type: "gmail" },
    { id: "openbanking", label: "Open Banking",       connected: false, type: "openbanking" },
    { id: "manual",      label: "Manual Entry",       connected: true,  type: "manual" },
  ],
  isLoading: false,
  uploadError: null,

  loadContext: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/databank/context");
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as DatabankContextResponse;
      set({ context: data });
    } catch (e) {
      console.error("[databankStore] loadContext:", e);
    } finally {
      set({ isLoading: false });
    }
  },

  uploadStatement: async (file: File): Promise<UploadResult> => {
    set({ uploadError: null });
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/databank/upload", { method: "POST", body: form });
    const json = await res.json();

    if (!res.ok) {
      const msg = json.error ?? "Upload failed";
      set({ uploadError: msg });
      throw new Error(msg);
    }

    // Refresh context after upload
    await get().loadContext();
    return json as UploadResult;
  },

  addManualEntry: async (entry: ManualEntry): Promise<void> => {
    const res = await fetch("/api/databank/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });

    if (!res.ok) {
      const { error } = await res.json();
      throw new Error(error ?? "Failed to save entry");
    }

    // Refresh context to reflect new entry
    await get().loadContext();
  },
}));
