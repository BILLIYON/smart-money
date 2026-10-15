import { getBuddy, type Buddy, type BuddyCategory } from "@/lib/buddies";
import { BuddyProfile } from "@/components/buddy/BuddyProfile";
import { notFound } from "next/navigation";
import { getApprovedCommunityBuddies, getCommunityBuddyById } from "@/lib/db";

import type { Metadata } from "next";

export async function generateStaticParams() {
  const buddies = await getApprovedCommunityBuddies();
  return buddies.map((b) => ({ id: b.id }));
}
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  let buddyName = "AI Buddy";
  let buddyDesc = "Specialized AI Financial Advisor on Smart Money";

  const dbRow = await getCommunityBuddyById(id);
  if (dbRow) {
    buddyName = dbRow.name;
    buddyDesc = dbRow.description || dbRow.tag || buddyDesc;
  } else {
    const b = getBuddy(id);
    if (b) {
      buddyName = b.name;
      buddyDesc = b.desc || b.tag || buddyDesc;
    }
  }

  const url = `https://smartmoney.technology/marketplace/${id}`;

  return {
    title: `${buddyName} — AI Financial Advisor`,
    description: buddyDesc,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${buddyName} — Smart Money AI Buddy`,
      description: buddyDesc,
      url,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `${buddyName} — Smart Money AI Buddy`,
      description: buddyDesc,
    },
  };
}


const MODEL_COLOR: Record<string, string> = {
  Claude: "#7B68EE",
  "GPT-4": "#10A37F",
  Gemini: "#4285F4",
  Groq: "#F55036",
};

export default async function BuddyProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let buddy: Buddy | undefined;

  const dbRow = await getCommunityBuddyById(id);
  if (dbRow) {
    const rawModel = (dbRow.model ?? "").toLowerCase();
    const modelName: Buddy["model"] =
      rawModel.includes("groq") || rawModel.includes("llama") ? "Groq" :
      rawModel.includes("gpt") ? "GPT-4" :
      rawModel.includes("gemini") ? "Gemini" :
      "Claude";

    const priceMonthly = dbRow.price === "free" ? 0 : Number(dbRow.custom_price ?? 0);
    const priceDisplay = priceMonthly > 0 ? `₦${priceMonthly.toLocaleString()}/mo` : "Free";
    const badgeType: "free" | "pro" = priceMonthly > 0 ? "pro" : "free";

    buddy = {
      id: dbRow.id,
      name: dbRow.name,
      tag: dbRow.tag ?? "",
      desc: dbRow.description ?? "",
      price: priceDisplay,
      priceNote: dbRow.price_note ?? (priceMonthly > 0 ? "3-day free trial · Cancel anytime" : "Always free"),
      badge: priceDisplay,
      badgeType,
      bannerColor: dbRow.banner_color ?? "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
      avatarBg: dbRow.avatar_bg ?? "#1A3A6E",
      avatarContent: dbRow.avatar_content ?? "🎯",
      avatarIsSerif: dbRow.avatar_is_serif ?? false,
      model: modelName,
      modelColor: MODEL_COLOR[modelName] ?? "#7B68EE",
      rating: "New",
      reviewCount: "0",
      isFanSim: dbRow.is_fan_sim ?? false,
      disclaimer: dbRow.disclaimer ?? undefined,
      categories: (dbRow.categories ?? []) as BuddyCategory[],
      philosophy: dbRow.philosophy ?? "",
      samples: dbRow.samples ?? [],
      reviews: [],
      includes: dbRow.includes ?? [],
    };
  } else {
    buddy = getBuddy(id);
  }

  if (!buddy) notFound();

  return <BuddyProfile buddy={buddy} />;
}
