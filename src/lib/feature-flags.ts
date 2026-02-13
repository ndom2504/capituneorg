export type FeatureFlagsSetting = {
  community: boolean;
  events: boolean;
  jobs: boolean;
  marketplace: boolean;
  messaging: boolean;
  notifications: boolean;
  presence: boolean;
  proNetwork: boolean;
};

export const DEFAULT_FEATURE_FLAGS: FeatureFlagsSetting = {
  community: true,
  events: true,
  jobs: true,
  marketplace: false,
  messaging: true,
  notifications: true,
  presence: false,
  proNetwork: true,
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseFeatureFlags(value: unknown): FeatureFlagsSetting {
  const obj = asObject(value);
  if (!obj) return DEFAULT_FEATURE_FLAGS;

  const getBool = (k: keyof FeatureFlagsSetting) => obj[k] !== false;

  return {
    community: getBool("community"),
    events: getBool("events"),
    jobs: getBool("jobs"),
    marketplace: getBool("marketplace"),
    messaging: getBool("messaging"),
    notifications: getBool("notifications"),
    presence: getBool("presence"),
    proNetwork: getBool("proNetwork"),
  };
}
