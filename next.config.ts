import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Αγνοεί ESLint warnings στο Vercel build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Αγνοεί TypeScript errors στο Vercel build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
