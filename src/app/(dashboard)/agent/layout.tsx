import type { Metadata } from "next";
export const metadata: Metadata = { title: "Agentic Actions · Smart Money" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
