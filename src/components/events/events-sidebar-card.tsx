"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type EventDto = {
  id: string;
  slug: string;
  title: string;
  format: "LIVE" | "REPLAY";
  type: "LIVE" | "WEBINAIRE" | "ATELIER" | "FORMATION";
  startsAt: string | null;
  bannerUrl: string | null;
};

function formatStartsAtShort(iso: string) {
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.toLocaleDateString("fr-FR", { month: "short" });
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} à ${hour}h${min}`;
}

export function EventsSidebarCard({ className }: { className?: string }) {
  const [events, setEvents] = useState<EventDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/events", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Chargement impossible");
        const data = (await res.json()) as { events: EventDto[] };
        if (!cancelled) setEvents(data.events ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Événements indisponibles");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const now = useMemo(() => new Date(), []);

  const upcoming = useMemo(() => {
    return events
      .filter((e) => e.format === "LIVE")
      .filter((e) => (e.startsAt ? new Date(e.startsAt) >= now : false))
      .sort((a, b) => (a.startsAt! < b.startsAt! ? -1 : 1))
      .slice(0, 2);
  }, [events, now]);

  const trainings = useMemo(() => {
    return events
      .filter((e) => e.format === "REPLAY")
      .slice(0, 2);
  }, [events]);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-end px-4 py-2">
        <Link href="/events" className="text-xs font-semibold text-primary">
          Voir tout
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <div className="text-sm text-muted">{error}</div> : null}

        {!error && events.length === 0 ? (
          <div className="text-sm text-muted">Chargement…</div>
        ) : null}

        {upcoming.length ? (
          <div>
            <div className="text-xs font-semibold text-navy">À venir</div>
            <div className="mt-1 space-y-2">
              {upcoming.map((e) => (
                <div
                  key={e.id}
                  className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border bg-white/60 p-2 overflow-hidden"
                >
                  {e.bannerUrl ? (
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
                      <img
                        src={e.bannerUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-semibold text-text leading-tight">{e.title}</div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      {e.startsAt ? (
                        <div className="text-xs text-muted whitespace-nowrap">{formatStartsAtShort(e.startsAt)}</div>
                      ) : (
                        <span />
                      )}
                      <ActionLink href={`/events/${e.slug}`}>Détails</ActionLink>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {trainings.length ? (
          <div>
            <div className="text-xs font-semibold text-navy">En replay</div>
            <div className="mt-1 space-y-2">
              {trainings.map((e) => (
                <div
                  key={e.id}
                  className="flex items-start gap-3 rounded-[var(--radius-md)] border border-border bg-white/60 p-2 overflow-hidden"
                >
                  {e.bannerUrl ? (
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
                      <img
                        src={e.bannerUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-semibold text-text leading-tight">{e.title}</div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="text-xs text-muted">Formation disponible</div>
                      <ActionLink href={`/events/${e.slug}`}>Détails</ActionLink>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!error && events.length > 0 && !upcoming.length && !trainings.length ? (
          <div className="text-sm text-muted">Aucun élément à afficher.</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 rounded-[var(--radius-md)] border border-border bg-white/80 px-3 py-1 text-xs font-semibold text-text shadow-sm",
        "transition-[background-color,box-shadow,transform] hover:bg-white hover:shadow-md hover:-translate-y-px active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      {children}
    </Link>
  );
}
