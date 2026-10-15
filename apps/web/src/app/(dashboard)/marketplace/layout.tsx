import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Financial Buddy Marketplace — Discover Autonomous Wealth Advisors",
  description:
    "Explore and connect with specialized 24/7 AI Financial Advisors on Smart Money. From Move-E to Crypto, Budgeting, and Tax Strategy Advisors.",
  keywords: [
    "AI Buddy Marketplace",
    "AI Financial Advisors",
    "Smart Money Marketplace",
    "Move-E AI",
    "Crypto Advisor AI",
    "Budget Buddy",
  ],
  alternates: {
    canonical: "https://smartmoney.technology/marketplace",
  },
  openGraph: {
    title: "AI Financial Buddy Marketplace — Smart Money",
    description:
      "Explore and connect with specialized 24/7 AI Financial Advisors on Smart Money. From Move-E to Crypto, Budgeting, and Tax Strategy Advisors.",
    url: "https://smartmoney.technology/marketplace",
    type: "website",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

