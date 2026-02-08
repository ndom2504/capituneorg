import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // In this monorepo, Next.js can infer the workspace root incorrectly and try
  // to resolve PostCSS/Tailwind deps from the repo root. Pin tracing root here.
  // (Keep as `any` in case the TS type lags behind the runtime option.)
  ...( { outputFileTracingRoot: configDir } as any ),
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
