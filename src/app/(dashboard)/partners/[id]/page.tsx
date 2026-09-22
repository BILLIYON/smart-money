import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PARTNER_FIRMS, PARTNER_FIRM_DETAILS } from "@/components/partner/mockData";
import { PartnerProfile } from "@/components/partner/PartnerProfile";

export async function generateStaticParams() {
  return PARTNER_FIRMS.map((f) => ({ id: f.id }));
}
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const firm = PARTNER_FIRMS.find((f) => f.id === id);
  if (!firm) return { title: "Partner Firm · Smart Money" };
  return {
    title: `${firm.name} — Smart Money Partner`,
    description: firm.desc,
  };
}

export default async function PartnerFirmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const firm = PARTNER_FIRMS.find((f) => f.id === id);
  const details = PARTNER_FIRM_DETAILS[id];
  if (!firm || !details) notFound();

  return (
    <PartnerProfile
      firm={firm}
      fullDescription={details.fullDescription}
      includes={details.includes}
      reviews={details.reviews}
    />
  );
}
