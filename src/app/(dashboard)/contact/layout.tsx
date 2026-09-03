import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact & Support",
  description:
    "Get in touch with the Smart Money support team, submit feedback, or request custom AI Buddy features.",
  alternates: {
    canonical: "https://smartmoney.technology/contact",
  },
  openGraph: {
    title: "Contact & Support — Smart Money",
    description:
      "Get in touch with the Smart Money support team, submit feedback, or request custom AI Buddy features.",
    url: "https://smartmoney.technology/contact",
    type: "website",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
