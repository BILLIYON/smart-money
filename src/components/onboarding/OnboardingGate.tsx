"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { OnboardingModal, type OnboardingResult, type RestoredState } from "./OnboardingModal";

const SESSION_KEY = "onboarding_state";

export function OnboardingGate() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [restored, setRestored] = useState<RestoredState | null>(null);

  useEffect(() => {
    // Detect return from Gmail OAuth — restore saved state
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail") === "connected") {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        try {
          const saved = JSON.parse(raw) as RestoredState;
          setRestored({ ...saved, initialConnected: [...(saved.initialConnected ?? []), "gmail"] });
          sessionStorage.removeItem(SESSION_KEY);
        } catch { /* ignore parse errors */ }
      }
      // Strip the query param without a full navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("gmail");
      window.history.replaceState({}, "", url.toString());
    }

    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (!user) return;

      setUserId(user.id);

      supabase
        .from("users")
        .select("onboarding_complete")
        .eq("id", user.id)
        .single()
        .then(({ data: row }) => {
          if (!row?.onboarding_complete) setShow(true);
        });
    });

    const handleTriggerTour = () => {
      setShow(true);
    };
    window.addEventListener("trigger-onboarding-tour", handleTriggerTour);

    return () => {
      window.removeEventListener("trigger-onboarding-tour", handleTriggerTour);
    };
  }, []);

  async function handleComplete(result: OnboardingResult) {
    if (!userId) return;

    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...result }),
      });
    } catch {
      // non-blocking — user still proceeds
    } finally {
      setShow(false);
      router.push(`/chat?buddy=${result.buddyId}`);
    }
  }

  async function handleClose() {
    if (!userId) { setShow(false); return; }
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, buddyId: "buffett" }),
      });
    } catch {
      // non-blocking
    } finally {
      setShow(false);
    }
  }

  if (!show) return null;
  return (
    <OnboardingModal
      onComplete={handleComplete}
      onClose={handleClose}
      restored={restored}
    />
  );
}
