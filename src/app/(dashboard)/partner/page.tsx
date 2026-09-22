"use client";

import { useState } from "react";
import { PartnerSidebar, type PartnerTab } from "@/components/partner/PartnerSidebar";
import { OverviewPanel } from "@/components/partner/panels/OverviewPanel";
import { ClientsPanel } from "@/components/partner/panels/ClientsPanel";
import { ApprovalsPanel } from "@/components/partner/panels/ApprovalsPanel";
import { FeatureControlPanel } from "@/components/partner/panels/FeatureControlPanel";
import { BuddiesPanel } from "@/components/partner/panels/BuddiesPanel";
import { StaffPanel } from "@/components/partner/panels/StaffPanel";
import { OnboardingPanel } from "@/components/partner/panels/OnboardingPanel";
import { AnalyticsRulesPanel } from "@/components/partner/panels/AnalyticsRulesPanel";
import { DatabasePanel } from "@/components/partner/panels/DatabasePanel";
import { ResearchPanel } from "@/components/partner/panels/ResearchPanel";
import { GoalsPanel } from "@/components/partner/panels/GoalsPanel";
import { PartnerOpportunitiesPanel } from "@/components/partner/panels/OpportunitiesPanel";
import { ApiPanel } from "@/components/partner/panels/ApiPanel";

export default function PartnerPage() {
  const [tab, setTab] = useState<PartnerTab>("overview");

  return (
    <div className="flex h-full overflow-hidden">
      <PartnerSidebar active={tab} onChange={setTab} />
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 w-full">
        {tab === "overview" && <OverviewPanel onNavigate={setTab} />}
        {tab === "clients" && <ClientsPanel />}
        {tab === "approvals" && <ApprovalsPanel />}
        {tab === "features" && <FeatureControlPanel />}
        {tab === "buddies" && <BuddiesPanel />}
        {tab === "staff" && <StaffPanel />}
        {tab === "onboarding" && <OnboardingPanel />}
        {tab === "analytics-cfg" && <AnalyticsRulesPanel />}
        {tab === "database" && <DatabasePanel />}
        {tab === "research" && <ResearchPanel />}
        {tab === "goals-cfg" && <GoalsPanel />}
        {tab === "opportunities-cfg" && <PartnerOpportunitiesPanel />}
        {tab === "api" && <ApiPanel />}
      </div>
    </div>
  );
}
