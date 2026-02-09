import Link from "next/link";

import { AdminMarketplaceRequestsPanel } from "@/components/admin/marketplace/requests/admin-marketplace-requests-panel";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALL_STATUSES = ["LOCAL", "PREINSCRIPTION", "EN_COURS", "TERMINE"] as const;
type DossierStatus = (typeof ALL_STATUSES)[number];

function isDossierStatus(value: unknown): value is DossierStatus {
  return typeof value === "string" && (ALL_STATUSES as readonly string[]).includes(value);
}

function labelStatus(status: DossierStatus) {
  switch (status) {
    case "LOCAL":
      return "Local";
    case "PREINSCRIPTION":
      return "Préinscription";
    case "EN_COURS":
      return "En cours";
    case "TERMINE":
      return "Terminé";
  }
}

function withSearchParams(basePath: string, params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && value.trim()) sp.set(key, value);
  }
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default async function AdminCasesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const qRaw = typeof sp.q === "string" ? sp.q : "";
  const q = qRaw.trim().slice(0, 200);

  const statusRaw = typeof sp.status === "string" ? sp.status : "";
  const status = isDossierStatus(statusRaw) ? statusRaw : "";

  const dossierIdRaw = typeof sp.dossierId === "string" ? sp.dossierId : "";
  const dossierId = dossierIdRaw.trim();

  const where: Prisma.DossierWhereInput = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { id: { contains: q, mode: "insensitive" } },
      { program: { contains: q, mode: "insensitive" } },
      { user: { id: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { fullName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [items, selected] = await Promise.all([
    prisma.dossier.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        _count: { select: { documents: true } },
      },
    }),
    dossierId
      ? prisma.dossier.findUnique({
          where: { id: dossierId },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                accountType: true,
                adminRole: true,
                accountStatus: true,
              },
            },
            documents: { orderBy: { name: "asc" } },
          },
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Demandes & Dossiers</h1>
        <div className="text-sm text-muted">Supervision dossiers (V1) + demandes marketplace (V1).</div>
      </div>

      <AdminMarketplaceRequestsPanel />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-navy">Dossiers</div>
              <div className="text-xs text-muted">50 derniers (selon filtres)</div>
            </div>

            <form
              className="flex w-full flex-col gap-2 sm:w-full sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
              action="/admin/cases"
              method="GET"
            >
              <Input name="q" defaultValue={qRaw} placeholder="Rechercher (user, email, programme, id)…" className="sm:w-60" />
              <select
                name="status"
                defaultValue={status}
                aria-label="Statut dossier"
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text placeholder:text-muted transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-48"
              >
                <option value="">Tous les statuts</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {labelStatus(s)}
                  </option>
                ))}
              </select>
              <button type="submit" className="h-10 shrink-0 rounded-md bg-navy px-3 text-sm text-white">
                Filtrer
              </button>
            </form>
          </div>

          <div className="mt-4 divide-y rounded-md border">
            {items.length ? (
              items.map((d) => {
                const href = withSearchParams("/admin/cases", {
                  q: qRaw || undefined,
                  status: status || undefined,
                  dossierId: d.id,
                });
                const active = d.id === dossierId;
                const dStatus = d.status as DossierStatus;

                return (
                  <Link
                    key={d.id}
                    href={href}
                    className={
                      "block p-3 transition-colors hover:bg-slate-50 " +
                      (active ? "bg-slate-50" : "bg-white")
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-navy">{d.user.fullName}</div>
                        <div className="truncate text-xs text-muted">{d.user.email}</div>
                        <div className="mt-1 truncate text-xs text-muted">Programme: {d.program}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs font-semibold text-navy">{labelStatus(dStatus)}</div>
                        <div className="text-xs text-muted">Docs: {d._count.documents}</div>
                        <div className="mt-1 text-[11px] text-muted">{d.createdAt.toLocaleDateString("fr-CA")}</div>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="p-4 text-sm text-muted">Aucun dossier pour ces filtres.</div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold text-navy">Détail</div>
          {!selected ? (
            <div className="mt-2 text-sm text-muted">Sélectionne un dossier dans la liste.</div>
          ) : (
            <div className="mt-3 space-y-4">
              <div className="rounded-md border p-3">
                <div className="text-sm font-semibold text-navy">{selected.user.fullName}</div>
                <div className="text-xs text-muted">{selected.user.email}</div>
                <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-xs text-muted">Statut dossier</div>
                    <div className="font-semibold text-navy">{labelStatus(selected.status as DossierStatus)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">Créé</div>
                    <div className="font-semibold text-navy">{selected.createdAt.toLocaleString("fr-CA")}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs text-muted">Programme</div>
                    <div className="font-semibold text-navy">{selected.program}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/users/${encodeURIComponent(selected.user.id)}`}
                    className="rounded-md border px-3 py-2 text-sm"
                  >
                    Ouvrir fiche utilisateur
                  </Link>
                </div>
              </div>

              <div className="rounded-md border">
                <div className="border-b p-3 text-sm font-semibold text-navy">Documents</div>
                <div className="divide-y">
                  {selected.documents.length ? (
                    selected.documents.map((doc) => (
                      <div key={doc.id} className="p-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-navy">{doc.name}</div>
                            {doc.note ? <div className="mt-1 text-xs text-muted">Note: {doc.note}</div> : null}
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-xs font-semibold text-navy">{doc.status}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-muted">Aucun document.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
