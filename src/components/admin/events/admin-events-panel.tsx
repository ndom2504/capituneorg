"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type EventItem = {
  id: string;
  title: string;
  type: string;
  theme: string;
  level: string;
  format: string;
  startsAt: string | null;
  liveUrl: string | null;
  replayUrl: string | null;
  isFeatured: boolean;
  createdAt: string;
  speakers: { id: string; fullName: string; title: string | null; avatarUrl: string | null }[];
  likesCount: number;
  registrationsCount: number;
};

type ResponsePayload = {
  canAct: boolean;
  items: EventItem[];
};

type RegistrationItem = {
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    accountStatus: string;
    accountType: string;
    isCertified: boolean;
    createdAt: string;
  };
};

type Props = {
  viewerRole: "ADMIN" | "MODERATOR";
};

const featuredOptions = ["", "FEATURED"] as const;

export function AdminEventsPanel({ viewerRole }: Props) {
  const canAct = viewerRole === "ADMIN";

  const [q, setQ] = useState("");
  const [featured, setFeatured] = useState<(typeof featuredOptions)[number]>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<EventItem[]>([]);
  const [busyById, setBusyById] = useState<Record<string, boolean>>({});

  const [openRegistrationsEventId, setOpenRegistrationsEventId] = useState<string | null>(null);
  const [registrationsByEventId, setRegistrationsByEventId] = useState<Record<string, RegistrationItem[]>>({});
  const [registrationsLoadingByEventId, setRegistrationsLoadingByEventId] = useState<Record<string, boolean>>({});
  const [registrationsErrorByEventId, setRegistrationsErrorByEventId] = useState<Record<string, string | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (featured === "FEATURED") params.set("featured", "1");

      const url = params.toString() ? `/api/admin/events?${params.toString()}` : "/api/admin/events";
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as ResponsePayload & { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Erreur serveur.");
        setItems([]);
        return;
      }

      setItems(data.items ?? []);
    } catch {
      setError("Erreur réseau.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, featured]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => items, [items]);

  async function loadRegistrations(eventId: string) {
    setRegistrationsLoadingByEventId((prev) => ({ ...prev, [eventId]: true }));
    setRegistrationsErrorByEventId((prev) => ({ ...prev, [eventId]: null }));

    try {
      const res = await fetch(`/api/admin/events/${eventId}/registrations?limit=100`, { cache: "no-store" });
      const data = (await res.json()) as { items?: RegistrationItem[]; error?: string };
      if (!res.ok) {
        setRegistrationsErrorByEventId((prev) => ({ ...prev, [eventId]: data.error ?? "Erreur serveur." }));
        setRegistrationsByEventId((prev) => ({ ...prev, [eventId]: [] }));
        return;
      }

      setRegistrationsByEventId((prev) => ({ ...prev, [eventId]: data.items ?? [] }));
    } catch {
      setRegistrationsErrorByEventId((prev) => ({ ...prev, [eventId]: "Erreur réseau." }));
      setRegistrationsByEventId((prev) => ({ ...prev, [eventId]: [] }));
    } finally {
      setRegistrationsLoadingByEventId((prev) => ({ ...prev, [eventId]: false }));
    }
  }

  async function doAction(eventId: string, action: "FEATURE" | "UNFEATURE") {
    setError(null);
    setBusyById((prev) => ({ ...prev, [eventId]: true }));

    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId, action }),
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
      setBusyById((prev) => ({ ...prev, [eventId]: false }));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Événements</CardTitle>
        <CardDescription>
          Gestion V1 (mise en avant).{!canAct && " Lecture seule (MODERATOR)."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-muted">{loading ? "Chargement…" : `${rows.length} événement(s)`}</div>

          <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
            <div className="w-full lg:w-[320px]">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (titre, description, id)…" />
            </div>

            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-[180px]"
              value={featured}
              onChange={(e) => setFeatured(e.target.value as (typeof featuredOptions)[number])}
              aria-label="Filtrer mise en avant"
            >
              {featuredOptions.map((f) => (
                <option key={f} value={f}>
                  {f ? "Mis en avant" : "Tous"}
                </option>
              ))}
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
          <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-muted">Aucun événement.</div>
        )}

        <div className="space-y-3">
          {rows.map((it) => {
            const busy = !!busyById[it.id];
            const startsLabel = it.startsAt ? new Date(it.startsAt).toLocaleString() : "—";

            return (
              <Card key={it.id} className="hover:translate-y-0">
                <CardHeader>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <CardTitle className="text-base">{it.title}{it.isFeatured ? " (Mis en avant)" : ""}</CardTitle>
                    <div className="text-xs text-muted">{startsLabel}</div>
                  </div>
                  <CardDescription>
                    {it.type} · {it.theme} · {it.level} · {it.format} · Likes: {it.likesCount} · Inscriptions: {it.registrationsCount}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="text-sm text-muted">Speakers: {it.speakers.map((s) => s.fullName).join(", ") || "—"}</div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="primary"
                      disabled={!canAct || busy || it.isFeatured}
                      onClick={() => void doAction(it.id, "FEATURE")}
                    >
                      Mettre en avant
                    </Button>

                    <Button
                      variant="outline"
                      disabled={!canAct || busy || !it.isFeatured}
                      onClick={() => void doAction(it.id, "UNFEATURE")}
                    >
                      Retirer la mise en avant
                    </Button>

                    {!canAct && (
                      <div className="text-sm text-muted sm:ml-auto">Actions désactivées pour MODERATOR.</div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      variant="outline"
                      disabled={registrationsLoadingByEventId[it.id] === true}
                      onClick={() => {
                        const next = openRegistrationsEventId === it.id ? null : it.id;
                        setOpenRegistrationsEventId(next);
                        if (next) void loadRegistrations(it.id);
                      }}
                    >
                      {openRegistrationsEventId === it.id ? "Masquer les inscriptions" : "Voir les inscriptions"}
                    </Button>

                    {openRegistrationsEventId === it.id && (
                      <Button
                        variant="outline"
                        disabled={registrationsLoadingByEventId[it.id] === true}
                        onClick={() => void loadRegistrations(it.id)}
                      >
                        Rafraîchir les inscriptions
                      </Button>
                    )}
                  </div>

                  {openRegistrationsEventId === it.id && (
                    <div className="rounded-[var(--radius-md)] border border-border bg-white p-3">
                      <div className="mb-2 text-sm font-medium text-navy">Inscriptions (100 dernières)</div>

                      {registrationsErrorByEventId[it.id] && (
                        <div className="mb-2 text-sm text-red-600">{registrationsErrorByEventId[it.id]}</div>
                      )}

                      {registrationsLoadingByEventId[it.id] === true ? (
                        <div className="text-sm text-muted">Chargement…</div>
                      ) : (
                        <div className="space-y-2">
                          {(registrationsByEventId[it.id] ?? []).length === 0 ? (
                            <div className="text-sm text-muted">Aucune inscription.</div>
                          ) : (
                            (registrationsByEventId[it.id] ?? []).map((r) => (
                              <div key={r.user.id} className="flex flex-col gap-1 border-b border-border pb-2 last:border-b-0 last:pb-0">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                                  <div className="text-sm">
                                    <Link className="text-primary hover:underline" href={`/admin/users/${r.user.id}`}>
                                      {r.user.fullName}
                                    </Link>
                                    <span className="text-muted"> · {r.user.email}</span>
                                  </div>
                                  <div className="text-xs text-muted">{new Date(r.createdAt).toLocaleString()}</div>
                                </div>
                                <div className="text-xs text-muted">
                                  {r.user.accountType} · {r.user.accountStatus}{r.user.isCertified ? " · Certifié" : ""}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-muted">ID: {it.id}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
