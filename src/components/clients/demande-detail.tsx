"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { AvatarBubble } from "@/components/ui/avatar-bubble";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

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
  payment: null | {
    orderId: string;
    status: "DRAFT" | "PENDING_PAYMENT" | "PAID" | "CANCELED" | "REFUNDED";
    amountCents: number;
    currency: string;
    serviceTitle: string;
  };
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

type ApiResponse = { item: DemandeItem };

type Action = "ACCEPT" | "REJECT" | "NEEDS_INFO";

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

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function DemandeDetail({ requestId }: { requestId: string }) {
  const [item, setItem] = useState<DemandeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [proNote, setProNote] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [durationMin, setDurationMin] = useState("45");
  const [locationUrl, setLocationUrl] = useState("");

  const [services, setServices] = useState<Array<{ id: string; title: string; priceCents: number; currency: string }>>([]);
  const [serviceId, setServiceId] = useState("");
  const [paymentBusy, setPaymentBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/demandes/${requestId}`, {
        method: "GET",
        headers: { "content-type": "application/json" },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as ApiResponse;
      setItem(data.item);
      setProNote(data.item.proNote ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  useEffect(() => {
    // best-effort: catalogue de services (global + pro)
    fetch("/api/payments/services")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: null | { items: Array<{ id: string; title: string; priceCents: number; currency: string }> }) => {
        if (!data) return;
        setServices(data.items);
        setServiceId((prev) => prev || data.items[0]?.id || "");
      })
      .catch(() => null);
  }, []);

  function money(amountCents: number, currency: string) {
    const amount = amountCents / 100;
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  async function createPaymentOrder() {
    if (!item) return;
    if (!serviceId) throw new Error("Choisissez un service.");

    setPaymentBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ marketplaceRequestId: item.id, serviceId }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setPaymentBusy(false);
    }
  }

  async function act(action: Action) {
    if (!item) return;

    setBusy(true);
    setError(null);
    try {
      const payload: {
        action: Action;
        proNote?: string | null;
        startsAt?: string;
        durationMin?: number;
        locationUrl?: string | null;
      } = {
        action,
        proNote: proNote.trim() || null,
      };

      if (action === "ACCEPT") {
        if (!startsAt) throw new Error("Choisissez une date/heure pour accepter.");
        payload.startsAt = new Date(startsAt).toISOString();
        payload.durationMin = Math.max(15, Number(durationMin) || 45);
        payload.locationUrl = locationUrl.trim() || null;
      }

      const res = await fetch(`/api/clients/demandes/${item.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy">Demande Marketplace</h2>
          <div className="mt-1 text-sm text-muted">Détail et actions.</div>
        </div>
        <Link href="/clients/demandes">
          <Button variant="outline">Retour</Button>
        </Link>
      </div>

      {error ? (
        <Card className="p-4">
          <div className="text-sm font-medium text-danger">Erreur</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-text">{error}</div>
        </Card>
      ) : null}

      {loading || !item ? (
        <Card className="p-6">
          <div className="text-sm text-muted">Chargement…</div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <AvatarBubble name={item.requester.fullName} url={item.requester.avatarUrl} size="lg" />
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold text-navy">{item.requester.fullName}</div>
                <div className="mt-2">{badge(item.status)}</div>
                <div className="mt-2 text-sm text-muted">
                  {item.topicLabel}
                  {item.urgency ? ` • Urgence: ${item.urgency}` : ""}
                  {item.preferredTimeframe ? ` • Préférence: ${item.preferredTimeframe}` : ""}
                </div>
                <div className="mt-1 text-xs text-muted">Reçue: {formatDateTime(item.createdAt)}</div>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-xs text-muted">ID</div>
              <div className="mt-1 font-mono text-xs text-text">{item.id}</div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-muted">Message demandeur</div>
              <div className="mt-2 rounded-[var(--radius-md)] border border-border bg-white/60 p-3 text-sm text-text">
                {item.message ? <div className="whitespace-pre-wrap">{item.message}</div> : <div className="text-muted">(Pas de message)</div>}
              </div>

              {item.cv ? (
                <div className="mt-3 rounded-[var(--radius-md)] border border-border bg-white/60 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-navy">CV</div>
                    <div className="text-xs text-muted">{formatDateTime(item.cv.createdAt)}</div>
                  </div>
                  <a className="mt-2 inline-block underline" href={item.cv.url} target="_blank" rel="noreferrer">
                    {item.cv.name}
                  </a>
                </div>
              ) : null}

              {item.meeting ? (
                <div className="mt-3 rounded-[var(--radius-md)] border border-border bg-white/60 p-3 text-sm">
                  <div className="font-semibold text-navy">Meeting créé</div>
                  <div className="mt-1 text-muted">
                    {formatDateTime(item.meeting.startsAt)} • {item.meeting.durationMin} min
                    {item.meeting.locationUrl ? ` • ${item.meeting.locationUrl}` : ""}
                  </div>
                  {item.meeting.locationUrl ? (
                    <a className="mt-2 inline-block underline" href={item.meeting.locationUrl} target="_blank" rel="noreferrer">
                      Ouvrir le lien
                    </a>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-3 rounded-[var(--radius-md)] border border-border bg-white/60 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-navy">Paiement</div>
                  <div className="text-xs text-muted">
                    {item.payment ? `Statut: ${item.payment.status}` : "Aucune demande de paiement"}
                  </div>
                </div>

                {item.payment ? (
                  <div className="mt-2 text-sm text-text">
                    {item.payment.serviceTitle} • {money(item.payment.amountCents, item.payment.currency)}
                  </div>
                ) : (
                  <div className="mt-2 grid gap-2">
                    <label className="text-xs font-semibold text-muted">Service à facturer</label>
                    <select
                      className="h-10 rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
                      value={serviceId}
                      onChange={(e) => setServiceId(e.target.value)}
                      disabled={paymentBusy || busy}
                    >
                      {services.length === 0 ? (
                        <option value="">Aucun service</option>
                      ) : (
                        services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title} — {money(s.priceCents, s.currency)}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        disabled={paymentBusy || busy || !serviceId || services.length === 0}
                        onClick={() => void createPaymentOrder()}
                      >
                        Créer une demande de paiement
                      </Button>
                    </div>
                    <div className="text-xs text-muted">
                      Le paiement débloque le suivi (meeting/dossier/docs) selon la prestation.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-muted">Note pro (optionnelle)</div>
              <Textarea
                value={proNote}
                onChange={(e) => setProNote(e.target.value)}
                rows={5}
                placeholder="Réponse, éléments à vérifier, infos demandées…"
              />

              <div className="mt-4">
                <div className="text-xs font-semibold text-muted">Acceptation → planifier</div>
                <div className="mt-2 grid gap-2">
                  <Input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    placeholder="Date/heure"
                    disabled={!!item.meeting}
                  />
                  <Input
                    type="number"
                    min={15}
                    step={15}
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    placeholder="Durée (min)"
                    disabled={!!item.meeting}
                  />
                  <Input
                    value={locationUrl}
                    onChange={(e) => setLocationUrl(e.target.value)}
                    placeholder="Lien visio (optionnel)"
                    disabled={!!item.meeting}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <Button variant="outline" disabled={busy} onClick={() => act("NEEDS_INFO")}>
                  Demander des infos
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => act("REJECT")}>
                  Refuser
                </Button>
                <Button disabled={busy || !!item.meeting} onClick={() => act("ACCEPT")}>
                  Accepter & créer meeting
                </Button>
              </div>

              {item.status === "ACCEPTED" && item.meeting ? (
                <div className="mt-2 text-xs text-muted">(Déjà acceptée. Modifiez le meeting via l’onglet Meetings.)</div>
              ) : null}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
