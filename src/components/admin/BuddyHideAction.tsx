"use client";

import { useTransition } from "react";
import { hideBuddyAction, unhideBuddyAction } from "@/app/admin/buddies/actions";

export function BuddyHideAction({ buddyId, hidden }: { buddyId: string; hidden: boolean }) {
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      if (hidden) await unhideBuddyAction(buddyId);
      else await hideBuddyAction(buddyId);
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      style={{
        marginTop: 14,
        width: "100%",
        height: 36,
        borderRadius: 8,
        border: hidden ? "1.5px solid #00C48C" : "none",
        background: hidden
          ? "transparent"
          : isPending ? "#E2E7F0" : "#E24B4A",
        fontSize: 12,
        fontWeight: 600,
        color: hidden ? "#00A677" : isPending ? "#9CA3AF" : "#ffffff",
        cursor: isPending ? "not-allowed" : "pointer",
        transition: "all .15s",
      }}
    >
      {isPending ? "Saving…" : hidden ? "Restore to Marketplace" : "Delete from Marketplace"}
    </button>
  );
}
