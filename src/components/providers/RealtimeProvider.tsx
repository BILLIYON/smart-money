"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useChatStore, type SignalAlert } from "@/store/chatStore";
import { useAgentStore } from "@/store/agentStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useSalaryMoment } from "@/components/ui/SalaryMomentOverlay";
import { getBuddy } from "@/lib/buddies";

type RealtimeMessage = {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "signal";
  buddy_id: string | null;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type RealtimeAgentAction = {
  id: string;
  status: "pending" | "approved" | "executed" | "declined";
  reference: string | null;
  executed_at: string | null;
  approved_at: string | null;
};

type RealtimeDatabankEntry = {
  id: string;
  source: string;
  entry_type: string;
  amount: number;
  description: string | null;
  metadata: Record<string, string>;
};

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const addSignalAlert = useChatStore((s) => s.addSignalAlert);
  const addMessage = useChatStore((s) => s.addMessage);
  const activeBuddyId = useChatStore((s) => s.activeBuddyId);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const patchAction = useAgentStore((s) => s.patchAction);
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    // Get current user once — subscriptions are filtered server-side via RLS
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;

      // Clean up any previous channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase
        .channel(`realtime:${userId}`)

        // ── New messages in any of the user's sessions ─────────
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            // RLS ensures only this user's rows come through
          },
          (payload) => {
            const msg = payload.new as RealtimeMessage;

            // Signal alerts get special treatment
            if (msg.role === "signal") {
              const buddy = msg.buddy_id ? getBuddy(msg.buddy_id) : null;
              const signalMeta = msg.metadata?.signalAlert as
                | { sourceName: string; headline: string }
                | undefined;

              const alert: SignalAlert = {
                id: msg.id,
                buddyId: msg.buddy_id ?? activeBuddyId,
                buddyName: buddy?.name ?? "Your Buddy",
                headline: signalMeta?.headline ?? msg.content,
                body: msg.content,
                sourceName: signalMeta?.sourceName ?? "Signal",
                sessionId: msg.session_id,
                createdAt: msg.created_at,
              };

              addSignalAlert(alert);
              addNotification({
                type: "signal",
                title: `${buddy?.name ?? "Buddy"}: ${signalMeta?.headline ?? "New signal"}`,
                body: msg.content,
                read: false,
                buddyId: msg.buddy_id ?? undefined,
                sessionId: msg.session_id,
              });
              return;
            }

            // Regular assistant message from a different device/tab —
            // only append if it's for the currently active session
            if (
              msg.role === "assistant" &&
              msg.session_id === activeSessionId &&
              msg.buddy_id === activeBuddyId
            ) {
              addMessage(activeBuddyId, {
                id: msg.id,
                role: "ai",
                buddyId: msg.buddy_id ?? undefined,
                content: msg.content,
                time: new Date(msg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                showActions: true,
              });
            }
          }
        )

        // ── Agent action status changes ────────────────────────
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "agent_actions",
          },
          (payload) => {
            const action = payload.new as RealtimeAgentAction;
            patchAction(action.id, {
              status: action.status,
              reference: action.reference ?? undefined,
              executed_at: action.executed_at ?? undefined,
              approved_at: action.approved_at ?? undefined,
            });

            if (action.status === "executed") {
              addNotification({
                type: "agent",
                title: "Action executed",
                body: `Reference: ${action.reference ?? "—"}`,
                read: false,
              });
            }
          }
        )

        // ── Open Banking credit entries (salary detection) ────
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "databank_entries",
            filter: "source=eq.openbanking",
          },
          (payload) => {
            const entry = payload.new as RealtimeDatabankEntry;
            // ₦50,000+ income credit triggers the salary moment overlay
            if (entry.entry_type === "income" && entry.amount > 5_000_000) {
              const accountName =
                entry.metadata?.account_name ??
                entry.description ??
                "Your Bank";
              const nairaStr = `₦${Math.floor(entry.amount / 100).toLocaleString("en-NG")}`;
              useSalaryMoment.getState().show(entry.amount, accountName);
              addNotification({
                type: "salary",
                title: "Salary Detected",
                body: `${nairaStr} credited to ${accountName}. Your buddy has a plan ready.`,
                triggerSource: `salary credit · ${accountName}`,
                actionUrl: "/chat",
                read: false,
              });
            }
          }
        )

        .subscribe();

      channelRef.current = channel;
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount

  return <>{children}</>;
}
