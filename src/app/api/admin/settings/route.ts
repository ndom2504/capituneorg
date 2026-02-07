import { NextResponse } from "next/server";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

import { requireAdminActionViewer, requireAdminViewer } from "../_auth";

type MaintenanceSetting = {
  enabled: boolean;
  message: string;
};

type FeatureFlagsSetting = {
  community: boolean;
  events: boolean;
  jobs: boolean;
  marketplace: boolean;
  messaging: boolean;
  notifications: boolean;
  presence: boolean;
  proNetwork: boolean;
};

const DEFAULT_MAINTENANCE: MaintenanceSetting = {
  enabled: false,
  message: "",
};

const DEFAULT_FLAGS: FeatureFlagsSetting = {
  community: true,
  events: true,
  jobs: true,
  marketplace: true,
  messaging: true,
  notifications: true,
  presence: true,
  proNetwork: true,
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseMaintenance(value: unknown): MaintenanceSetting {
  const obj = asObject(value);
  if (!obj) return DEFAULT_MAINTENANCE;

  return {
    enabled: obj.enabled === true,
    message: typeof obj.message === "string" ? obj.message : "",
  };
}

function parseFlags(value: unknown): FeatureFlagsSetting {
  const obj = asObject(value);
  if (!obj) return DEFAULT_FLAGS;

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

export async function GET() {
  const auth = await requireAdminViewer();
  if (!auth.ok) return auth.response;

  const canAct = auth.viewer.adminRole === "ADMIN";

  const rows = await prisma.platformSetting.findMany({
    where: { key: { in: ["maintenance", "featureFlags"] } },
    select: { key: true, value: true, updatedAt: true },
  });

  const map = new Map(rows.map((r) => [r.key, r]));

  const maintenance = parseMaintenance(map.get("maintenance")?.value);
  const featureFlags = parseFlags(map.get("featureFlags")?.value);

  return NextResponse.json({
    canAct,
    viewerRole: auth.viewer.adminRole,
    maintenance,
    featureFlags,
  });
}

type UpdateBody = {
  maintenance?: Partial<MaintenanceSetting>;
  featureFlags?: Partial<FeatureFlagsSetting>;
};

export async function POST(req: Request) {
  const auth = await requireAdminActionViewer();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as UpdateBody | null;
  if (!body) {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const updates: Array<{ key: "maintenance" | "featureFlags"; value: unknown }> = [];

  if (body.maintenance) {
    const enabled = body.maintenance.enabled === true;
    const message = typeof body.maintenance.message === "string" ? body.maintenance.message : "";
    updates.push({ key: "maintenance", value: { enabled, message } });
  }

  if (body.featureFlags) {
    const merged: FeatureFlagsSetting = {
      ...DEFAULT_FLAGS,
      ...Object.fromEntries(
        Object.entries(body.featureFlags).map(([k, v]) => [k, v !== false]),
      ),
    } as FeatureFlagsSetting;

    updates.push({ key: "featureFlags", value: merged });
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Aucun changement." }, { status: 400 });
  }

  const existing = await prisma.platformSetting.findMany({
    where: { key: { in: updates.map((u) => u.key) } },
    select: { key: true, value: true },
  });
  const beforeMap = new Map(existing.map((r) => [r.key, r.value]));

  await prisma.$transaction(async (tx) => {
    for (const u of updates) {
      const beforeValue = beforeMap.get(u.key);

      const nextValue = u.value as Prisma.InputJsonValue;

      await tx.platformSetting.upsert({
        where: { key: u.key },
        create: {
          key: u.key,
          value: nextValue,
          updatedByAdminId: auth.viewer.id,
        },
        update: {
          value: nextValue,
          updatedByAdminId: auth.viewer.id,
        },
        select: { key: true },
      });

      await tx.auditLog.create({
        data: {
          adminId: auth.viewer.id,
          action: "UPDATE_PLATFORM_SETTING",
          objectType: "PlatformSetting",
          objectId: u.key,
          ...(beforeValue != null ? { beforeJson: beforeValue as Prisma.InputJsonValue } : {}),
          afterJson: nextValue,
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
