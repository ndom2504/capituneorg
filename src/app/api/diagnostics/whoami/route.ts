import { NextRequest, NextResponse } from "next/server";

import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const [viewer, flags] = await Promise.all([
    getAppViewer().catch(() => null),
    getFeatureFlagsFromDb().catch(() => null),
  ]);

  return NextResponse.json({
    ok: true,
    host: req.headers.get("host"),
    viewer: viewer
      ? {
          id: viewer.id,
          email: viewer.email,
          accountType: viewer.accountType,
          adminRole: viewer.adminRole,
          accountStatus: viewer.accountStatus,
          isCertified: viewer.isCertified,
          hasMarketplaceProfile: !!viewer.professionalProfile,
        }
      : null,
    flags,
    vercel: {
      env: process.env.VERCEL_ENV ?? null,
      url: process.env.VERCEL_URL ?? null,
      gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    },
    cookieDomain: process.env.CAPITUNE_COOKIE_DOMAIN ?? null,
  });
}
