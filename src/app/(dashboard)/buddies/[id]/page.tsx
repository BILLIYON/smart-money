import { getBuddy, ALL_BUDDIES, type Buddy, type BuddyCategory } from "@/lib/buddies";
import { BuddyProfile } from "@/components/buddy/BuddyProfile";
import { notFound } from "next/navigation";
import { getCommunityBuddyById } from "@/lib/db";

export function generateStaticParams() {
  return ALL_BUDDIES.map((b) => ({ id: b.id }));
}

const MODEL_COLOR: Record<string, string> = {
  Claude: "#7B68EE",
  "GPT-4": "#10A37F",
  Gemini: "#4285F4",
};

export default async function BuddyProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let buddy = getBuddy(id);

  if (!buddy) {
    const dbRow = await getCommunityBuddyById(id);
    if (!dbRow) notFound();

    const price =
      dbRow.price === "free" ? "Free"
      : dbRow.price === "custom" && dbRow.custom_price ? `$${dbRow.custom_price}/mo`
      : "$5/mo";
    const badgeType: "free" | "pro" = dbRow.price === "free" ? "free" : "pro";
    const model = (dbRow.model ?? "Claude") as Buddy["model"];

    buddy = {
      id: dbRow.id,
      name: dbRow.name,
      tag: dbRow.tag ?? "",
      desc: dbRow.description ?? "",
      price,
      priceNote: dbRow.price_note ?? "",
      badge: price,
      badgeType,
      bannerColor: dbRow.banner_color ?? "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
      avatarBg: dbRow.avatar_bg ?? "#1A3A6E",
      avatarContent: dbRow.avatar_content ?? "🎯",
      avatarIsSerif: dbRow.avatar_is_serif ?? false,
      model,
      modelColor: MODEL_COLOR[model] ?? "#7B68EE",
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
  }

  return <BuddyProfile buddy={buddy} />;
}
