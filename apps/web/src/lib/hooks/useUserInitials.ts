"use client";

import { useEffect, useState } from "react";

export function useUserInitials(): string {
  const [initials, setInitials] = useState("?");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const user = data?.user;
        if (!user) return;
        const name = user.full_name;
        if (name) {
          const parts = name.trim().split(/\s+/);
          const i =
            parts.length >= 2
              ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
              : parts[0].slice(0, 2).toUpperCase();
          setInitials(i);
        } else if (user.email) {
          const prefix = user.email.split("@")[0];
          setInitials(prefix.slice(0, 2).toUpperCase());
        }
      })
      .catch(() => {});
  }, []);

  return initials;
}
