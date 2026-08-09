import { getBuddy, ALL_BUDDIES, type Buddy, type BuddyCategory } from "@/lib/buddies";
import { BuddyProfile } from "@/components/buddy/BuddyProfile";
import { notFound } from "next/navigation";
import { getCommunityBuddyById } from "@/lib/db";

// Pre-render pages for hardcoded buddies at build time;
// dynamicParams = true lets DB buddies be rendered on-demand (SSR)
export function generateStaticParams() {
  return ALL_BUDDIES.map((b) => ({ id: b.id }));
}
export const dynamicParams = true;

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
