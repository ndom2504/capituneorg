import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const coop = {
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin-allow-popups",
    };

    return [
      { source: "/auth", headers: [coop] },
      { source: "/auth/:path*", headers: [coop] },
    ];
  },
};

export default nextConfig;
