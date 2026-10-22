import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { PartnerFirm, PartnerReview } from "@/types/partner";
import { PartnerProfile } from "@/components/partner/PartnerProfile";
import { partnerServiceClient } from "@/lib/partner-service-client";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

function getPool() {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money";
  const isRemote = connectionString.includes("supabase.com") || connectionString.includes("pooler") || connectionString.includes("aws-");
  return new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
  });
}

async function getFirmData(id: string) {
  // 1. Try microservice first
  try {
    const data: any = await partnerServiceClient.getFirmDetails(id);
    const firmData = data?.firm || data?.partner;
    if (firmData) {
      const firm: PartnerFirm = {
        id: firmData.slug || firmData.id,
        name: firmData.name,
        type: firmData.type,
        icon: firmData.icon || "🏛️",
        banner: firmData.banner || firmData.banner_style || "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
        iconBg: firmData.iconBg || firmData.icon_bg || "#0B1E3D",
        desc: firmData.desc || firmData.description || "",
        tags: Array.isArray(firmData.tags) ? firmData.tags : [],
        rating: firmData.rating || "4.8★",
        clients: firmData.clients || firmData.client_count_text || "1,000+",
        minPortfolio: firmData.minPortfolio || firmData.min_portfolio_text || "₦0",
      };
      return {
        firm,
        fullDescription: firmData.fullDescription || firmData.full_description || firmData.desc || firmData.description || "",
        includes: Array.isArray(firmData.includes) && firmData.includes.length > 0 
          ? firmData.includes 
          : ["Institutional wealth advisory", "Direct dedicated advisor access", "Quarterly portfolio rebalancing"],
        reviews: (Array.isArray(firmData.reviews) && firmData.reviews.length > 0
          ? firmData.reviews
          : [{ name: "Verified Client", stars: "★★★★★", text: "Exceptional advisory quality and seamless integration." }]) as PartnerReview[],
      };
    }
  } catch (serviceErr) {
    // Fall back to direct database query
  }

  // 2. Direct PostgreSQL query
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT 
        id, slug, name, type, icon, icon_bg AS "iconBg", banner_style AS "banner",
        description AS "desc", tags, rating, client_count_text AS "clients",
        min_portfolio_text AS "minPortfolio", full_description AS "fullDescription",
        includes, reviews
       FROM public.partner_orgs
       WHERE (slug = $1 OR id::text = $1) AND is_public = true
       LIMIT 1;`,
      [id]
    );
    await pool.end();

    if (rows[0]) {
      const row = rows[0];
      const firm: PartnerFirm = {
        id: row.slug || row.id,
        name: row.name,
        type: row.type,
        icon: row.icon || "🏛️",
        banner: row.banner || "linear-gradient(135deg,#0B1E3D,#1A3A6E)",
        iconBg: row.iconBg || "#0B1E3D",
        desc: row.desc || "",
        tags: Array.isArray(row.tags) ? row.tags : [],
        rating: row.rating || "4.8★",
        clients: row.clients || "1,000+",
        minPortfolio: row.minPortfolio || "₦0",
      };
      return {
        firm,
        fullDescription: row.fullDescription || row.desc || "",
        includes: Array.isArray(row.includes) && row.includes.length > 0 
          ? row.includes 
          : ["Institutional wealth advisory", "Direct dedicated advisor access", "Quarterly portfolio rebalancing"],
        reviews: (Array.isArray(row.reviews) && row.reviews.length > 0 
          ? row.reviews 
          : [{ name: "Verified Client", stars: "★★★★★", text: "Exceptional advisory quality and seamless integration." }]) as PartnerReview[],
      };
    }
  } catch (err) {
    console.error("[getFirmData DB Query Error]", err);
  }

  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getFirmData(id);
  if (!data) return { title: "Partner Firm · Smart Money" };
  return {
    title: `${data.firm.name} — Smart Money Partner`,
    description: data.firm.desc,
  };
}

export default async function PartnerFirmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getFirmData(id);
  if (!data) notFound();

  return (
    <PartnerProfile
      firm={data.firm}
      fullDescription={data.fullDescription}
      includes={data.includes}
      reviews={data.reviews}
    />
  );
}
