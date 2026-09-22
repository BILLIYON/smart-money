import type { Metadata } from "next";
export const metadata: Metadata = { title: "Partner Portal · Smart Money" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
