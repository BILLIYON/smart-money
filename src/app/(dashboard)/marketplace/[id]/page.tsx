import { getBuddy, ALL_BUDDIES } from "@/lib/buddies";
import { BuddyProfile } from "@/components/buddy/BuddyProfile";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return ALL_BUDDIES.map((b) => ({ id: b.id }));
}

export default async function BuddyProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const buddy = getBuddy(id);
  if (!buddy) notFound();
  return <BuddyProfile buddy={buddy} />;
}
