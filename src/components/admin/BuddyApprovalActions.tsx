"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { approveBuddyAction, rejectBuddyAction } from "@/app/admin/approvals/actions";

export function BuddyApprovalActions({ buddyId }: { buddyId: string }) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isRejecting) textareaRef.current?.focus();
  }, [isRejecting]);

  function handleApprove() {
    startTransition(async () => {
      await approveBuddyAction(buddyId);
    });
  }

  function handleRejectConfirm() {
    if (!reason.trim() || isPending) return;
    startTransition(async () => {
      await rejectBuddyAction(buddyId, reason.trim());
    });
  }

  if (isRejecting) {
    return (
      <div style={{ marginTop: 14 }}>
        <textarea
          ref={textareaRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection…"
          rows={3}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1.5px solid #F5A623",
            borderRadius: 10,
            fontSize: 12,
            color: "#0B1E3D",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            onClick={() => { setIsRejecting(false); setReason(""); }}
            disabled={isPending}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 8,
              border: "1px solid #E2E7F0",
              background: "transparent",
              fontSize: 12,
              fontWeight: 600,
              color: "#6B7A99",
              cursor: isPending ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleRejectConfirm}
            disabled={!reason.trim() || isPending}
            style={{
              flex: 1,
              height: 36,
              borderRadius: 8,
              border: "none",
              background: reason.trim() && !isPending ? "#F5A623" : "#E2E7F0",
              fontSize: 12,
              fontWeight: 600,
              color: reason.trim() && !isPending ? "#ffffff" : "#9CA3AF",
              cursor: reason.trim() && !isPending ? "pointer" : "not-allowed",
              transition: "all .15s",
            }}
          >
            {isPending ? "Rejecting…" : "Confirm Reject"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
      <button
        onClick={handleApprove}
        disabled={isPending}
        style={{
          flex: 1,
          height: 36,
          borderRadius: 8,
          border: "none",
          background: isPending ? "#E2E7F0" : "#00C48C",
          fontSize: 12,
          fontWeight: 600,
          color: isPending ? "#9CA3AF" : "#ffffff",
          cursor: isPending ? "not-allowed" : "pointer",
          transition: "all .15s",
        }}
      >
        {isPending ? "Saving…" : "Approve"}
      </button>
      <button
        onClick={() => setIsRejecting(true)}
        disabled={isPending}
        style={{
          flex: 1,
          height: 36,
          borderRadius: 8,
          border: "1.5px solid #F5A623",
          background: "transparent",
          fontSize: 12,
          fontWeight: 600,
          color: "#F5A623",
          cursor: isPending ? "not-allowed" : "pointer",
        }}
      >
        Reject
      </button>
    </div>
  );
}
