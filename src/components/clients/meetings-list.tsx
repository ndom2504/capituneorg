"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type MeetingStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

type MeetingType = "DISCOVERY_CALL" | "ORIENTATION" | "DOSSIER_FOLLOWUP" | "OTHER";

type MeetingItem = {
  id: string;
  startsAt: string;
  durationMin: number;
  status: MeetingStatus;
  type: MeetingType;
  locationUrl: string | null;
  client: { id: string; fullName: string; email: string };
  preRegistrationId: string | null;
};

type ApiResponse = { items: MeetingItem[] };

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function MeetingsList() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [upcoming, setUpcoming] = useState<MeetingItem[]>([]);
  const [past, setPast] = useState<MeetingItem[]>([]);

  const [startsAt, setStartsAt] = useState("");
  const [durationMin, setDurationMin] = useState("45");
  const [clientEmail, setClientEmail] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [notes, setNotes] = useState("");

  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let canceled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const [resUpcoming, resPast] = await Promise.all([
          fetch("/api/clients/meetings?scope=upcoming", {
            method: "GET",
            headers: { "content-type": "application/json" },
          }),
          fetch("/api/clients/meetings?scope=past", {
            method: "GET",
            headers: { "content-type": "application/json" },
          }),
        ]);

        if (!resUpcoming.ok) {
          const text = await resUpcoming.text();
          throw new Error(text || `HTTP ${resUpcoming.status}`);
        }
        if (!resPast.ok) {
          const text = await resPast.text();
          throw new Error(text || `HTTP ${resPast.status}`);
        }

        const dataUpcoming = (await resUpcoming.json()) as ApiResponse;
        const dataPast = (await resPast.json()) as ApiResponse;
        if (canceled) return;
        setUpcoming(dataUpcoming.items ?? []);
        setPast(dataPast.items ?? []);
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
  }, []);

  const upcomingByDay = useMemo(() => {
    const map = new Map<string, MeetingItem[]>();
    for (const m of upcoming) {
      const day = m.startsAt.slice(0, 10);
      const arr = map.get(day) ?? [];
      arr.push(m);
      map.set(day, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
  }, [upcoming]);

  async function createMeeting() {
    if (!startsAt) {
      setError("Choisissez une date/heure.");
      return;
    }
    if (!clientEmail.trim()) {
      setError("Entrez l’email du client.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/clients/meetings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          startsAt: new Date(startsAt).toISOString(),
          durationMin: Math.max(15, Number(durationMin) || 45),
          locationUrl: locationUrl.trim() || null,
          notesInternal: notes.trim() || null,
          clientEmail: clientEmail.trim(),
          type: "ORIENTATION",
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      // refresh list
      const [resUpcoming, resPast] = await Promise.all([
        fetch("/api/clients/meetings?scope=upcoming", {
          method: "GET",
          headers: { "content-type": "application/json" },
        }),
        fetch("/api/clients/meetings?scope=past", {
          method: "GET",
          headers: { "content-type": "application/json" },
        }),
      ]);

      if (resUpcoming.ok) {
        const data = (await resUpcoming.json()) as ApiResponse;
        setUpcoming(data.items ?? []);
      }
      if (resPast.ok) {
        const data = (await resPast.json()) as ApiResponse;
        setPast(data.items ?? []);
      }

      setStartsAt("");
      setDurationMin("45");
      setClientEmail("");
      setLocationUrl("");
      setNotes("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Card className="p-4">
          <div className="text-sm font-medium text-danger">Erreur</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-text">
            {error}
          </div>
        </Card>
      ) : null}

      <Card className="p-4">
        <div className="text-base font-semibold text-navy">Nouveau meeting</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <div className="text-xs text-muted">Date & heure</div>
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div>
            <div className="text-xs text-muted">Durée (min)</div>
            <Input
              type="number"
              min={15}
              step={15}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
            />
          </div>
          <div className="sm:col-span-3">
            <div className="text-xs text-muted">Email client</div>
            <Input
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@exemple.com"
            />
          </div>
          <div className="sm:col-span-3">
            <div className="text-xs text-muted">Lien (Zoom/Meet…)</div>
            <Input
              value={locationUrl}
              onChange={(e) => setLocationUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="sm:col-span-3">
            <div className="text-xs text-muted">Notes internes</div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Agenda, documents à préparer, points à valider…"
            />
          </div>
        </div>
        <div className="mt-3">
          <Button onClick={createMeeting} disabled={creating}>
            Créer
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="text-base font-semibold text-navy">À venir</div>
          <div className="mt-3 space-y-4">
            {loading ? (
              <div className="text-sm text-muted">Chargement…</div>
            ) : upcoming.length ? (
              upcomingByDay.map(([day, list]) => (
                <div key={day} className="space-y-2">
                  <div className="text-xs font-medium text-muted">{day}</div>
                  <div className="space-y-2">
                    {list.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-navy">
                              {m.client.fullName}
                            </div>
                            <div className="text-xs text-muted">
                              {formatDateTime(m.startsAt)} • {m.durationMin} min
                            </div>
                            <div className="mt-1 text-xs text-muted">
                              {m.client.email}
                            </div>
                          </div>
                          {m.locationUrl ? (
                            <a
                              className="text-xs text-primary hover:underline"
                              href={m.locationUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Lien
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted">Aucun meeting à venir.</div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-base font-semibold text-navy">Historique</div>
          <div className="mt-3 space-y-2">
            {loading ? (
              <div className="text-sm text-muted">Chargement…</div>
            ) : past.length ? (
              past.map((m) => (
                <div
                  key={m.id}
                  className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3"
                >
                  <div className="text-sm font-semibold text-navy">
                    {m.client.fullName}
                  </div>
                  <div className="text-xs text-muted">
                    {formatDateTime(m.startsAt)} • {m.durationMin} min
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted">Aucun meeting passé.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
