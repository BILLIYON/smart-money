import { MetadataRoute } from "next";

const BASE_URL = "https://smartmoney.technology";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/marketplace",
          "/marketplace/*",
          "/buddies/*",
          "/login",
          "/register",
          "/contact",
          "/goals",
          "/databank",
        ],
        disallow: [
          "/admin/",
          "/admin/*",
          "/api/",
          "/api/*",
          "/databank/print",
          "/studio",
          "/settings",
          "/agent",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
