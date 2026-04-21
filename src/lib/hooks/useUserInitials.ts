"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useUserInitials(): string {
  const [initials, setInitials] = useState("?");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      const name = data.user.user_metadata?.full_name as string | undefined;
      if (name) {
        const parts = name.trim().split(/\s+/);
        const i =
          parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
        setInitials(i);
      } else {
        const prefix = (data.user.email ?? "").split("@")[0];
        setInitials(prefix.slice(0, 2).toUpperCase());
      }
    });
  }, []);

  return initials;
}
