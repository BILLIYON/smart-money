import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  assetPrefix: "/_admin_assets",
  serverExternalPackages: ["pg", "pdf-parse"],
  compress: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toggle",
      "date-fns",
    ],
  },
};

export default nextConfig;
