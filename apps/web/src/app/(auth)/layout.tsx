import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Access & Registration",
  description:
    "Log in or register your Smart Money account to start managing your personal finances with 24/7 AI Buddies.",
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Minimal layout for auth pages — no sidebar/topbar.
 * The root layout (fonts, ThemeProvider) still wraps this.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

