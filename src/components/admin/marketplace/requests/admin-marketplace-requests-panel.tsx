"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type RequestItem = {
  id: string;
  status: string;
  topic: string | null;
  urgency: string | null;
  message: string | null;
  proNote: string | null;
  acceptedAt: string | null;
  closedByClientAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  requester: {
    id: string;
    fullName: string;
    email: string;
    accountType: string;
    accountStatus: string;
  };
  professional: {
    id: string;
    fullName: string;
    email: string;
    accountType: string;
    accountStatus: string;
  };
};

type ResponsePayload = {
  canAct: boolean;
  items: RequestItem[];
};

const statusOptions = ["", "PENDING", "ACCEPTED", "REJECTED", "NEEDS_INFO"] as const;
const openOnlyOptions = ["", "open"] as const;

export function AdminMarketplaceRequestsPanel() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof statusOptions)[number]>("");
  const [openOnly, setOpenOnly] = useState<(typeof openOnlyOptions)[number]>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<RequestItem[]>([]);
  const [canAct, setCanAct] = useState(false);
  const [busyById, setBusyById] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (openOnly === "open") params.set("openOnly", "true");

      const url = params.toString()
        ? `/api/admin/marketplace/requests?${params.toString()}`
        : "/api/admin/marketplace/requests";
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as ResponsePayload & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur serveur.");
        setItems([]);
        setCanAct(false);
        return;
      }

      setCanAct(Boolean(data.canAct));
      setItems(data.items ?? []);
    } catch {
      setError("Erreur réseau.");
      setItems([]);
      setCanAct(false);
    } finally {
      setLoading(false);
    }
  }, [openOnly, q, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => items, [items]);

  async function closeAsAdmin(requestId: string) {
    setError(null);
    setBusyById((prev) => ({ ...prev, [requestId]: true }));

    try {
      const res = await fetch(`/api/admin/marketplace/requests/${encodeURIComponent(requestId)}/close`, {
        method: "POST",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok) {
        setError(data.error ?? "Erreur serveur.");
        return;
      }

      await load();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusyById((prev) => ({ ...prev, [requestId]: false }));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demandes marketplace</CardTitle>
        <CardDescription>Supervision V1 (lecture + clôture). {!canAct && "Actions désactivées (MODERATOR)."}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-muted">{loading ? "Chargement…" : `${rows.length} demande(s)`}</div>

          <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
            <div className="w-full lg:w-[360px]">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher (user/pro, email, id)…"
              />
            </div>

            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-[180px]"
              value={status}
              onChange={(e) => setStatus(e.target.value as (typeof statusOptions)[number])}
              aria-label="Filtrer par status"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s || "Tous status"}
                </option>
              ))}
            </select>

            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-[180px]"
              value={openOnly}
              onChange={(e) => setOpenOnly(e.target.value as (typeof openOnlyOptions)[number])}
              aria-label="Filtrer ouvertes"
            >
              <option value="">Ouvertes + clôturées</option>
              <option value="open">Ouvertes uniquement</option>
            </select>

            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              Rafraîchir
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-red-600">{error}</div>
        )}

        {!loading && rows.length === 0 && (
          <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-muted">Aucune demande.</div>
        )}

        <div className="space-y-3">
          {rows.map((it) => {
            const busy = busyById[it.id] === true;
            const created = new Date(it.createdAt).toLocaleString();
            const last = new Date(it.lastActivityAt).toLocaleString();
            const closed = it.closedByClientAt ? new Date(it.closedByClientAt).toLocaleString() : null;

            const metaParts = [
              `Status: ${it.status}`,
              it.topic ? `Topic: ${it.topic}` : null,
              it.urgency ? `Urgence: ${it.urgency}` : null,
              it.acceptedAt ? `Acceptée: ${new Date(it.acceptedAt).toLocaleString()}` : null,
              closed ? `Clôturée: ${closed}` : "Ouverte",
            ].filter(Boolean);

            return (
              <Card key={it.id} className="hover:translate-y-0">
                <CardHeader>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <CardTitle className="text-base">Demande #{it.id}</CardTitle>
                    <div className="text-xs text-muted">Activité: {last}</div>
                  </div>
                  <CardDescription>{metaParts.join(" · ")}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-2 text-sm lg:grid-cols-2">
                    <div className="text-sm text-muted">
                      Demandeur: {" "}
                      <Link className="text-primary hover:underline" href={`/admin/users/${it.requester.id}`}>
                        {it.requester.fullName}
                      </Link>
                      <span className="text-muted"> · {it.requester.email}</span>
                    </div>

                    <div className="text-sm text-muted">
                      Pro: {" "}
                      <Link className="text-primary hover:underline" href={`/admin/users/${it.professional.id}`}>
                        {it.professional.fullName}
                      </Link>
                      <span className="text-muted"> · {it.professional.email}</span>
                    </div>
                  </div>

                  <div className="text-xs text-muted">Créée: {created}</div>

                  {it.message ? (
                    <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm">
                      <div className="text-xs font-semibold text-navy">Message</div>
                      <div className="mt-1 whitespace-pre-wrap text-sm text-text">{it.message}</div>
                    </div>
                  ) : null}

                  {it.proNote ? (
                    <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm">
                      <div className="text-xs font-semibold text-navy">Note Pro</div>
                      <div className="mt-1 whitespace-pre-wrap text-sm text-text">{it.proNote}</div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      variant="outline"
                      disabled={!canAct || busy || Boolean(it.closedByClientAt)}
                      onClick={() => void closeAsAdmin(it.id)}
                    >
                      Clôturer (côté client)
                    </Button>

                    {!canAct && <div className="text-sm text-muted sm:ml-auto">Actions désactivées pour MODERATOR.</div>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
