import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PARTNER_FIRMS, PARTNER_FIRM_DETAILS, type PartnerFirm } from "@/components/partner/mockData";
import { PartnerProfile } from "@/components/partner/PartnerProfile";
import { Pool } from "pg";

export const dynamicParams = true;

function getPool() {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money";
  const isRemote = connectionString.includes("supabase.com") || connectionString.includes("pooler") || connectionString.includes("aws-");
  return new Pool({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
  });
}

async function getFirmData(id: string) {
  // 1. Try querying Postgres first
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT 
        id, slug, name, type, icon, icon_bg AS "iconBg", banner_style AS "banner",
        description AS "desc", tags, rating, client_count_text AS "clients",
        min_portfolio_text AS "minPortfolio", full_description AS "fullDescription",
        includes, reviews
       FROM public.partner_orgs
       WHERE slug = $1 OR id::text = $1
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
        includes: Array.isArray(row.includes) && row.includes.length > 0 ? row.includes : ["Institutional wealth advisory", "Direct dedicated advisor access"],
        reviews: Array.isArray(row.reviews) && row.reviews.length > 0 ? row.reviews : [{ name: "Verified Client", stars: "★★★★★", text: "Outstanding partnership and execution." }],
      };
    }
  } catch (err) {
    console.error("[getFirmData DB Query Error]", err);
  }

  // 2. Fallback to mock data if not in DB
  const mockFirm = PARTNER_FIRMS.find((f) => f.id === id);
  const mockDetails = PARTNER_FIRM_DETAILS[id];
  if (mockFirm && mockDetails) {
    return {
      firm: mockFirm,
      fullDescription: mockDetails.fullDescription,
      includes: mockDetails.includes,
      reviews: mockDetails.reviews,
    };
  }

  return null;
}

export async function generateStaticParams() {
  return PARTNER_FIRMS.map((f) => ({ id: f.id }));
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
