import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata: Metadata = { title: "Admin · Smart Money" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <AdminSidebar />

      <main
        style={{
          flex: 1,
          overflowY: "auto",
          background: "#F4F6FB",
          padding: 32,
        }}
      >
        {children}
      </main>
    </div>
  );
}
