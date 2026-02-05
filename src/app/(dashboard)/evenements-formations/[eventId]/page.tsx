import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EventDetailActions } from "@/components/events/event-detail-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";

function formatStartsAtLong(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("fr-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function labelFormat(format: "LIVE" | "REPLAY") {
  return format === "LIVE" ? "À venir" : "Replay";
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const viewer = await getAppViewer();
  if (!viewer) redirect("/auth");

  const { eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      speakers: {
        include: {
          speaker: { select: { id: true, fullName: true, title: true, avatarUrl: true } },
        },
      },
      _count: { select: { likes: true, registrations: true } },
      likes: { where: { userId: viewer.id }, select: { userId: true } },
      registrations: { where: { userId: viewer.id }, select: { userId: true } },
    },
  });

  if (!event) notFound();

  const startsAtLabel = event.startsAt ? formatStartsAtLong(event.startsAt.toISOString()) : null;
  const speakers = event.speakers.map((s) => s.speaker);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/evenements-formations" className="text-sm font-semibold text-primary">
          ← Retour
        </Link>
        <div className="text-xs text-muted">{labelFormat(event.format)}</div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{event.title}</CardTitle>
          <div className="mt-1 text-sm text-muted">{event.description}</div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
              <div className="text-xs text-muted">Thème</div>
              <div className="text-sm font-semibold text-text">{event.theme}</div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
              <div className="text-xs text-muted">Niveau</div>
              <div className="text-sm font-semibold text-text">{event.level}</div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
              <div className="text-xs text-muted">Type</div>
              <div className="text-sm font-semibold text-text">{event.type}</div>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
              <div className="text-xs text-muted">Date</div>
              <div className="text-sm font-semibold text-text">{startsAtLabel ?? "—"}</div>
            </div>
          </div>

          {event.objectives ? (
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
              <div className="text-xs font-semibold text-navy">Objectifs</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-text">{event.objectives}</div>
            </div>
          ) : null}

          {event.audience ? (
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
              <div className="text-xs font-semibold text-navy">Pour qui ?</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-text">{event.audience}</div>
            </div>
          ) : null}

          {event.prerequisites ? (
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
              <div className="text-xs font-semibold text-navy">Prérequis</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-text">{event.prerequisites}</div>
            </div>
          ) : null}

          {speakers.length ? (
            <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
              <div className="text-xs font-semibold text-navy">Intervenants</div>
              <div className="mt-2 space-y-2">
                {speakers.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-white/70 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-text">{s.fullName}</div>
                      {s.title ? <div className="truncate text-xs text-muted">{s.title}</div> : null}
                    </div>
                    {s.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/15" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {event.liveUrl ? (
              <a href={event.liveUrl} target="_blank" rel="noreferrer" className="inline-flex">
                <Button className="bg-navy hover:bg-navy/90">Accéder au live</Button>
              </a>
            ) : null}
            {event.replayUrl ? (
              <a href={event.replayUrl} target="_blank" rel="noreferrer" className="inline-flex">
                <Button variant="outline">Voir le replay</Button>
              </a>
            ) : null}
          </div>

          <EventDetailActions
            eventId={event.id}
            initialLikedByViewer={event.likes.length > 0}
            initialRegisteredByViewer={event.registrations.length > 0}
            initialLikesCount={event._count.likes}
            initialRegistrationsCount={event._count.registrations}
          />
        </CardContent>
      </Card>
    </div>
  );
}
