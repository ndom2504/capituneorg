"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AvatarBubble } from "@/components/ui/avatar-bubble";
import { VerifiedBadgeInline } from "@/components/marketplace/verified-badge";
import { cn } from "@/lib/cn";
import {
  NEEDS,
  SERVICE_CATEGORIES,
  SERVICES_PICKER,
  needLabel,
  serviceLabel,
  type NeedId,
  type ServiceCategoryId,
} from "@/lib/taxonomy";
import type { VerificationStatus, ProfileBadgeType } from "@prisma/client";

type MarketplaceItem = {
  professionalId: string;
  profileId: string;
  fullName: string;
  avatarUrl: string | null;
  profession: string;
  professionLabel: string;
  headline: string | null;
  organization: string | null;
  country: string;
  city: string;
  languages: string[];
  themes: string[];
  specialties: string[];
  isVerified: boolean; // Legacy
  verificationStatus: VerificationStatus;
  badges: ProfileBadgeType[] | null;
  format: string;
  pricingMode: string;
  price30Min: number | null;
  price60Min: number | null;
  bioShort: string | null;
  services: string[];
  matchScore: number | null;
  matchedNeeds: string[];
  matchedServices: string[];
};

type ListResponse = { items: MarketplaceItem[] };

type RequestTopic =
  | "ETUDES"
  | "TRAVAIL"
  | "ENTREPRENEUR"
  | "DOCUMENTS"
  | "BUDGET"
  | "INSTALLATION"
  | "ORIENTATION"
  | "IMMIGRATION"
  | "FAMILLE"
  | "INTEGRATION"
  | "FORMATION"
  | "AUTRE";

type RequestUrgency = "LOW" | "MEDIUM" | "HIGH";

