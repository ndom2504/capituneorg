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
  bannerUrl: string | null; // Added bannerUrl
};

function formatStartsAtShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("fr-CA", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getBannerUrl(url: string | null) {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("/")) return url;
  return `/uploads/events/${url}`;
}

export function EventsSidebarCard({ className }: { className?: string }) {
  const [events, setEvents] = useState<EventDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch("/api/events", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Chargement impossible");
        const data = (await res.json()) as { events: EventDto[] };
        if (!cancelled) setEvents(data.events ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Événements indisponibles");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
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

  const isEmpty = upcoming.length === 0 && trainings.length === 0;

  return (
    <Card className={cn("overflow-hidden border-border bg-white shadow-sm hover:shadow-md transition-all", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 p-4 pb-2">
        <CardTitle className="text-xs font-black text-navy uppercase tracking-wider">Sessions & Replays</CardTitle>
        <Link href="/events" className="text-[10px] font-bold text-primary hover:underline bg-primary/5 px-2 py-0.5 rounded">
          Voir
        </Link>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-2">
        {error ? <div className="text-[10px] text-red-500 font-medium">{error}</div> : null}

        {isLoading ? (
          <div className="flex items-center gap-2 py-2">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
            <div className="text-[10px] text-muted font-medium">Synchronisation...</div>
          </div>
        ) : null}

        {!isLoading && !error && isEmpty && (
           <div className="py-2 text-[10px] text-muted font-medium italic">Aucun événement planifié.</div>
        )}

        {upcoming.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-navy opacity-50 uppercase tracking-tighter">Prochains directs</div>
            <div className="space-y-2">
              {upcoming.map((e) => (
                <Link
                  key={e.id}
                  href={`/events/${e.slug}`}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-gray-50/50 p-2 hover:bg-white hover:border-primary/30 transition-all group"
                >
                  <div className="h-10 w-14 shrink-0 overflow-hidden rounded bg-gray-100 border border-border/40 relative">
                    {e.bannerUrl ? (
                      <img src={getBannerUrl(e.bannerUrl) ?? ""} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" alt="" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[8px] font-bold text-gray-300 uppercase leading-none text-center">Live</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-bold text-navy leading-tight">{e.title}</div>
                    {e.startsAt ? (
                      <div className="mt-0.5 text-[9px] font-medium text-primary uppercase">{formatStartsAtShort(e.startsAt)}</div>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {trainings.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-navy opacity-50 uppercase tracking-tighter">Formations recommandées</div>
            <div className="space-y-2">
              {trainings.map((e) => (
                <Link
                  key={e.id}
                  href={`/events/${e.slug}`}
                  className="flex items-center gap-2.5 rounded-lg border border-border bg-gray-50/50 p-2 hover:bg-white hover:border-primary/30 transition-all group"
                >
                  <div className="h-10 w-14 shrink-0 overflow-hidden rounded bg-gray-100 border border-border/40">
                    {e.bannerUrl ? (
                      <img src={e.bannerUrl} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" alt="" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[8px] font-bold text-gray-300 uppercase leading-none text-center">Video</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-bold text-navy leading-tight">{e.title}</div>
                    <div className="mt-0.5 text-[9px] font-medium text-green-600 uppercase">Vidéo à la demande</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

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
        "shrink-0 rounded-md border border-border bg-white/80 px-3 py-1 text-xs font-semibold text-text shadow-sm",
        "transition-[background-color,box-shadow,transform] hover:bg-white hover:shadow-md hover:-translate-y-px active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      {children}
    </Link>
  );
}
