"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { OnboardingModal, type OnboardingResult } from "./OnboardingModal";

/**
 * Drop this into the dashboard layout.
 * It checks if the current user has completed onboarding, and if not,
 * renders the OnboardingModal on top of everything.
 */
export function OnboardingGate() {
  const [show, setShow] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (!user) return; // not logged in — auth layer handles redirect

      setUserId(user.id);

      // Check onboarding_complete in the users table
      supabase
        .from("users")
        .select("onboarding_complete")
        .eq("id", user.id)
        .single()
        .then(({ data: row }) => {
          if (!row?.onboarding_complete) setShow(true);
        });
    });
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
    }
  }

  if (!show) return null;
  return <OnboardingModal onComplete={handleComplete} />;
}
