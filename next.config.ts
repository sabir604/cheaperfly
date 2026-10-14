import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cover photos are served from /public/images; 75 is the only quality the original used.
    qualities: [75],
  },
};

export default nextConfig;
