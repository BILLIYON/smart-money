import { create } from "zustand";

// ── Types ──────────────────────────────────────────────────
export type NotificationType = "signal" | "goal" | "agent" | "salary" | "system";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  buddyId?: string;
  buddyName?: string;
  sessionId?: string;
  triggerSource?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

type NotificationStore = {
  // ── State ──────────────────────────────────────────────
  notifications: Notification[];
  unreadCount: number;

  // ── Actions ────────────────────────────────────────────
  loadNotifications: () => Promise<void>;

  markAllRead: () => void;

  markRead: (id: string) => void;

  /** Called by RealtimeProvider when a new signal/goal/agent event arrives. */
  addNotification: (n: Omit<Notification, "id" | "createdAt">) => void;

  dismiss: (id: string) => void;
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,

  loadNotifications: async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;

      // DB rows use snake_case; map to store shape
      type DbRow = {
        id: string;
        buddy_id: string | null;
        title: string;
        body: string;
        trigger_type: string;
        trigger_source: string | null;
        action_url: string | null;
        read: boolean;
        created_at: string;
      };

      const rows = (await res.json()) as DbRow[];
      const notifications: Notification[] = rows.map((r) => ({
        id: r.id,
        type: r.trigger_type as NotificationType,
        title: r.title,
        body: r.body,
        read: r.read,
        buddyId: r.buddy_id ?? undefined,
        triggerSource: r.trigger_source ?? undefined,
        actionUrl: r.action_url ?? undefined,
        createdAt: r.created_at,
      }));

      set({
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      });
    } catch (e) {
      console.error("[notificationStore] load:", e);
    }
  },

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  markRead: (id) =>
    set((s) => {
      const updated = s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    }),

  addNotification: (n) =>
    set((s) => {
      const notification: Notification = {
        ...n,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      const notifications = [notification, ...s.notifications];
      return {
        notifications,
        unreadCount: notifications.filter((x) => !x.read).length,
      };
    }),

  dismiss: (id) =>
    set((s) => {
      const notifications = s.notifications.filter((n) => n.id !== id);
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      };
    }),
}));
