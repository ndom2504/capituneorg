import Link from "next/link";

import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";

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

export default async function MaintenancePage() {
  const row = await prisma.platformSetting.findUnique({
    where: { key: "maintenance" },
    select: { value: true },
  });

  const maintenance = parseMaintenance(row?.value);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Card className="p-6">
        <h1 className="text-2xl font-semibold text-navy">Maintenance</h1>
        <div className="mt-2 text-sm text-muted">
          La plateforme est temporairement indisponible.
        </div>

        {maintenance.message ? (
          <div className="mt-4 rounded-(--radius-md) border border-border bg-white/60 p-3 text-sm text-text">
            {maintenance.message}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/auth" className="rounded-md border px-3 py-2 text-sm">
            Se connecter
          </Link>
          <Link href="/admin" className="rounded-md bg-navy px-3 py-2 text-sm text-white">
            Admin
          </Link>
        </div>

        {!maintenance.enabled ? (
          <div className="mt-4 text-xs text-muted">
            (Info) Le mode maintenance est désactivé côté settings.
          </div>
        ) : null}
      </Card>
    </div>
  );
}
