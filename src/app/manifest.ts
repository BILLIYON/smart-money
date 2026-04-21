import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Smart Money",
    short_name: "SmartMoney",
    description: "AI-powered personal finance advisor",
    start_url: "/marketplace",
    display: "standalone",
    background_color: "#0B1E3D",
    theme_color: "#00C48C",
    orientation: "portrait-primary",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "My Buddies",
        url: "/chat",
        description: "Chat with your finance buddies",
      },
      {
        name: "DataBank",
        url: "/databank",
        description: "View your financial data",
      },
    ],
  };
}
