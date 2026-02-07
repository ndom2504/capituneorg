import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MaintenanceSetting = {
  enabled: boolean;
  message: string;
};

const DEFAULT_MAINTENANCE: MaintenanceSetting = { enabled: false, message: "" };

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

export async function GET() {
  const [row, viewer] = await Promise.all([
    prisma.platformSetting.findUnique({
      where: { key: "maintenance" },
      select: { value: true, updatedAt: true },
    }),
    getAppViewer(),
  ]);

  const maintenance = parseMaintenance(row?.value);

  const allowBypass =
    viewer?.accountType === "ADMIN" && viewer.accountStatus === "ACTIVE";

  return NextResponse.json({
    maintenance,
    allowBypass,
    updatedAt: row?.updatedAt?.toISOString() ?? null,
  });
}
