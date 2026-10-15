import { create } from "zustand";

type CompareStore = {
  open: boolean;
  openCompare: () => void;
  closeCompare: () => void;
};

export const useCompareStore = create<CompareStore>((set) => ({
  open: false,
  openCompare:  () => set({ open: true }),
  closeCompare: () => set({ open: false }),
}));
