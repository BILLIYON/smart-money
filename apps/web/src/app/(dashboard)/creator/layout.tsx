import type { Metadata } from "next";
export const metadata: Metadata = { title: "Creator Dashboard · Smart Money" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
