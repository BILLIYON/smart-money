"use client";

import { useEffect, useState } from "react";

export function useDataSources(): { chips: string[]; noData: boolean } {
  const [chips, setChips] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/databank/sources-summary")
      .then((r) => r.json())
      .then((d: { chips: string[] }) => setChips(d.chips ?? []))
      .catch(() => {});
  }, []);

  const noData = chips.length === 1 && chips[0].startsWith("⚠️");
  return { chips, noData };
}
