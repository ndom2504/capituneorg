"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EventType = "LIVE" | "WEBINAIRE" | "ATELIER" | "FORMATION";

type EventLevel = "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE";
type EventFormat = "LIVE" | "REPLAY";
type EventTheme = "ETUDES" | "TRAVAIL" | "ENTREPRENEUR" | "DOCUMENTS" | "BUDGET";

type SpeakerDto = { id: string; fullName: string; title: string | null; avatarUrl: string | null };

type EventDto = {
  id: string;
  title: string;
  description: string;
  objectives: string | null;
  audience: string | null;
  prerequisites: string | null;
  durationMin: number | null;
  type: EventType;
  theme: EventTheme;
  level: EventLevel;
  format: EventFormat;
  startsAt: string | null;
  liveUrl: string | null;
  replayUrl: string | null;
  isFeatured: boolean;
  createdAt: string;
  likesCount: number;
  registrationsCount: number;
  likedByViewer: boolean;
  registeredByViewer: boolean;
  speakers: SpeakerDto[];
};

function themeLabel(theme: EventTheme) {
  switch (theme) {
    case "ETUDES":
      return "Études";
    case "TRAVAIL":
      return "Travail";
    case "ENTREPRENEUR":
      return "Entrepreneuriat";
    case "DOCUMENTS":
      return "Documents";
    case "BUDGET":
      return "Budget";
    default:
      return theme;
  }
}

function getPalette(theme: EventTheme) {
  switch (theme) {
    case "TRAVAIL":
      return { from: "#1d4ed8", to: "#06b6d4" };
    case "DOCUMENTS":
      return { from: "#0f766e", to: "#22c55e" };
    case "BUDGET":
      return { from: "#7c3aed", to: "#f97316" };
    case "ETUDES":
      return { from: "#0ea5e9", to: "#6366f1" };
    case "ENTREPRENEUR":
      return { from: "#f59e0b", to: "#ef4444" };
    default:
      return { from: "#334155", to: "#64748b" };
  }
}

