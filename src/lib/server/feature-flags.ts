import { prisma } from "@/lib/db";
import { parseFeatureFlags, type FeatureFlagsSetting } from "@/lib/feature-flags";

export async function getFeatureFlagsFromDb(): Promise<FeatureFlagsSetting> {
  const row = await prisma.platformSetting.findUnique({
    where: { key: "featureFlags" },
    select: { value: true },
  });

  return parseFeatureFlags(row?.value);
}
