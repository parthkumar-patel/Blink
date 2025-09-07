import type { NextConfig } from "next";

function getConvexHostname() {
  const fromEnv = process.env.NEXT_PUBLIC_CONVEX_SITE;
  if (!fromEnv || fromEnv.trim().length === 0) return "affable-robin-519.convex.cloud";
  try {
    // Support values like "https://foo.convex.cloud" or just "foo.convex.cloud"
    if (fromEnv.startsWith("http")) {
      return new URL(fromEnv).hostname;
    }
    return fromEnv;
  } catch {
    return "affable-robin-519.convex.cloud";
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: getConvexHostname(),
        pathname: "/api/storage/**",
      },
    ],
  },
};

export default nextConfig;
