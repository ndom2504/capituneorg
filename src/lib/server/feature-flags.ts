import { prisma } from "@/lib/db";
import { parseFeatureFlags, type FeatureFlagsSetting } from "@/lib/feature-flags";

const CACHE_TTL_MS = 15_000;

let cached: { value: FeatureFlagsSetting; fetchedAt: number } | null = null;
let inFlight: Promise<FeatureFlagsSetting> | null = null;

export async function getFeatureFlagsFromDb(): Promise<FeatureFlagsSetting> {
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) return cached.value;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const row = await prisma.platformSetting.findUnique({
      where: { key: "featureFlags" },
      select: { value: true },
    });

    const value = parseFeatureFlags(row?.value);
    cached = { value, fetchedAt: Date.now() };
    return value;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
