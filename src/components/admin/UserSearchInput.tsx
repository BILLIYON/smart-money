"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useRef } from "react";

export function UserSearchInput() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (timer.current) clearTimeout(timer.current);
    const value = e.target.value;
    timer.current = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) {
        next.set("q", value);
      } else {
        next.delete("q");
      }
      next.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`);
      });
    }, 300);
  }

  return (
    <input
      type="search"
      defaultValue={params.get("q") ?? ""}
      onChange={handleChange}
      placeholder="Search by email…"
      style={{
        height: 38,
        padding: "0 14px",
        border: "1px solid #E2E7F0",
        borderRadius: 10,
        fontSize: 13,
        color: "#0B1E3D",
        background: "#ffffff",
        outline: "none",
        width: 260,
      }}
    />
  );
}
