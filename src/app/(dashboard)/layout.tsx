import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { BottomNav } from "@/components/BottomNav";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";
import { PageTransition } from "@/components/PageTransition";
import { MilestoneToast } from "@/components/ui/MilestoneToast";
import { SalaryMomentOverlay } from "@/components/ui/SalaryMomentOverlay";
import { CompareBuddiesModal } from "@/components/buddy/CompareBuddiesModal";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let fullName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", user.id)
      .single();
    fullName = profile?.full_name ?? null;
  }

  const sidebarUser = user
    ? { email: user.email ?? "", fullName }
    : undefined;

  return (
    <RealtimeProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar — hidden on mobile, visible md+ */}
        <Sidebar user={sidebarUser} />

        {/* Main column */}
        <div className="flex flex-col flex-1 min-w-0">
          <Topbar />

          {/* Scrollable content area — pb-[60px] on mobile reserves space for bottom nav */}
          <main className="flex-1 overflow-y-auto pb-[60px] md:pb-0">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>

        {/* Mobile bottom nav */}
        <BottomNav />

        {/* Onboarding modal — renders on top of everything when needed */}
        <OnboardingGate />

        {/* Global milestone celebration toast */}
        <MilestoneToast />

        {/* Salary moment full-screen overlay */}
        <SalaryMomentOverlay />

        {/* Compare buddies modal */}
        <CompareBuddiesModal />
      </div>
    </RealtimeProvider>
  );
}
