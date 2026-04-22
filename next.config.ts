import type { NextConfig } from "next";
import { getAllowedListingImageHosts } from "./lib/listing-image-hosts";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "64mb",
      allowedOrigins: [
        "exkitchens.com",
        "www.exkitchens.com",
        "*.vercel.app",
      ],
    },
  },
  turbopack: {
    root: process.cwd(),
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [50, 75],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    minimumCacheTTL: 2678400,
    remotePatterns: getAllowedListingImageHosts(),
  },
};

export default nextConfig;
