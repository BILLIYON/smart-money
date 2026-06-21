"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";

// React 19 / Next.js 16 compatibility: Suppress the false-positive next-themes inline <script> warning in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag while rendering React component")
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="light"
      disableTransitionOnChange={false}
    >
      {children}
      <Toaster position="top-center" reverseOrder={false} />
    </ThemeProvider>
  );
}
