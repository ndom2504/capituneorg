"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { readApiError } from "@/components/pro-content/api";

type ContentType = "EVENT" | "TRAINING";

type ListItem = {
  id: string;
  type: ContentType;
  title: string;
  description: string;
  language: string;

  eventStatus: string | null;
  eventType: string | null;
  startsAt: string | null;
  durationMin: number | null;
  timezone: string | null;
  liveUrl: string | null;
  replayUrl: string | null;
  capacity: number | null;
  imageUrl: string | null;

  publishStatus: string;
  trainingFormat: string | null;
  level: string | null;
  videoUrl: string | null;

  isPaid: boolean;
  priceCents: number | null;
  currency: string;

  targetRole: string | null;

  createdAt: string;
  updatedAt: string;

  enrollmentsCount: number;
};

type ListResponse = {
  items: ListItem[];
  viewer?: {
    id: string;
    fullName: string;
    accountType: string;
    isCertified: boolean;
    pro?: {
      hasMarketplaceProfile: boolean;
      isVerified: boolean;
    };
  };
  error?: string;
};

function money(it: { isPaid: boolean; priceCents: number | null; currency: string }) {
  if (!it.isPaid) return "Gratuit";
  if (!it.priceCents) return "Payant";
  const amount = (it.priceCents / 100).toFixed(2);
  return `${amount} ${it.currency.toUpperCase()}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProContentList({
  type,
  createHref,
  editBaseHref,
}: {
  type: ContentType;
  createHref: string;
  editBaseHref: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [viewer, setViewer] = useState<ListResponse["viewer"] | null>(null);

  const header = type === "EVENT" ? "Mes événements" : "Mes formations";
  const hint = type === "EVENT"
    ? "Créez et publiez vos événements."
    : "Créez et publiez vos formations.";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/clients/content-items?type=${type}`, { cache: "no-store" });
      const data = (await res.json()) as ListResponse;
      if (!res.ok) {
        setItems([]);
        setViewer(null);
        setError(data.error ?? (await readApiError(res)));
        return;
      }

      setItems(data.items ?? []);
      setViewer(data.viewer ?? null);
    } catch {
      setError("Erreur réseau.");
      setItems([]);
      setViewer(null);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void load();
  }, [load]);

  const proVerified = viewer?.pro?.isVerified === true;

  const rows = useMemo(() => {
    return items.map((it) => {
      const editHref = `${editBaseHref}/${it.id}`;
      const enrollHref = type === "EVENT" ? `${editHref}/inscrits` : null;

      const status = type === "EVENT" ? (it.eventStatus ?? "—") : (it.publishStatus ?? "—");
      const when = type === "EVENT" ? formatDate(it.startsAt) : formatDate(it.updatedAt);

      return {
        it,
        editHref,
        enrollHref,
        status,
        when,
      };
    });
  }, [items, editBaseHref, type]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy">{header}</h1>
          <p className="mt-1 text-sm text-muted">{hint}</p>
          {viewer?.pro ? (
            <p className="mt-1 text-xs text-muted">
              Pro vérifié: <span className={cn("font-semibold", proVerified ? "text-navy" : "text-muted")}>{proVerified ? "Oui" : "Non"}</span>
              {proVerified ? null : " — la publication payante est réservée aux profils vérifiés."}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button onClick={() => void load()} variant="outline">Actualiser</Button>
          <Link href={createHref}>
            <Button>Créer</Button>
          </Link>
        </div>
      </div>

      {error ? (
        <Card className="p-4">
          <div className="text-sm font-medium text-danger">Erreur</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-text">{error}</div>
        </Card>
      ) : null}

      {loading ? (
        <Card className="p-4">
          <div className="text-sm text-muted">Chargement…</div>
        </Card>
      ) : null}

      {!loading && !rows.length ? (
        <Card className="p-4">
          <div className="text-sm text-muted">Aucun élément pour le moment.</div>
        </Card>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map(({ it, editHref, enrollHref, status, when }) => (
          <Card key={it.id} className="p-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-start justify-between gap-3">
                <span className="min-w-0 truncate">{it.title}</span>
                <span className="shrink-0 rounded-full border border-border bg-white/70 px-2 py-0.5 text-xs font-semibold text-muted">
                  {status}
                </span>
              </CardTitle>
              <CardDescription className="line-clamp-2">{it.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs text-muted">
                <span className="rounded-full border border-border bg-white/70 px-2 py-0.5">{type === "EVENT" ? `Début: ${when}` : `Modifié: ${when}`}</span>
                <span className="rounded-full border border-border bg-white/70 px-2 py-0.5">{money(it)}</span>
                {type === "EVENT" ? (
                  <span className="rounded-full border border-border bg-white/70 px-2 py-0.5">Inscrits: {it.enrollmentsCount}</span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href={editHref}>
                  <Button variant="outline" size="sm">Modifier</Button>
                </Link>
                {enrollHref ? (
                  <Link href={enrollHref}>
                    <Button variant="outline" size="sm">Inscrits</Button>
                  </Link>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
