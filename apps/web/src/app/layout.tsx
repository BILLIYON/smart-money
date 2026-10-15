import type { Metadata, Viewport } from "next";
import { Sora, DM_Serif_Display } from "next/font/google";
import Script from "next/script";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  weight: "400",
  subsets: ["latin"],
});

const BASE_URL = "https://smartmoney.technology";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Smart Money — AI Financial Superpower & Wealth Advisor Marketplace",
    template: "%s | Smart Money",
  },
  description:
    "Smart Money connects you with 24/7 autonomous AI Financial Buddies to automate expense tracking, parse bank alerts, set financial goals, and build lasting wealth.",
  keywords: [
    "Smart Money",
    "Smart Money AI",
    "smartmoney.technology",
    "Move-E AI",
    "Smart Money Marketplace",
    "AI Financial Advisor",
    "AI Money Manager",
    "Personal Finance AI",
    "AI Expense Tracker",
    "Bank Alert Parser AI",
    "Automated Financial Statement Analyzer",
    "AI Wealth Management App",
    "AI Budgeting Assistant",
    "Smart Wealth Building",
    "AI Investment Buddy",
    "Crypto Financial Advisor AI",
    "Tax Strategy AI Buddy",
    "How to track expenses automatically with AI",
    "Best AI app for personal finance",
    "Parse bank SMS alerts with AI",
    "Set financial goals with AI assistant",
    "Emergency fund calculator AI",
    "Personal Finance App Nigeria",
    "Lagos AI Wealth Manager",
    "Smart Money Tech",
  ],
  authors: [{ name: "Smart Money Technologies", url: BASE_URL }],
  creator: "Smart Money Technologies",
  publisher: "Smart Money Technologies",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: BASE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Smart Money",
    title: "Smart Money — AI Financial Superpower & Wealth Advisor Marketplace",
    description:
      "Automate your personal finances with specialized 24/7 AI Buddies. Parse bank alerts, track expenses, hit financial goals, and build wealth effortless.",
    images: [
      {
        url: `${BASE_URL}/icon-512.png`,
        width: 512,
        height: 512,
        alt: "Smart Money AI Finance Superpower Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Smart Money — AI Financial Superpower",
    description:
      "Automate your personal finances with specialized 24/7 AI Buddies. Parse bank alerts, track expenses, hit financial goals, and build wealth.",
    images: [`${BASE_URL}/icon-512.png`],
    creator: "@smartmoneytech",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Smart Money",
  },
  formatDetection: { telephone: false },
  icons: {
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#00C48C",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

const jsonLdData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      "name": "Smart Money",
      "url": BASE_URL,
      "logo": `${BASE_URL}/icon-192.png`,
      "sameAs": ["https://twitter.com/smartmoneytech"],
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "support@smartmoney.technology",
        "contactType": "customer service",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      "url": BASE_URL,
      "name": "Smart Money",
      "description": "AI-Powered Personal Finance & Wealth Management Platform",
      "publisher": {
        "@id": `${BASE_URL}/#organization`,
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${BASE_URL}/marketplace?search={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "name": "Smart Money",
      "operatingSystem": "All",
      "applicationCategory": "FinanceApplication",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "1280",
        "bestRating": "5",
        "worstRating": "1",
      },
      "description":
        "Smart Money connects you with 24/7 AI Financial Buddies to automate expense tracking, analyze bank alert signals, set goals, and build wealth.",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sora.variable} ${dmSerifDisplay.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }}
        />
        {/* Google tag (gtag.js) */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-WDF3C4478E"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-WDF3C4478E');
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
