import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";

export default async function NotificationsPage() {
  const viewer = await getAppViewer();
  if (!viewer) redirect("/auth");

  let unreadCount = 0;
  let notifications: Array<{
    id: string;
    title: string;
    message: string;
    link: string;
    priority: "CRITICAL" | "IMPORTANT" | "INFO";
    readAt: Date | null;
    createdAt: Date;
  }> = [];
  let unavailable = false;

  try {
    [unreadCount, notifications] = await Promise.all([
      prisma.notification.count({ where: { userId: viewer.id, readAt: null } }),
      prisma.notification.findMany({
        where: { userId: viewer.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          message: true,
          link: true,
          priority: true,
          readAt: true,
          createdAt: true,
        },
      }),
    ]);
  } catch {
    unavailable = true;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-navy">Notifications</div>
          <div className="text-sm text-muted">{unreadCount} non lue(s)</div>
        </div>
        <Link href="/accueil" className="text-sm font-semibold text-primary">
          ← Retour
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dernières mises à jour</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {unavailable ? (
            <div className="text-sm text-muted">
              Notifications indisponibles (migration en attente).
            </div>
          ) : null}

          {!unavailable && notifications.length === 0 ? (
            <div className="text-sm text-muted">Aucune notification.</div>
          ) : null}

          {!unavailable && notifications.length ? (
            <div className="space-y-2">
              {notifications.map((n) => (
                <a
                  key={n.id}
                  href={n.link}
                  className="block rounded-[var(--radius-md)] border border-border bg-white/60 p-3 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-text">{n.title}</div>
                      <div className="mt-0.5 text-xs text-muted">{n.message}</div>
                    </div>
                    {!n.readAt ? (
                      <span className="shrink-0 rounded-full bg-primary/15 px-2 py-1 text-[11px] font-semibold text-navy">
                        Nouveau
                      </span>
                    ) : null}
                  </div>
                </a>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
