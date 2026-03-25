import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [50, 75],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    minimumCacheTTL: 2678400,
  },
};

export default nextConfig;
