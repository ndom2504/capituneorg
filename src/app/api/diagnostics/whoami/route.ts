import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const h = await headers();
  const host = h.get("host");

  const [viewer, flags] = await Promise.all([
    getAppViewer().catch(() => null),
    getFeatureFlagsFromDb().catch(() => null),
  ]);

  return NextResponse.json({
    ok: true,
    host,
    viewer: viewer
      ? {
          id: viewer.id,
          email: viewer.email,
          accountType: viewer.accountType,
          adminRole: viewer.adminRole,
          accountStatus: viewer.accountStatus,
          isCertified: viewer.isCertified,
        }
      : null,
    flags,
    vercel: {
      env: process.env.VERCEL_ENV ?? null,
      url: process.env.VERCEL_URL ?? null,
      gitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    },
  });
}
