import { create } from "zustand";
import React from "react";

export type PopupType = "alert" | "confirm" | "success" | "danger" | "info";

export interface PopupOptions {
  title: string;
  description?: React.ReactNode | string;
  type?: PopupType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
}

interface PopupState {
  isOpen: boolean;
  options: PopupOptions | null;
  isLoading: boolean;
  show: (options: PopupOptions) => void;
  hide: () => void;
  confirm: () => Promise<void>;
  cancel: () => Promise<void>;
  alert: (title: string, description?: React.ReactNode | string, type?: PopupType) => void;
  ask: (title: string, description: React.ReactNode | string, onConfirm: () => void | Promise<void>) => void;
}

export const usePopupStore = create<PopupState>((set, get) => ({
  isOpen: false,
  options: null,
  isLoading: false,

  show: (options) => {
    set({ isOpen: true, options, isLoading: false });
  },

  hide: () => {
    set({ isOpen: false });
    // Wait a bit before clearing options so the exit animation remains smooth
    setTimeout(() => {
      set((state) => (state.isOpen ? state : { options: null, isLoading: false }));
    }, 300);
  },

  confirm: async () => {
    const { options, hide } = get();
    if (!options) return;
    
    if (options.onConfirm) {
      set({ isLoading: true });
      try {
        await options.onConfirm();
      } finally {
        hide();
      }
    } else {
      hide();
    }
  },

  cancel: async () => {
    const { options, hide } = get();
    if (options?.onCancel) {
      await options.onCancel();
    }
    hide();
  },

  alert: (title, description, type = "info") => {
    get().show({ title, description, type, confirmText: "OK" });
  },

  ask: (title, description, onConfirm) => {
    get().show({
      title,
      description,
      type: "confirm",
      confirmText: "Yes",
      cancelText: "Cancel",
      onConfirm
    });
  }
}));

export const popup = {
  alert: (title: string, description?: string, type: PopupType = "info") =>
    usePopupStore.getState().alert(title, description, type),
  success: (title: string, description?: string) =>
    usePopupStore.getState().alert(title, description, "success"),
  error: (title: string, description?: string) =>
    usePopupStore.getState().alert(title, description, "danger"),
  confirm: (
    title: string,
    description: string,
    onConfirm: () => void | Promise<void>,
    options?: { confirmText?: string; cancelText?: string; type?: PopupType }
  ) =>
    usePopupStore.getState().show({
      title,
      description,
      type: options?.type || "confirm",
      confirmText: options?.confirmText || "Confirm",
      cancelText: options?.cancelText || "Cancel",
      onConfirm,
    }),
  danger: (
    title: string,
    description: string,
    onConfirm: () => void | Promise<void>,
    confirmText = "Delete"
  ) =>
    usePopupStore.getState().show({
      title,
      description,
      type: "danger",
      confirmText,
      cancelText: "Cancel",
      onConfirm,
    }),
  show: (options: PopupOptions) => usePopupStore.getState().show(options),
  hide: () => usePopupStore.getState().hide(),
};

