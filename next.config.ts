import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Contracts live in ./packages/api-contracts so the project root stays self-contained.
  transpilePackages: ["@cheaperfly/api-contracts"],
  images: {
    // Cover photos are served from /public/images; 75 is the only quality the original used.
    qualities: [75],
  },
};

export default nextConfig;
