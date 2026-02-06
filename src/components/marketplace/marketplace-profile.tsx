"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AvatarBubble } from "@/components/ui/avatar-bubble";
import { VerifiedBadge } from "@/components/marketplace/verified-badge";
import { NEEDS, type NeedId } from "@/lib/taxonomy";
import type { VerificationStatus, ProfileBadgeType } from "@prisma/client";

type ProfileItem = {
  professionalId: string;
  profileId: string;
  fullName: string;
  avatarUrl: string | null;
  isCertified: boolean;
  professionLabel: string;
  headline: string | null;
  organization: string | null;
  country: string;
  city: string;
  languages: string[];
  themes: string[];
  specialties: string[];
  services: string[];
  targetAudiences: string[];
  format: string;
  responseTime: string | null;
  isVerified: boolean; // Legacy
  verificationStatus: VerificationStatus;
  badges: ProfileBadgeType[] | null;
  bioShort: string | null;
  bioLong: string | null;
  employerDetails: string | null;
  pricingMode: string;
  price30Min: number | null;
  price60Min: number | null;
  availability: unknown | null;
};

type ApiResponse = { item: ProfileItem };

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

export function MarketplaceProfile({ professionalId }: { professionalId: string }) {
  const [item, setItem] = useState<ProfileItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [primaryNeed, setPrimaryNeed] = useState<NeedId>("need.orientation");
  const [urgency, setUrgency] = useState<RequestUrgency>("MEDIUM");
  const [preferredTimeframe, setPreferredTimeframe] = useState("");
  const [message, setMessage] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);

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
        const res = await fetch(`/api/marketplace/professionals/${professionalId}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as ApiResponse;
        if (!canceled) setItem(data.item);
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
  }, [professionalId]);

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

  async function sendRequest() {
    if (!item) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const cv = cvFile ? await uploadCv(cvFile) : null;
      const res = await fetch("/api/marketplace/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          professionalId: item.professionalId,
          topic: needToTopic(primaryNeed),
          urgency,
          preferredTimeframe: preferredTimeframe.trim() || undefined,
          message: message.trim() || undefined,
          cvUrl: cv?.url,
          cvFileName: cv?.fileName,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const payload = (await res.json()) as { request?: { id: string } };
      setOk(payload.request?.id ?? "Envoyé");
      setPreferredTimeframe("");
      setMessage("");
      setCvFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted">Chargement…</div>
      </Card>
    );
  }

  if (error || !item) {
    return (
      <Card className="p-6">
        <div className="text-sm font-medium text-danger">Erreur</div>
        <div className="mt-2 text-sm text-text">{error ?? "Profil introuvable."}</div>
        <div className="mt-4">
          <Link href="/marketplace">
            <Button variant="outline">Retour</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/marketplace" className="text-sm text-muted">
          ← Retour
        </Link>
        <VerifiedBadge 
          verificationStatus={item.verificationStatus}
          badges={item.badges}
          showPending={false}
        />
      </div>

      {ok ? (
        <Card className="p-4">
          <div className="text-sm font-medium text-navy">Demande envoyée</div>
          <div className="mt-1 text-sm text-muted">ID: {ok}</div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-full border border-border bg-white p-1 shadow-sm">
                <AvatarBubble 
                  name={item.fullName} 
                  url={item.avatarUrl} 
                  size="xxl" 
                  className="border-0"
                  showOnline={true}
                  userId={item.professionalId}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-xl font-semibold text-navy">{item.fullName}</div>
                  <VerifiedBadge 
                    verificationStatus={item.verificationStatus}
                    badges={item.badges}
                    size="md"
                  />
                </div>
                <div className="mt-1 text-sm text-muted">
                  {item.professionLabel}
                  {item.organization ? ` • ${item.organization}` : ""}
                </div>
                {item.headline ? <div className="mt-2 text-sm text-text">{item.headline}</div> : null}
                <div className="mt-1 text-xs text-muted">
                  {item.city}, {item.country} • {item.languages.join(", ") || "—"}
                </div>
              </div>
            </div>

            {item.bioShort ? <div className="mt-4 text-sm text-text">{item.bioShort}</div> : null}

            {item.bioLong ? (
              <div className="mt-4">
                <div className="text-xs font-semibold text-muted">Présentation</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-text">{item.bioLong}</div>
              </div>
            ) : null}

            {item.employerDetails ? (
              <div className="mt-4">
                <div className="text-xs font-semibold text-muted">Emploi</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-text">{item.employerDetails}</div>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-muted">Spécialités</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.specialties.length ? item.specialties.map((s) => <span key={s}>{chip(s)}</span>) : chip("—")}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted">Services</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.services.length ? item.services.map((s) => <span key={s}>{chip(s)}</span>) : chip("—")}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-muted">Thèmes</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.themes.length ? item.themes.map((t) => <span key={t}>{chip(t)}</span>) : chip("—")}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted">Format</div>
                <div className="mt-2 text-sm text-text">{item.format}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-muted">Tarification</div>
              <div className="mt-1 text-sm text-text">
                {item.pricingMode === "PAID" ? (
                  <>
                    {item.price30Min != null ? `30 min: ${formatMoney(item.price30Min)} ` : ""}
                    {item.price60Min != null ? ` • 60 min: ${formatMoney(item.price60Min)}` : ""}
                  </>
                ) : (
                  "Gratuit (selon profil)"
                )}
              </div>
            </div>

            <div className="mt-4 rounded-[var(--radius-md)] border border-border bg-white/60 p-3 text-xs text-muted">
              Pas de contact direct: les échanges se font via une demande encadrée.
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="text-base font-semibold text-navy">Demander un rendez-vous</div>
            <div className="mt-3 grid gap-3">
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
              <div>
                <div className="text-xs font-semibold text-muted">Préférence horaire</div>
                <Input
                  value={preferredTimeframe}
                  onChange={(e) => setPreferredTimeframe(e.target.value)}
                  placeholder="Ex: après 18h, week-end…"
                />
              </div>
              <div>
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
                  <div className="mt-1 text-xs text-muted">Sélectionné: {cvFile.name}</div>
                ) : (
                  <div className="mt-1 text-xs text-muted">Formats: PDF/DOC/DOCX (max 10MB).</div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-muted">Message (optionnel)</div>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Décrivez brièvement votre situation."
                />
              </div>
              <Button onClick={sendRequest} disabled={busy || cvUploading}>
                Envoyer la demande
              </Button>
              {error ? <div className="text-xs text-danger">{error}</div> : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
