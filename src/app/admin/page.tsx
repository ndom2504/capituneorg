import Link from "next/link";

import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=dim
  const diff = (day + 6) % 7; // lundi = 0
  x.setDate(x.getDate() - diff);
  return x;
}

export default async function AdminDashboardPage() {
  const flags = await getFeatureFlagsFromDb();
  const now = new Date();
  const dayStart = startOfDay(now);
  const weekStart = startOfWeek(now);

  const [
    usersTotal,
    usersNewDay,
    prosTotal,
    prosNewDay,
    prosPending,
    prosVerified,
    prosRejected,
    postsDay,
    postsWeek,
    marketplaceServicesActive,
    marketplaceRequestsPending,
    dossiersInProgress,
    upcomingLive,
    paymentsPaidDay,
    paymentsFailedDay,
  ] = await Promise.all([
    prisma.user.count({ where: { accountType: "USER" } }),
    prisma.user.count({ where: { accountType: "USER", createdAt: { gte: dayStart } } }),
    prisma.user.count({ where: { accountType: "PROFESSIONAL" } }),
    prisma.user.count({ where: { accountType: "PROFESSIONAL", createdAt: { gte: dayStart } } }),
    prisma.marketplaceProfile.count({ where: { verificationStatus: "PENDING" } }),
    prisma.marketplaceProfile.count({ where: { verificationStatus: "VERIFIED" } }),
    prisma.marketplaceProfile.count({ where: { verificationStatus: "REJECTED" } }),
    prisma.userPost.count({ where: { createdAt: { gte: dayStart } } }),
    prisma.userPost.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.paymentService.count({ where: { active: true } }),
    prisma.marketplaceRequest.count({ where: { status: "PENDING" } }),
    prisma.dossier.count({ where: { status: "EN_COURS" } }),
    prisma.event.findFirst({
      where: { type: "LIVE", startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, startsAt: true, _count: { select: { registrations: true } } },
    }),
    prisma.payment.count({ where: { status: "SUCCEEDED", createdAt: { gte: dayStart } } }),
    prisma.payment.count({ where: { status: "FAILED", createdAt: { gte: dayStart } } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Admin Dashboard</h1>
          <div className="text-sm text-muted">Vision globale & actions rapides.</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/pro-verification" className="rounded-md bg-navy px-3 py-2 text-sm text-white">
            Valider un pro
          </Link>
          {flags.community ? (
            <Link href="/admin/community/posts" className="rounded-md border px-3 py-2 text-sm">
              Publier une annonce
            </Link>
          ) : null}
          {flags.events ? (
            <Link href="/admin/events" className="rounded-md border px-3 py-2 text-sm">
              Créer un événement
            </Link>
          ) : null}
          {flags.community ? (
            <Link href="/admin/community/reports" className="rounded-md border px-3 py-2 text-sm">
              Voir signalements
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm font-semibold text-navy">Utilisateurs</div>
          <div className="mt-2 text-sm text-muted">Demandeurs</div>
          <div className="text-2xl font-semibold text-navy">{usersTotal}</div>
          <div className="text-xs text-muted">+{usersNewDay} aujourd’hui</div>
          <div className="mt-3 text-sm text-muted">Professionnels</div>
          <div className="text-2xl font-semibold text-navy">{prosTotal}</div>
          <div className="text-xs text-muted">+{prosNewDay} aujourd’hui</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold text-navy">Vérification Pro</div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted">Pending</span>
            <span className="font-semibold text-navy">{prosPending}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted">Verified</span>
            <span className="font-semibold text-navy">{prosVerified}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted">Rejected</span>
            <span className="font-semibold text-navy">{prosRejected}</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold text-navy">Activité communauté</div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted">Posts aujourd’hui</span>
            <span className="font-semibold text-navy">{postsDay}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted">Posts semaine</span>
            <span className="font-semibold text-navy">{postsWeek}</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold text-navy">Marketplace</div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted">Services actifs</span>
            <span className="font-semibold text-navy">{marketplaceServicesActive}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted">Demandes en attente</span>
            <span className="font-semibold text-navy">{marketplaceRequestsPending}</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold text-navy">Dossiers</div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted">En cours</span>
            <span className="font-semibold text-navy">{dossiersInProgress}</span>
          </div>
          <div className="mt-2 text-xs text-muted">(V1: supervision simple)</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold text-navy">Événements</div>
          {upcomingLive ? (
            <div className="mt-3 space-y-1 text-sm">
              <div className="font-semibold text-navy">{upcomingLive.title}</div>
              <div className="text-muted">
                {upcomingLive.startsAt ? upcomingLive.startsAt.toLocaleString("fr-CA") : "Date à confirmer"} · {upcomingLive._count.registrations} inscrits
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm text-muted">Aucun live à venir.</div>
          )}
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold text-navy">Paiements</div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted">Réussis aujourd’hui</span>
            <span className="font-semibold text-navy">{paymentsPaidDay}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted">Échecs aujourd’hui</span>
            <span className="font-semibold text-navy">{paymentsFailedDay}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