function formatMoney(amount: number) {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function chip(text: string) {
  return (
    <span className="rounded-full border border-border/80 bg-white/70 px-2 py-0.5 text-xs text-muted shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      {text}
    </span>
  );
}

export function MarketplaceList() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [profession, setProfession] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [needs, setNeeds] = useState<NeedId[]>([]);

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [serviceCategory, setServiceCategory] = useState<ServiceCategoryId>(SERVICE_CATEGORIES[0]?.id);
  const [serviceToAdd, setServiceToAdd] = useState<string>("");

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestTarget, setRequestTarget] = useState<MarketplaceItem | null>(null);
  const [primaryNeed, setPrimaryNeed] = useState<NeedId>("need.orientation");
  const [urgency, setUrgency] = useState<RequestUrgency>("MEDIUM");
  const [preferredTimeframe, setPreferredTimeframe] = useState("");
  const [message, setMessage] = useState("");
  const [attachPreRegistration, setAttachPreRegistration] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  function toggleNeed(id: NeedId) {
    setNeeds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const servicesForCategory = useMemo(() => {
    return SERVICES_PICKER.filter((s) => s.category === serviceCategory);
  }, [serviceCategory]);

  useEffect(() => {
    setServiceToAdd(servicesForCategory[0]?.id ?? "");
  }, [servicesForCategory]);

  function addService() {
    if (!serviceToAdd) return;
    setSelectedServices((prev) => {
      if (prev.includes(serviceToAdd)) return prev;
      if (prev.length >= 3) return prev;
      return [...prev, serviceToAdd];
    });
  }

  function removeService(id: string) {
    setSelectedServices((prev) => prev.filter((x) => x !== id));
  }

  function needToTopic(n: NeedId): RequestTopic {
    switch (n) {
      case "need.etudes":
        return "ETUDES";
      case "need.travail":
      case "need.recherche-emploi":
        return "TRAVAIL";
      case "need.entrepreneuriat":
        return "ENTREPRENEUR";
      case "need.documents":
        return "DOCUMENTS";
      case "need.budget":
        return "BUDGET";
      case "need.orientation":
        return "ORIENTATION";
      case "need.immigration":
        return "IMMIGRATION";
      case "need.famille":
        return "FAMILLE";
      case "need.integration":
        return "INTEGRATION";
      case "need.formation":
        return "FORMATION";
      default:
        return "AUTRE";
    }
  }

  useEffect(() => {
    let canceled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (profession) params.set("profession", profession);
        if (verifiedOnly) params.set("verified", "true");
        if (needs.length) params.set("needs", needs.join(","));
        if (selectedServices.length) params.set("services", selectedServices.join(","));
        const res = await fetch(`/api/marketplace/professionals?${params.toString()}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as ListResponse;
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
  }, [q, profession, verifiedOnly, needs, selectedServices]);

  const professions = useMemo(() => {
    const set = new Map<string, string>();
    for (const it of items) set.set(it.profession, it.professionLabel);
    return Array.from(set.entries()).sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [items]);

  async function uploadCv(file: File) {
    setCvUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/marketplace/cv", { method: "POST", body: form });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const payload = (await res.json()) as { url?: string; fileName?: string; error?: string };
      if (!payload.url) throw new Error(payload.error || "Upload impossible.");
      return { url: payload.url, fileName: payload.fileName ?? file.name };
    } finally {
      setCvUploading(false);
    }
  }

  async function submitRequest() {
    if (!requestTarget) return;
    setRequestBusy(true);
    setRequestSuccess(null);
    setRequestError(null);
    try {
      const cv = cvFile ? await uploadCv(cvFile) : null;

      const res = await fetch("/api/marketplace/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          professionalId: requestTarget.professionalId,
          topic: needToTopic(primaryNeed),
          urgency,
          preferredTimeframe: preferredTimeframe.trim() || undefined,
          message: message.trim() || undefined,
          cvUrl: cv?.url,
          cvFileName: cv?.fileName,
          attachPreRegistration,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const payload = (await res.json()) as { ok?: boolean; request?: { id: string } };
      setRequestSuccess(payload.request?.id ?? "Demande envoyée");
      setPreferredTimeframe("");
      setMessage("");
      setCvFile(null);
      setAttachPreRegistration(false);
    } catch (e) {
      setRequestError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setRequestBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full">
            <div className="text-xs font-semibold text-muted">Recherche</div>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nom, spécialité, organisation, ville…"
            />
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div>
              <div className="text-xs font-semibold text-muted">Métier</div>
              <select
                className="h-10 rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
              >
                <option value="">Tous</option>
                {professions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
              />
              Vérifiés
            </label>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-semibold text-muted">Besoins (optionnel)</div>
              <div className="text-xs text-muted">
                Sélectionnez 1–3 besoins pour trier par pertinence.
              </div>
            </div>
            {needs.length ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNeeds([])}
                className="w-full sm:w-auto"
              >
                Réinitialiser
              </Button>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {NEEDS.map((n) => {
              const active = needs.includes(n.id);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => toggleNeed(n.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors",
                    active
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border bg-white/70 text-text hover:bg-white",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px]",
                      active ? "border-primary/30 bg-primary/15" : "border-border bg-white",
                    )}
                  >
                    {active ? "✓" : "+"}
                  </span>
                  {n.label}
                </button>
              );
            })}
          </div>

          {needs.length ? (
            <div className="mt-2 text-xs text-muted">
              Vos besoins: {needs.map((id) => needLabel(id)).join(" • ")}
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-semibold text-muted">Services (optionnel)</div>
              <div className="text-xs text-muted">
                Sélectionnez jusqu’à 3 services pour filtrer.
              </div>
            </div>
            {selectedServices.length ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedServices([])}
                className="w-full sm:w-auto"
              >
                Réinitialiser
              </Button>
            ) : null}
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
            <div>
              <div className="text-xs font-semibold text-muted">Catégorie</div>
              <select
                aria-label="Catégorie de service"
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value as ServiceCategoryId)}
              >
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs font-semibold text-muted">Service</div>
              <select
                aria-label="Service"
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
                value={serviceToAdd}
                onChange={(e) => setServiceToAdd(e.target.value)}
                disabled={!servicesForCategory.length}
              >
                {servicesForCategory.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Button
                type="button"
                onClick={addService}
                disabled={!serviceToAdd || selectedServices.length >= 3}
                className="w-full sm:w-auto"
              >
                Ajouter
              </Button>
            </div>
          </div>

          {selectedServices.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedServices.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => removeService(id)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-3 py-1 text-xs text-text hover:bg-white"
                  aria-label={`Retirer ${serviceLabel(id)}`}
                  title="Retirer"
                >
                  <span className="font-semibold text-navy">{serviceLabel(id)}</span>
                  <span className="text-muted">✕</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-2 text-xs text-muted">
          {loading ? "Chargement…" : `${items.length} profil(s) trouvé(s)`}
        </div>
      </Card>

      {error ? (
        <Card className="p-4">
          <div className="text-sm font-medium text-danger">Erreur</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-text">{error}</div>
        </Card>
      ) : null}

      {/* succès affiché dans la modale (évite la duplication ici) */}

      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((it) => (
          <Card
            key={it.profileId}
            className={cn(
              "p-4",
              "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60",
              "shadow-sm transition-shadow hover:shadow-md",
            )}
          >
            <div className="flex h-full flex-col items-center gap-3 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-full border border-border bg-white p-1 shadow-sm">
                  <AvatarBubble 
                    name={it.fullName} 
                    url={it.avatarUrl} 
                    size="xxl" 
                    className="border-0"
                    showOnline={true}
                    userId={it.professionalId}
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    <div className="text-base font-semibold text-navy">{it.fullName}</div>
                    <VerifiedBadgeInline 
                      verificationStatus={it.verificationStatus}
                      badges={it.badges}
                    />
                  </div>
                  <div className="mt-1 text-sm text-muted">
                    {it.professionLabel}
                    {it.organization ? ` • ${it.organization}` : ""}
                  </div>
                  {it.headline ? (
                    <div className="mt-2 text-sm text-text">{it.headline}</div>
                  ) : null}
                  <div className="mt-1 text-xs text-muted">
                    {it.city}, {it.country} • {it.languages.slice(0, 3).join(", ") || "—"}
                  </div>
                </div>
              </div>

              <div className="w-full">
                <div className="flex flex-wrap justify-center gap-2">
                  {typeof it.matchScore === "number" ? (
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-xs font-semibold",
                        it.matchScore >= 0.67
                          ? "border-green-200 bg-green-50 text-green-700"
                          : it.matchScore >= 0.34
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-border bg-white/70 text-muted",
                      )}
                    >
                      Pertinence: {Math.round(it.matchScore * 100)}%
                    </span>
                  ) : null}

                  {typeof it.matchScore === "number"
                    ? it.matchedServices.slice(0, 2).map((s) => (
                        <span key={s}>{chip(serviceLabel(s))}</span>
                      ))
                    : null}

                  {it.specialties.slice(0, 3).map((s) => (
                    <span key={s}>{chip(s)}</span>
                  ))}
                  {it.themes.slice(0, 2).map((t) => (
                    <span key={t}>{chip(t)}</span>
                  ))}
                </div>

                {it.pricingMode === "PAID" && (it.price30Min || it.price60Min) ? (
                  <div className="mt-3 text-sm text-text">
                    <span className="text-muted">À partir de:</span>{" "}
                    <span className="font-semibold">
                      {it.price30Min ? formatMoney(it.price30Min) : formatMoney(it.price60Min ?? 0)}
                    </span>
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-muted">Premier échange: gratuit (selon profil)</div>
                )}
              </div>

              <div className="mt-auto w-full">
                <div className="my-1 h-px w-full bg-border/60" />
                <div className="grid w-full grid-cols-2 gap-2">
                <Link href={`/marketplace/${it.professionalId}`} className="w-full">
                  <Button variant="outline" className="w-full bg-white/70 hover:bg-white">
                    Voir le profil
                  </Button>
                </Link>
                <Button
                  className="w-full"
                  onClick={() => {
                    setRequestTarget(it);
                    setRequestOpen(true);
                    setRequestSuccess(null);
                    setRequestError(null);
                    setPrimaryNeed(needs[0] ?? "need.orientation");
                  }}
                >
                  Demander un rendez-vous
                </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {!loading && !items.length ? (
          <Card className="p-6">
            <div className="text-sm text-muted">Aucun profil publié.</div>
          </Card>
        ) : null}
      </div>

      {requestOpen && requestTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl">
            <Card className="p-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-full border border-border bg-white p-1 shadow-sm">
                    <AvatarBubble
                      name={requestTarget.fullName}
                      url={requestTarget.avatarUrl}
                      size="lg"
                      className="border-0"
                    />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-navy">Demander un rendez-vous</div>
                    <div className="mt-1 text-sm text-muted">
                      {requestTarget.fullName} • {requestTarget.professionLabel}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={cn(
                    "rounded-[var(--radius-md)] border border-border bg-white/70 px-2 py-1 text-sm text-text hover:bg-white",
                  )}
                  onClick={() => {
                    setRequestOpen(false);
                    setRequestTarget(null);
                    setRequestSuccess(null);
                  }}
                >
                  ✕
                </button>
              </div>

              {requestSuccess ? (
                <div className="mt-4 rounded-[var(--radius-md)] border border-border bg-white/70 p-4">
                  <div className="text-sm font-semibold text-navy">Demande envoyée</div>
                  <div className="mt-1 text-sm text-muted">
                    Le professionnel la verra dans <span className="font-semibold">Clients → Demandes</span>.
                  </div>
                  <div className="mt-3 text-xs text-muted">ID: {requestSuccess}</div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Link href={`/marketplace/mes-demandes/${requestSuccess}`}>
                      <Button variant="outline" className="w-full sm:w-auto">
                        Voir ma demande
                      </Button>
                    </Link>
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setRequestOpen(false);
                        setRequestTarget(null);
                        setRequestSuccess(null);
                      }}
                    >
                      Fermer
                    </Button>
                  </div>
                </div>
              ) : (
                <>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold text-muted">Besoin principal</div>
                  <select
                    className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
                    value={primaryNeed}
                    onChange={(e) => setPrimaryNeed(e.target.value as NeedId)}
                  >
                    {NEEDS.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted">Urgence</div>
                  <select
                    className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as RequestUrgency)}
                  >
                    <option value="LOW">Basse</option>
                    <option value="MEDIUM">Moyenne</option>
                    <option value="HIGH">Haute</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs font-semibold text-muted">Contraintes / disponibilités (optionnel)</div>
                  <Input
                    value={preferredTimeframe}
                    onChange={(e) => setPreferredTimeframe(e.target.value)}
                    placeholder="Ex: après 18h, week-end, cette semaine…"
                  />
                  <div className="mt-1 text-xs text-muted">
                    Le professionnel vous proposera un créneau selon ses disponibilités.
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs font-semibold text-muted">CV (optionnel)</div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="block w-full text-sm text-text file:mr-3 file:rounded-[var(--radius-md)] file:border file:border-border file:bg-white/70 file:px-3 file:py-2 file:text-sm file:text-text hover:file:bg-white"
                    onChange={(e) => {
                      const f = e.currentTarget.files?.[0] ?? null;
                      setCvFile(f);
                    }}
                  />
                  {cvFile ? (
                    <div className="mt-1 text-xs text-muted">
                      Sélectionné: <span className="font-medium text-text">{cvFile.name}</span>
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-muted">Formats: PDF/DOC/DOCX (max 10MB).</div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs font-semibold text-muted">Message (optionnel)</div>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    placeholder="Décrivez brièvement votre situation. (Pas d’email/numéro: la communication reste encadrée.)"
                  />
                </div>
              </div>

              <label className="mt-3 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={attachPreRegistration}
                  onChange={(e) => setAttachPreRegistration(e.target.checked)}
                />
                <span className="text-muted">
                  Joindre mon formulaire de demande
                  <span className="block text-xs">
                    Un résumé (objectif, situation, budget, contraintes) sera ajouté à la demande.
                  </span>
                </span>
              </label>

              <div className="mt-4 flex items-center justify-between gap-2">
                <div className="text-xs text-muted">
                  Aucun chat direct: le pro répond via Demandes.
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRequestOpen(false);
                      setRequestTarget(null);
                      setRequestSuccess(null);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button onClick={submitRequest} disabled={requestBusy || cvUploading}>
                    Envoyer
                  </Button>
                </div>
              </div>

              {requestError ? (
                <div className="mt-3 text-sm text-danger">{requestError}</div>
              ) : null}
                </>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
