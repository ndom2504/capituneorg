"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { readApiError } from "@/components/pro-content/api";
import { cn } from "@/lib/cn";

type EventStatus = "DRAFT" | "PUBLISHED" | "FULL" | "ENDED" | "CANCELLED";

type ItemResponse = {
  item?: {
    id: string;
    type: "EVENT";
    title: string;
    description: string;
    language: string;

    eventStatus: EventStatus | null;
    eventType: "LIVE" | "ATELIER" | "QA" | null;
    startsAt: string | null;
    durationMin: number | null;
    timezone: string | null;
    liveUrl: string | null;
    replayUrl: string | null;
    capacity: number | null;
    targetRole: "ALL" | "DEMANDEUR" | "PRO" | null;
    imageUrl: string | null;

    isPaid: boolean;
    priceCents: number | null;
    currency: string;
    stripePriceId: string | null;

    createdAt: string;
    updatedAt: string;
    enrollmentsCount?: number;
  };
  error?: string;
};

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ProEventEditor({ contentId, backHref }: { contentId?: string; backHref: string }) {
  const router = useRouter();

  const isEdit = !!contentId;

  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<"fr" | "en">("fr");

  const [eventStatus, setEventStatus] = useState<EventStatus>("DRAFT");
  const [eventType, setEventType] = useState<"LIVE" | "ATELIER" | "QA">("LIVE");
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [durationMin, setDurationMin] = useState<number>(60);
  const [timezone, setTimezone] = useState("America/Toronto");
  const [liveUrl, setLiveUrl] = useState("");
  const [capacity, setCapacity] = useState<string>("");
  const [targetRole, setTargetRole] = useState<"" | "ALL" | "DEMANDEUR" | "PRO">("");
  const [imageUrl, setImageUrl] = useState("");

  const [isPaid, setIsPaid] = useState(false);
  const [priceCents, setPriceCents] = useState<string>("");
  const [currency, setCurrency] = useState("cad");
  const [stripePriceId, setStripePriceId] = useState("");

  const enrollmentsHref = isEdit ? `${backHref}/${contentId}/inscrits` : null;

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (!description.trim()) return false;
    if (!startsAtLocal.trim()) return false;
    if (!timezone.trim()) return false;
    if (!durationMin || durationMin <= 0) return false;

    if (isPaid) {
      const v = Number(priceCents);
      if (!Number.isFinite(v) || v <= 0) return false;
    }

    return true;
  }, [title, description, startsAtLocal, timezone, durationMin, isPaid, priceCents]);

  const load = useCallback(async () => {
    if (!contentId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/clients/content-items/${contentId}`, { cache: "no-store" });
      const data = (await res.json()) as ItemResponse;
      if (!res.ok) {
        setError(data.error ?? (await readApiError(res)));
        return;
      }

      const it = data.item;
      if (!it) {
        setError("Not found.");
        return;
      }

      setTitle(it.title ?? "");
      setDescription(it.description ?? "");
      setLanguage((it.language === "en" ? "en" : "fr") as "fr" | "en");
      setEventStatus((it.eventStatus ?? "DRAFT") as EventStatus);
      setEventType((it.eventType ?? "LIVE") as "LIVE" | "ATELIER" | "QA");
      setStartsAtLocal(toDateTimeLocal(it.startsAt));
      setDurationMin(it.durationMin ?? 60);
      setTimezone(it.timezone ?? "America/Toronto");
      setLiveUrl(it.liveUrl ?? "");
      setCapacity(it.capacity != null ? String(it.capacity) : "");
      setTargetRole((it.targetRole ?? "") as "" | "ALL" | "DEMANDEUR" | "PRO");
      setImageUrl(it.imageUrl ?? "");

      setIsPaid(it.isPaid === true);
      setPriceCents(it.priceCents != null ? String(it.priceCents) : "");
      setCurrency(it.currency ?? "cad");
      setStripePriceId(it.stripePriceId ?? "");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const payload = {
        type: "EVENT" as const,
        title: title.trim(),
        description: description.trim(),
        language,
        eventStatus,
        eventType,
        startsAt: startsAtLocal,
        durationMin,
        timezone: timezone.trim(),
        liveUrl: liveUrl.trim() || null,
        capacity: capacity.trim() ? Number(capacity) : null,
        targetRole: targetRole || null,
        imageUrl: imageUrl.trim() || null,
        isPaid,
        priceCents: isPaid ? Number(priceCents) : null,
        currency: (currency.trim() || "cad").toLowerCase(),
        stripePriceId: stripePriceId.trim() || null,
      };

      const res = await fetch(isEdit ? `/api/clients/content-items/${contentId}` : "/api/clients/content-items", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setError(await readApiError(res));
        return;
      }

      const data = (await res.json().catch(() => null)) as { ok?: boolean; item?: { id?: string } } | null;
      if (!isEdit) {
        const newId = data?.item?.id;
        if (newId) {
          router.replace(`${backHref}/${newId}`);
          router.refresh();
          setInfo("Événement créé.");
          return;
        }
      }

      setInfo("Enregistré.");
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem() {
    if (!contentId) return;
    if (!confirm("Supprimer cet événement ?")) return;

    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const res = await fetch(`/api/clients/content-items/${contentId}`, { method: "DELETE" });
      if (!res.ok) {
        setError(await readApiError(res));
        return;
      }

      router.push(backHref);
      router.refresh();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy">{isEdit ? "Modifier l’événement" : "Nouvel événement"}</h1>
          <p className="mt-1 text-sm text-muted">
            {isEdit ? "Mettez à jour les informations et publiez quand vous êtes prêt." : "Créez un brouillon puis publiez."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={backHref}>
            <Button variant="outline">Retour</Button>
          </Link>
          {enrollmentsHref ? (
            <Link href={enrollmentsHref}>
              <Button variant="outline">Inscrits</Button>
            </Link>
          ) : null}
        </div>
      </div>

      {error ? (
        <Card className="p-4">
          <div className="text-sm font-medium text-danger">Erreur</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-text">{error}</div>
        </Card>
      ) : null}

      {info ? (
        <Card className="p-4">
          <div className="text-sm font-medium text-navy">OK</div>
          <div className="mt-1 text-sm text-text">{info}</div>
        </Card>
      ) : null}

      <Card className={cn("p-0", loading && "opacity-70")}
      >
        <CardHeader>
          <CardTitle>Détails</CardTitle>
          <CardDescription>Champs requis: titre, description, date/heure, durée, fuseau horaire.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-muted">Titre</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Atelier CV" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted">Langue</div>
              <select
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
                value={language}
                onChange={(e) => setLanguage(e.target.value === "en" ? "en" : "fr")}
              >
                <option value="fr">fr</option>
                <option value="en">en</option>
              </select>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Description</div>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Décrivez le contenu et ce que les participants vont obtenir." />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-muted">Statut</div>
              <select
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
                value={eventStatus}
                onChange={(e) => setEventStatus(e.target.value as EventStatus)}
              >
                <option value="DRAFT">Brouillon</option>
                <option value="PUBLISHED">Publié</option>
                <option value="FULL">Complet</option>
                <option value="ENDED">Terminé</option>
                <option value="CANCELLED">Annulé</option>
              </select>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted">Type</div>
              <select
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
                value={eventType}
                onChange={(e) => setEventType(e.target.value as "LIVE" | "ATELIER" | "QA")}
              >
                <option value="LIVE">Live</option>
                <option value="ATELIER">Atelier</option>
                <option value="QA">Q&A</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <div className="text-xs font-semibold text-muted">Début</div>
              <Input type="datetime-local" value={startsAtLocal} onChange={(e) => setStartsAtLocal(e.target.value)} />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted">Durée (min)</div>
              <Input type="number" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} min={1} />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted">Fuseau horaire</div>
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/Toronto" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-muted">Lien live (optionnel)</div>
              <Input value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted">Capacité (optionnel)</div>
              <Input value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Ex: 25" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-muted">Cible (optionnel)</div>
              <select
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as "" | "ALL" | "DEMANDEUR" | "PRO")}
              >
                <option value="">—</option>
                <option value="ALL">Tout le monde</option>
                <option value="DEMANDEUR">Demandeurs</option>
                <option value="PRO">Pros</option>
              </select>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted">Image (optionnel)</div>
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
            </div>
          </div>

          <div className="rounded-(--radius-md) border border-border bg-white/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-navy">Monétisation</div>
                <div className="text-xs text-muted">La publication payante peut être restreinte selon la vérification PRO.</div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
                Payant
              </label>
            </div>

            <div className={cn("mt-3 grid gap-3 sm:grid-cols-3", !isPaid && "opacity-70")}
            >
              <div>
                <div className="text-xs font-semibold text-muted">Prix (cents)</div>
                <Input value={priceCents} onChange={(e) => setPriceCents(e.target.value)} disabled={!isPaid} placeholder="Ex: 2500" />
              </div>
              <div>
                <div className="text-xs font-semibold text-muted">Devise</div>
                <Input value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={!isPaid} placeholder="cad" />
              </div>
              <div>
                <div className="text-xs font-semibold text-muted">Stripe price id (optionnel)</div>
                <Input value={stripePriceId} onChange={(e) => setStripePriceId(e.target.value)} disabled={!isPaid} placeholder="price_…" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void submit()} disabled={!canSubmit || busy || loading}>
              {busy ? "Enregistrement…" : "Enregistrer"}
            </Button>
            {isEdit ? (
              <Button variant="outline" onClick={() => void deleteItem()} disabled={busy || loading}>Supprimer</Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
