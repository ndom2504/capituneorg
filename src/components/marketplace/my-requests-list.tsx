"use client";

import Link from "next/link";
import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvatarBubble } from "@/components/ui/avatar-bubble";
import { cn } from "@/lib/cn";

type RequestStatus = "PENDING" | "NEEDS_INFO" | "ACCEPTED" | "REJECTED";

type Item = {
  id: string;
  status: RequestStatus;
  statusLabel: string;
  topic: string | null;
  topicLabel: string;
  urgency: string | null;
  preferredTimeframe: string | null;
  createdAt: string;
  lastActivityAt: string;
  unread: boolean;
  professional: { id: string; fullName: string; avatarUrl: string | null };
  meeting:
    | { id: string; startsAt: string; durationMin: number; locationUrl: string | null }
    | null;
  lastMessage:
    | {
        id: string;
        senderRole: "REQUESTER" | "PROFESSIONAL" | "SYSTEM";
        kind: "TEXT" | "STATUS_UPDATE" | "MEETING" | "FILE";
        body: string | null;
        fileUrl: string | null;
        fileName: string | null;
        createdAt: string;
      }
    | null;
};

type ApiResponse = { items: Item[] };

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function badge(status: RequestStatus) {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs";
  if (status === "ACCEPTED")
    return <span className={cn(base, "border-green-200 bg-green-50 text-green-700")}>Acceptée</span>;
  if (status === "REJECTED")
    return <span className={cn(base, "border-red-200 bg-red-50 text-red-700")}>Refusée</span>;
  if (status === "NEEDS_INFO")
    return (
      <span className={cn(base, "border-amber-200 bg-amber-50 text-amber-800")}>Infos requises</span>
    );
  return <span className={cn(base, "border-slate-200 bg-slate-50 text-slate-700")}>En attente</span>;
}

function previewText(it: Item) {
  if (it.meeting) {
    return `Rendez-vous: ${formatDateTime(it.meeting.startsAt)}`;
  }
  if (!it.lastMessage) {
    return "Aucun message";
  }
  if (it.lastMessage.kind === "FILE") {
    return `Document: ${it.lastMessage.fileName ?? "fichier"}`;
  }
  if (it.lastMessage.body) {
    return it.lastMessage.body.length > 120 ? it.lastMessage.body.slice(0, 120) + "…" : it.lastMessage.body;
  }
  return it.lastMessage.kind;
}

export function MyRequestsList() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"" | RequestStatus>("");

  useEffect(() => {
    let canceled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        const res = await fetch(`/api/marketplace/my-requests?${params.toString()}`);
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error(
              "Accès réservé aux demandeurs. Si vous êtes professionnel, utilisez plutôt l’onglet “Demandes” (Clients) ou connectez-vous avec un compte particulier.",
            );
          }
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as ApiResponse;
        if (!canceled) setItems(data.items ?? []);
      } catch (e) {
        if (!canceled) setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (!canceled) setLoading(false);
      }
    }

    run();
    return () => {
      canceled = true;
    };
  }, [status]);

  const unreadCount = useMemo(() => items.filter((i) => i.unread).length, [items]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold text-muted">Filtre statut</div>
            <select
              className="h-10 rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
              value={status}
              aria-label="Filtrer par statut"
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setStatus(e.target.value as "" | RequestStatus)
              }
            >
              <option value="">Toutes</option>
              <option value="PENDING">En attente</option>
              <option value="NEEDS_INFO">Infos requises</option>
              <option value="ACCEPTED">Acceptées</option>
              <option value="REJECTED">Refusées</option>
            </select>
          </div>
          <div className="text-xs text-muted">
            {loading
              ? "Chargement…"
              : `${items.length} demande(s) • ${unreadCount} non lue(s)`}
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="p-4">
          <div className="text-sm font-medium text-danger">Erreur</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-text">{error}</div>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {!loading && !items.length ? (
          <Card className="p-6">
            <div className="text-sm text-muted">Aucune demande.</div>
          </Card>
        ) : null}

        {items.map((it) => (
          <Card key={it.id} className={cn("p-4", it.unread && "ring-2 ring-primary/20")}> 
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <AvatarBubble
                    name={it.professional.fullName}
                    url={it.professional.avatarUrl}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-base font-semibold text-navy">
                        {it.professional.fullName}
                      </div>
                      {badge(it.status)}
                      {it.unread ? (
                        <span className="rounded-full border border-primary/25 bg-primary/12 px-2 py-0.5 text-xs text-navy">
                          Nouveau
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      Besoin: {it.topicLabel}
                      {it.preferredTimeframe ? ` • Préférence: ${it.preferredTimeframe}` : ""}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-sm text-text">{previewText(it)}</div>
                <div className="mt-2 text-xs text-muted">
                  Dernière activité: {formatDateTime(it.lastActivityAt)}
                </div>
              </div>

              <div className="shrink-0">
                <Link href={`/marketplace/mes-demandes/${it.id}`}>
                  <Button variant="outline">Ouvrir</Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
