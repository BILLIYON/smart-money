import { AdminAnalyticsDashboard } from "@/components/admin/AdminAnalyticsDashboard";

export const metadata = {
  title: "Google Analytics Telemetry · Admin · Smart Money",
};

export const dynamic = "force-dynamic";

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsDashboard />;
}
