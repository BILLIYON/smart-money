import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin Console · Smart Money" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/");
  }

  return (
    <div
      className="flex h-screen w-screen overflow-hidden transition-colors duration-200"
      style={{
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--font-sora), Inter, sans-serif",
      }}
    >
      <AdminSidebar />

      <main
        className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 transition-colors duration-200"
        style={{
          background: "var(--bg)",
        }}
      >
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
