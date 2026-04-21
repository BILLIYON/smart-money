"use client";

import { useState, useTransition, useEffect, useRef } from "react";

type Props = {
  confirmPhrase: string;
  buttonLabel: string;
  action: () => Promise<{ count: number }>;
};

type Toast = { count: number; id: number };

export function DangerZoneAction({ confirmPhrase, buttonLabel, action }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [input, setInput] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (modalOpen) {
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [modalOpen]);

  function closeModal() {
    setModalOpen(false);
    setInput("");
  }

  function showToast(count: number) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ count, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  function handleConfirm() {
    if (input !== confirmPhrase || isPending) return;
    startTransition(async () => {
      const { count } = await action();
      closeModal();
      showToast(count);
    });
  }

  const ready = input === confirmPhrase;

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        style={{
          padding: "8px 18px",
          borderRadius: 9,
          border: "1.5px solid #E53E3E",
          background: "transparent",
          color: "#E53E3E",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all .15s",
          whiteSpace: "nowrap",
        }}
      >
        {buttonLabel}
      </button>

      {/* Modal */}
      {modalOpen && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11,30,61,.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: 32,
              width: 440,
              boxShadow: "0 8px 40px rgba(11,30,61,.2)",
            }}
          >
            {/* Warning icon row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "rgba(229,62,62,.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                ⚠️
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#0B1E3D" }}>
                  Are you absolutely sure?
                </div>
                <div style={{ fontSize: 12, color: "#6B7A99", marginTop: 2 }}>
                  This action is permanent and cannot be undone.
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#6B7A99",
                  marginBottom: 8,
                  lineHeight: 1.5,
                }}
              >
                Type{" "}
                <span
                  style={{
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: "#E53E3E",
                    background: "rgba(229,62,62,.07)",
                    padding: "1px 5px",
                    borderRadius: 4,
                  }}
                >
                  {confirmPhrase}
                </span>{" "}
                to confirm
              </label>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                placeholder={confirmPhrase}
                style={{
                  width: "100%",
                  height: 42,
                  padding: "0 14px",
                  border: `1.5px solid ${ready ? "#E53E3E" : "#E2E7F0"}`,
                  borderRadius: 10,
                  fontSize: 13,
                  fontFamily: "monospace",
                  color: "#0B1E3D",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color .15s",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={closeModal}
                disabled={isPending}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 10,
                  border: "1px solid #E2E7F0",
                  background: "transparent",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#6B7A99",
                  cursor: isPending ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!ready || isPending}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 10,
                  border: "none",
                  background: ready && !isPending ? "#E53E3E" : "#E2E7F0",
                  fontSize: 13,
                  fontWeight: 600,
                  color: ready && !isPending ? "#ffffff" : "#9CA3AF",
                  cursor: ready && !isPending ? "pointer" : "not-allowed",
                  transition: "all .15s",
                }}
              >
                {isPending ? "Deleting…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {toast && (
        <div
          key={toast.id}
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            background: "#0B1E3D",
            color: "#ffffff",
            borderRadius: 12,
            padding: "14px 20px",
            fontSize: 13,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 4px 20px rgba(11,30,61,.25)",
            zIndex: 2000,
            animation: "fadeInUp .2s ease",
          }}
        >
          <span style={{ fontSize: 16 }}>✓</span>
          <span>
            <strong style={{ color: "#00C48C" }}>{toast.count}</strong>{" "}
            {toast.count === 1 ? "row" : "rows"} deleted
          </span>
        </div>
      )}
    </>
  );
}
