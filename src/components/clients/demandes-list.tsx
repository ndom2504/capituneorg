"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { AvatarBubble } from "@/components/ui/avatar-bubble";

type RequestStatus = "PENDING" | "NEEDS_INFO" | "ACCEPTED" | "REJECTED";

type DemandeItem = {
  id: string;
  status: RequestStatus;
  topic: string | null;
  topicLabel: string;
  urgency: string | null;
  preferredTimeframe: string | null;
  message: string | null;
  proNote: string | null;
  createdAt: string;
  cv: null | {
    url: string;
    name: string;
    createdAt: string;
  };
  requester: { id: string; fullName: string; avatarUrl: string | null };
  meeting:
    | {
        id: string;
        startsAt: string;
        durationMin: number;
        locationUrl: string | null;
      }
    | null;
};

type ApiResponse = { items: DemandeItem[] };

function badge(status: RequestStatus) {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs";
  if (status === "ACCEPTED")
    return (
      <span className={cn(base, "border-green-200 bg-green-50 text-green-700")}>Acceptée</span>
    );
  if (status === "REJECTED")
    return (
      <span className={cn(base, "border-red-200 bg-red-50 text-red-700")}>Refusée</span>
    );
  if (status === "NEEDS_INFO")
    return (
      <span className={cn(base, "border-amber-200 bg-amber-50 text-amber-800")}>
        Infos requises
      </span>
    );
  return (
    <span className={cn(base, "border-slate-200 bg-slate-50 text-slate-700")}>En attente</span>
  );
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function DemandesList() {
  const [items, setItems] = useState<DemandeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | RequestStatus>("");

  useEffect(() => {
    let canceled = false;

    async function run() {
      setLoading(true);
      setError(null);
      setWarning(null);
      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set("status", statusFilter);
        const res = await fetch(`/api/clients/demandes?${params.toString()}`, {
          method: "GET",
          headers: { "content-type": "application/json" },
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as ApiResponse;
        if (canceled) return;
        const raw = Array.isArray(data.items) ? data.items : [];
        const valid = raw.filter((it) => typeof it?.id === "string" && it.id.trim().length > 0);
        if (valid.length !== raw.length) {
          setWarning("Certaines demandes sont invalides (ID manquant). Rafraîchissez la page.");
        }
        setItems(valid);
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
  }, [statusFilter]);

  const counts = useMemo(() => {
    const map = new Map<RequestStatus, number>();
    for (const it of items) map.set(it.status, (map.get(it.status) ?? 0) + 1);
    return map;
  }, [items]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-navy">Demandes Marketplace</h2>
        <p className="mt-1 text-sm text-muted">
          Leads entrants (sans messagerie). Vous pouvez accepter et créer un meeting, demander des infos ou refuser.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold text-muted">Filtre statut</div>
            <select
              className="h-10 rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "" | RequestStatus)}
            >
              <option value="">Tous</option>
              <option value="PENDING">En attente ({counts.get("PENDING") ?? 0})</option>
              <option value="NEEDS_INFO">Infos requises ({counts.get("NEEDS_INFO") ?? 0})</option>
              <option value="ACCEPTED">Acceptées ({counts.get("ACCEPTED") ?? 0})</option>
              <option value="REJECTED">Refusées ({counts.get("REJECTED") ?? 0})</option>
            </select>
          </div>
          <div className="text-xs text-muted">
            {loading ? "Chargement…" : `${items.length} demande(s)`}
          </div>
        </div>
      </Card>

      {error ? (
        <Card className="p-4">
          <div className="text-sm font-medium text-danger">Erreur</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-text">{error}</div>
        </Card>
      ) : null}

      {warning ? (
        <Card className="p-4">
          <div className="text-sm font-medium text-navy">Info</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-muted">{warning}</div>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {!loading && !items.length ? (
          <Card className="p-6">
            <div className="text-sm text-muted">Aucune demande.</div>
          </Card>
        ) : null}

        {items.map((it) => (
          <Card key={it.id} className="h-[360px] p-4">
            <div className="grid h-full grid-rows-[96px_1fr_52px]">
              <div className="flex items-start justify-center pt-2">
                <AvatarBubble name={it.requester.fullName} url={it.requester.avatarUrl} size="xl" />
              </div>

              <div className="min-w-0 overflow-hidden text-center">
                <div className="max-w-full truncate text-base font-semibold text-navy">
                  {it.requester.fullName}
                </div>
                <div className="mt-2 flex justify-center">{badge(it.status)}</div>
                <div className="mt-2 truncate text-sm text-muted">{it.topicLabel}</div>
                <div className="mt-2 truncate text-xs text-muted">Reçue: {formatDateTime(it.createdAt)}</div>

                {it.message ? (
                  <div className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-text">{it.message}</div>
                ) : (
                  <div className="mt-2 text-sm text-muted">(Pas de message)</div>
                )}

                <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
                  {it.urgency ? <span>Urgence: {it.urgency}</span> : null}
                  {it.preferredTimeframe ? <span>Contraintes: {it.preferredTimeframe}</span> : null}
                  {it.cv ? <span>CV: {it.cv.name}</span> : null}
                  {it.meeting ? <span>Meeting: {formatDateTime(it.meeting.startsAt)}</span> : null}
                </div>
              </div>

              <div className="flex items-end">
                {it.id ? (
                  <Link href={`/clients/demandes/${it.id}`} className="w-full">
                    <Button className="h-11 w-full">Ouvrir</Button>
                  </Link>
                ) : (
                  <Button className="h-11 w-full" disabled>
                    Ouvrir
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