function toSvgDataUrl(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function eventIllustrationSvg(event: Pick<EventDto, "title" | "type" | "theme" | "format">) {
  const palette = getPalette(event.theme);
  const badge = event.format === "REPLAY" ? "Replay" : "À venir";
  const type = labelType(event.type);
  const theme = themeLabel(event.theme);
  const safeTitle = event.title.length > 44 ? `${event.title.slice(0, 44)}…` : event.title;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="420" viewBox="0 0 1200 420">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette.from}"/>
      <stop offset="1" stop-color="${palette.to}"/>
    </linearGradient>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18" />
    </filter>
  </defs>
  <rect width="1200" height="420" rx="28" fill="url(#g)"/>
  <circle cx="180" cy="120" r="90" fill="rgba(255,255,255,0.22)" filter="url(#blur)"/>
  <circle cx="1020" cy="330" r="120" fill="rgba(255,255,255,0.16)" filter="url(#blur)"/>

  <g fill="rgba(255,255,255,0.92)" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial" >
    <text x="64" y="98" font-size="42" font-weight="800">${type}</text>
    <text x="64" y="152" font-size="26" opacity="0.92">${theme}</text>

    <rect x="64" y="182" rx="16" ry="16" width="170" height="42" fill="rgba(15,23,42,0.22)"/>
    <text x="84" y="211" font-size="22" font-weight="700">${badge}</text>

    <text x="64" y="286" font-size="34" font-weight="750">${safeTitle.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</text>
  </g>
</svg>`;
}

function labelType(t: EventType) {
  switch (t) {
    case "LIVE":
      return "Live";
    case "WEBINAIRE":
      return "Webinaire";
    case "ATELIER":
      return "Atelier";
    case "FORMATION":
      return "Formation";
    default:
      return t;
  }
}

function formatStartsAt(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString("fr-CA", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchEvents(): Promise<EventDto[]> {
  const res = await fetch("/api/events", { cache: "no-store" });
  if (!res.ok) throw new Error("Impossible de charger les événements");
  const data = (await res.json()) as { events: EventDto[] };
  return data.events;
}

function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function matchesQuery(e: { title: string; description: string }, q: string) {
  if (!q) return true;
  const hay = `${e.title} ${e.description}`.toLowerCase();
  return hay.includes(q);
}

export function EventHub() {
  const [events, setEvents] = useState<EventDto[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<EventType | "ALL">("ALL");
  const [onlyUpcoming, setOnlyUpcoming] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEvents()
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur inconnue");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const now = useMemo(() => new Date(), []);

  const q = useMemo(() => query.trim().toLowerCase(), [query]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (e.format !== "LIVE") return false;
      if (onlyUpcoming) {
        if (!e.startsAt) return false;
        if (new Date(e.startsAt) < now) return false;
      }
      if (typeFilter !== "ALL" && e.type !== typeFilter) return false;
      return matchesQuery(e, q);
    });
  }, [events, q, typeFilter, onlyUpcoming, now]);

  const upcoming = useMemo(() => {
    return filtered
      .filter((e) => e.startsAt)
      .sort((a, b) => (a.startsAt! < b.startsAt! ? -1 : 1));
  }, [filtered]);

  const trainings = useMemo(() => {
    return events
      .filter((e) => e.format === "REPLAY")
      .filter((e) => (typeFilter === "ALL" ? true : e.type === typeFilter))
      .filter((e) => matchesQuery(e, q))
      .sort((a, b) => (a.isFeatured === b.isFeatured ? 0 : a.isFeatured ? -1 : 1));
  }, [events, q, typeFilter]);

  async function toggleLike(eventId: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/like`, { method: "POST" });
      if (!res.ok) {
        setError("Action impossible (like)");
        return;
      }
      const data = (await res.json()) as { likedByViewer: boolean; likesCount: number };
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId ? { ...e, likedByViewer: data.likedByViewer, likesCount: data.likesCount } : e,
        ),
      );
    });
  }

  async function toggleRegister(eventId: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/register`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Action impossible (inscription)");
        return;
      }
      const data = (await res.json()) as {
        registeredByViewer: boolean;
        registrationsCount: number;
      };
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                registeredByViewer: data.registeredByViewer,
                registrationsCount: data.registrationsCount,
              }
            : e,
        ),
      );
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Événements & formations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher (titre, description)…"
              className="md:flex-1"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={typeFilter === "ALL" ? "primary" : "outline"}
                onClick={() => setTypeFilter("ALL")}
                size="sm"
              >
                Tous
              </Button>
              <Button
                variant={typeFilter === "WEBINAIRE" ? "primary" : "outline"}
                onClick={() => setTypeFilter("WEBINAIRE")}
                size="sm"
              >
                Webinaire
              </Button>
              <Button
                variant={typeFilter === "ATELIER" ? "primary" : "outline"}
                onClick={() => setTypeFilter("ATELIER")}
                size="sm"
              >
                Atelier
              </Button>
              <Button
                variant={typeFilter === "FORMATION" ? "primary" : "outline"}
                onClick={() => setTypeFilter("FORMATION")}
                size="sm"
              >
                Formation
              </Button>
            </div>
            <div className="flex items-center gap-2 md:ml-auto md:justify-end">
              <Button
                variant={onlyUpcoming ? "primary" : "outline"}
                onClick={() => setOnlyUpcoming((v) => !v)}
                size="sm"
              >
                {onlyUpcoming ? "À venir uniquement" : "Inclure passés"}
              </Button>
              {isPending ? <div className="text-sm text-muted">…</div> : null}
            </div>
          </div>
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">À venir</h2>
          <div className="text-sm text-muted">{upcoming.length} élément(s)</div>
        </div>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted">
              Aucun événement à venir selon vos filtres.
            </CardContent>
          </Card>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {upcoming.map((e) => (
            <Card
              key={e.id}
              className={`overflow-hidden ${e.isFeatured ? "border-primary/50" : ""}`}
            >
              <Image
                src={toSvgDataUrl(eventIllustrationSvg(e))}
                alt={`Illustration: ${e.title}`}
                width={1200}
                height={420}
                className="h-36 w-full object-cover"
              />
              <CardHeader>
                <CardTitle className="text-base">{e.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted">
                  {labelType(e.type)} · {formatStartsAt(e.startsAt) ?? ""}
                </div>
                <p className="text-sm">{e.description}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => toggleRegister(e.id)}>
                    {e.registeredByViewer ? "Annuler" : "S’inscrire"} ({e.registrationsCount})
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleLike(e.id)}>
                    {e.likedByViewer ? "Aimé" : "J’aime"} ({e.likesCount})
                  </Button>
                  {e.liveUrl ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openInNewTab(e.liveUrl!)}
                    >
                      Accéder au live
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Formations & replays</h2>
          <div className="text-sm text-muted">{trainings.length} élément(s)</div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {trainings.map((e) => (
            <Card
              key={e.id}
              className={`overflow-hidden ${e.isFeatured ? "border-primary/50" : ""}`}
            >
              <Image
                src={toSvgDataUrl(eventIllustrationSvg(e))}
                alt={`Illustration: ${e.title}`}
                width={1200}
                height={420}
                className="h-36 w-full object-cover"
              />
              <CardHeader>
                <CardTitle className="text-base">{e.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted">{labelType(e.type)} · Replay</div>
                <p className="text-sm">{e.description}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleLike(e.id)}>
                    {e.likedByViewer ? "Aimé" : "J’aime"} ({e.likesCount})
                  </Button>
                  {e.replayUrl ? (
                    <Button size="sm" onClick={() => openInNewTab(e.replayUrl!)}>
                      Voir le replay
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
