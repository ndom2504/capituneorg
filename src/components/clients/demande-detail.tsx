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

type ApiResponse = {
  item: DemandeItem;
  canonicalRequestId?: string;
  resolvedFromId?: string | null;
  resolvedFrom?: "message" | "meeting" | "profile" | null;
};

type EngagementDto = {
  id: string;
  status:
    | "DRAFT"
    | "CONTRACT_SENT"
    | "SIGNED"
    | "PAYMENT_REQUESTED"
    | "PAID"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELED";
  contractTitle: string;
  contractBody: string;
  contractSentAt: string | null;
  signedAt: string | null;
  signedByUserId: string | null;
  signedByName: string | null;
  paymentRequestedAt: string | null;
  paidAt: string | null;
  milestone: "ANALYSE" | "DOSSIER" | "SOUMISSION";
  analyseDoneAt: string | null;
  dossierDoneAt: string | null;
  soumissionDoneAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type EngagementApi = {
  engagement: EngagementDto | null;
  payment:
    | null
    | {
        orderId: string;
        status: "DRAFT" | "PENDING_PAYMENT" | "PAID" | "CANCELED" | "REFUNDED";
        amountCents: number;
        currency: string;
        paidAt: string | null;
        service: { id: string; title: string };
        createdAt: string;
      };
};

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

  const [engagement, setEngagement] = useState<EngagementDto | null>(null);
  const [engLoading, setEngLoading] = useState(false);
  const [engBusy, setEngBusy] = useState(false);
  const [engError, setEngError] = useState<string | null>(null);
  const [contractTitle, setContractTitle] = useState("Contrat de prestation");
  const [contractBody, setContractBody] = useState("");

  const safeRequestId = typeof requestId === "string" ? requestId.trim() : "";

  const errorInfo = (() => {
    if (!error) return null;
    try {
      const parsed = JSON.parse(error) as { error?: string };
      if (parsed && typeof parsed.error === "string") return parsed.error;
      return null;
    } catch {
      return null;
    }
  })();

  const altHostUrl = (() => {
    if (typeof window === "undefined") return null;
    const { protocol, host, pathname, search } = window.location;
    if (host === "www.capitune.com") {
      return `${protocol}//capitune.com${pathname}${search}`;
    }
    if (host === "capitune.com") {
      return `${protocol}//www.capitune.com${pathname}${search}`;
    }
    return null;
  })();

  const [proNote, setProNote] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [durationMin, setDurationMin] = useState("45");
  const [locationUrl, setLocationUrl] = useState("");

  const [services, setServices] = useState<Array<{ id: string; title: string; priceCents: number; currency: string }>>([]);
  const [serviceId, setServiceId] = useState("");
  const [paymentBusy, setPaymentBusy] = useState(false);

  async function refresh() {
    if (!safeRequestId || safeRequestId === "undefined" || safeRequestId === "null") {
      setItem(null);
      setLoading(false);
      setError(JSON.stringify({ error: "Lien invalide: ID de demande manquant." }));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/demandes/${safeRequestId}`, {
        method: "GET",
        cache: "no-store",
        headers: { "content-type": "application/json" },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as ApiResponse;
      setItem(data.item);
      setProNote(data.item.proNote ?? "");

      // Charger la prestation (best-effort)
      void loadEngagement();

      // Si le backend a résolu l'ID (ex: lien notification contient un profileId), on canonise l'URL.
      if (
        typeof window !== "undefined" &&
        data.canonicalRequestId &&
        data.canonicalRequestId !== safeRequestId
      ) {
        window.history.replaceState(null, "", `/clients/demandes/${data.canonicalRequestId}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function loadEngagement() {
    if (!safeRequestId || safeRequestId === "undefined" || safeRequestId === "null") return;
    setEngLoading(true);
    setEngError(null);
    try {
      const res = await fetch(`/api/clients/demandes/${safeRequestId}/engagement`, {
        method: "GET",
        cache: "no-store",
        headers: { "content-type": "application/json" },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as EngagementApi;
      setEngagement(data.engagement ?? null);
      if (data.engagement) {
        setContractTitle(data.engagement.contractTitle || "Contrat de prestation");
        setContractBody(data.engagement.contractBody || "");
      }
    } catch (e) {
      setEngError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setEngLoading(false);
    }
  }

  async function engagementAction(payload: any) {
    if (!safeRequestId) return;
    setEngBusy(true);
    setEngError(null);
    try {
      const res = await fetch(`/api/clients/demandes/${safeRequestId}/engagement`, {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { engagement?: EngagementDto };
      if (data.engagement) {
        setEngagement(data.engagement);
        setContractTitle(data.engagement.contractTitle || contractTitle);
        setContractBody(data.engagement.contractBody || contractBody);
      }
    } catch (e) {
      setEngError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setEngBusy(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeRequestId]);

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
          <div className="text-lg font-semibold text-navy">Demande</div>
          <div className="mt-1 text-sm text-muted">Détail et actions.</div>
        </div>
        <a
          href="/clients/demandes"
          className={cn(
            "inline-flex h-10 items-center justify-center gap-2 rounded-(--radius-md) px-4 text-sm font-semibold",
            "border border-border bg-white text-text shadow-sm transition-[color,background-color,border-color,box-shadow,transform]",
            "hover:-translate-y-px hover:bg-white hover:shadow-md active:translate-y-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          Retour
        </a>
      </div>

      {error ? (
        <Card className="p-4">
          <div className="text-sm font-medium text-danger">Erreur</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-text">{errorInfo ?? error}</div>

          {errorInfo?.includes("Demande introuvable") ? (
            <div className="mt-3 space-y-2 text-sm text-muted">
              <div>
                Si la demande a bien été envoyée, il s’agit souvent d’un décalage d’environnement
                (domaine <span className="font-semibold">www</span> vs <span className="font-semibold">sans www</span>).
              </div>
              {altHostUrl ? (
                <a className="inline-block underline" href={altHostUrl}>
                  Essayer sur l’autre domaine
                </a>
              ) : null}
              <div>
                <Link className="underline" href="/clients/demandes">
                  Retour à la liste des demandes
                </Link>
              </div>
            </div>
          ) : null}
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
              <div className="mt-2 rounded-(--radius-md) border border-border bg-white/60 p-3 text-sm text-text">
                {item.message ? <div className="whitespace-pre-wrap">{item.message}</div> : <div className="text-muted">(Pas de message)</div>}
              </div>

              {item.cv ? (
                <div className="mt-3 rounded-(--radius-md) border border-border bg-white/60 p-3 text-sm">
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
                <div className="mt-3 rounded-(--radius-md) border border-border bg-white/60 p-3 text-sm">
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

              <div className="mt-3 rounded-(--radius-md) border border-border bg-white/60 p-3 text-sm">
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
                    <label htmlFor="serviceId" className="text-xs font-semibold text-muted">
                      Service à facturer
                    </label>
                    <select
                      id="serviceId"
                      className="h-10 rounded-(--radius-md) border border-border bg-white/70 px-3 text-sm text-text"
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

              <div className="mt-3 rounded-(--radius-md) border border-border bg-white/60 p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-navy">Prestation</div>
                    <div className="mt-1 text-xs text-muted">
                      Contrat obligatoire + jalons (Analyse → Dossier → Soumission).
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted">Statut</div>
                    <div className="mt-0.5 text-xs font-semibold text-text">
                      {engagement ? engagement.status : engLoading ? "…" : "Aucune"}
                    </div>
                  </div>
                </div>

                {engError ? <div className="mt-2 whitespace-pre-wrap text-xs text-danger">{engError}</div> : null}

                {!engagement ? (
                  <div className="mt-3 flex items-center justify-end">
                    <Button
                      variant="outline"
                      disabled={engBusy || engLoading || busy || !item || item.status !== "ACCEPTED"}
                      onClick={() => void engagementAction({ action: "CREATE" })}
                    >
                      Créer la prestation
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-muted">Titre du contrat</label>
                      <Input
                        value={contractTitle}
                        onChange={(e) => setContractTitle(e.target.value)}
                        disabled={engBusy || engagement.status !== "DRAFT"}
                      />
                      <label className="text-xs font-semibold text-muted">Contrat (texte)</label>
                      <Textarea
                        value={contractBody}
                        onChange={(e) => setContractBody(e.target.value)}
                        rows={6}
                        placeholder="Définition des termes, périmètre, délais, livrables, conditions…"
                        disabled={engBusy || engagement.status !== "DRAFT"}
                      />
                    </div>

                    {engagement.signedAt ? (
                      <div className="text-xs text-muted">
                        Signé: {formatDateTime(engagement.signedAt)}
                        {engagement.signedByName ? ` • ${engagement.signedByName}` : ""}
                      </div>
                    ) : engagement.status === "CONTRACT_SENT" ? (
                      <div className="text-xs text-muted">En attente de signature du demandeur.</div>
                    ) : null}

                    {engagement.status === "DRAFT" ? (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          disabled={engBusy}
                          onClick={() =>
                            void engagementAction({
                              action: "UPDATE_DRAFT",
                              contractTitle,
                              contractBody,
                            })
                          }
                        >
                          Enregistrer
                        </Button>
                        <Button
                          disabled={engBusy || !(contractBody || "").trim()}
                          onClick={() => void engagementAction({ action: "SEND_CONTRACT" })}
                        >
                          Envoyer le contrat
                        </Button>
                      </div>
                    ) : null}

                    {engagement.status === "SIGNED" ||
                    engagement.status === "IN_PROGRESS" ||
                    engagement.status === "PAID" ||
                    engagement.status === "PAYMENT_REQUESTED" ? (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-muted">Jalons</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            disabled={engBusy}
                            onClick={() =>
                              void engagementAction({ action: "ADVANCE_MILESTONE", milestone: "ANALYSE" })
                            }
                          >
                            Analyse
                          </Button>
                          <Button
                            variant="outline"
                            disabled={engBusy}
                            onClick={() =>
                              void engagementAction({ action: "ADVANCE_MILESTONE", milestone: "DOSSIER" })
                            }
                          >
                            Dossier
                          </Button>
                          <Button
                            variant="outline"
                            disabled={engBusy}
                            onClick={() =>
                              void engagementAction({ action: "ADVANCE_MILESTONE", milestone: "SOUMISSION" })
                            }
                          >
                            Soumission
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {engagement.status === "SIGNED" ||
                    engagement.status === "IN_PROGRESS" ||
                    engagement.status === "PAID" ||
                    engagement.status === "PAYMENT_REQUESTED" ? (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          disabled={engBusy}
                          onClick={() => void engagementAction({ action: "REQUEST_PAYMENT" })}
                        >
                          Demander le paiement
                        </Button>
                        <Button
                          disabled={engBusy || !engagement.soumissionDoneAt}
                          onClick={() => void engagementAction({ action: "COMPLETE" })}
                        >
                          Terminer
                        </Button>
                      </div>
                    ) : null}
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
