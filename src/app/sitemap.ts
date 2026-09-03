import { MetadataRoute } from "next";
import { Pool } from "pg";

const BASE_URL = "https://smartmoney.technology";

function getPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/marketplace`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/goals`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/databank`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  let buddyRoutes: MetadataRoute.Sitemap = [];

  try {
    const pool = getPool();
    const { rows } = await pool.query<{ id: string; created_at?: string }>(
      "SELECT id, created_at FROM buddies WHERE status = 'live' OR status IS NULL ORDER BY created_at DESC;"
    );
    await pool.end();

    buddyRoutes = rows.map((b) => ({
      url: `${BASE_URL}/marketplace/${b.id}`,
      lastModified: b.created_at ? new Date(b.created_at) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch (err) {
    console.error("[sitemap.ts] Error querying dynamic marketplace buddies:", err);
  }

  return [...staticRoutes, ...buddyRoutes];
}
