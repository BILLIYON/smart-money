import type { Metadata } from "next";
import { Sora, DM_Serif_Display } from "next/font/google";
import { Providers } from "@/components/providers";
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

export const metadata: Metadata = {
  title: "Smart Money — Admin Console",
  description: "Enterprise Operations & Platform Administration",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sora.variable} ${dmSerifDisplay.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

