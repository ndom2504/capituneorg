"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fromLines, readApiError, toLines } from "@/components/pro-content/api";
import { cn } from "@/lib/cn";

type PublishStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type ItemResponse = {
  item?: {
    id: string;
    type: "TRAINING";
    title: string;
    description: string;
    language: string;

    publishStatus: PublishStatus;
    trainingFormat: "VIDEO" | "RESOURCES" | "MIXED" | null;
    level: string | null;
    videoUrl: string | null;
    objectivesJson: unknown;
    resourcesJson: unknown;
    targetRole: "ALL" | "DEMANDEUR" | "PRO" | null;
    imageUrl: string | null;

    isPaid: boolean;
    priceCents: number | null;
    currency: string;
    stripePriceId: string | null;

    createdAt: string;
    updatedAt: string;
  };
  error?: string;
};

export function ProTrainingEditor({ contentId, backHref }: { contentId?: string; backHref: string }) {
  const router = useRouter();
  const isEdit = !!contentId;

  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<"fr" | "en">("fr");

  const [publishStatus, setPublishStatus] = useState<PublishStatus>("DRAFT");
  const [trainingFormat, setTrainingFormat] = useState<"VIDEO" | "RESOURCES" | "MIXED">("VIDEO");
  const [level, setLevel] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [objectivesText, setObjectivesText] = useState("");
  const [resourcesText, setResourcesText] = useState("");
  const [targetRole, setTargetRole] = useState<"" | "ALL" | "DEMANDEUR" | "PRO">("");

  const [isPaid, setIsPaid] = useState(false);
  const [priceCents, setPriceCents] = useState<string>("");
  const [currency, setCurrency] = useState("cad");
  const [stripePriceId, setStripePriceId] = useState("");

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (!description.trim()) return false;

    if (trainingFormat === "VIDEO" && !videoUrl.trim()) return false;
    if (trainingFormat === "RESOURCES" && toLines(resourcesText).length === 0) return false;

    if (isPaid) {
      const v = Number(priceCents);
      if (!Number.isFinite(v) || v <= 0) return false;
    }

    return true;
  }, [title, description, trainingFormat, videoUrl, resourcesText, isPaid, priceCents]);

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

      setPublishStatus((it.publishStatus ?? "DRAFT") as PublishStatus);
      setTrainingFormat(((it.trainingFormat ?? "VIDEO") as "VIDEO" | "RESOURCES" | "MIXED"));
      setLevel(it.level ?? "");
      setVideoUrl(it.videoUrl ?? "");
      setObjectivesText(fromLines(it.objectivesJson));
      setResourcesText(fromLines(it.resourcesJson));
      setTargetRole((it.targetRole ?? "") as "" | "ALL" | "DEMANDEUR" | "PRO");

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
        type: "TRAINING" as const,
        title: title.trim(),
        description: description.trim(),
        language,

        publishStatus,
        trainingFormat,
        level: level.trim() || null,
        videoUrl: videoUrl.trim() || null,
        objectives: toLines(objectivesText),
        resources: toLines(resourcesText),
        targetRole: targetRole || null,

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
          setInfo("Formation créée.");
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
    if (!confirm("Supprimer cette formation ?")) return;

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
          <h1 className="text-2xl font-semibold text-navy">{isEdit ? "Modifier la formation" : "Nouvelle formation"}</h1>
          <p className="mt-1 text-sm text-muted">{isEdit ? "Mettez à jour et publiez quand vous êtes prêt." : "Créez un brouillon puis publiez."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={backHref}>
            <Button variant="outline">Retour</Button>
          </Link>
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

      <Card className={cn("p-0", loading && "opacity-70")}>
        <CardHeader>
          <CardTitle>Détails</CardTitle>
          <CardDescription>
            Champs requis: titre, description, format (et lien vidéo si Vidéo / au moins une ressource si Ressources).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-muted">Titre</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Formation entretien" />
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
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Décrivez la formation et ce que les apprenants vont obtenir." />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <div className="text-xs font-semibold text-muted">Statut</div>
              <select
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
                value={publishStatus}
                onChange={(e) => setPublishStatus(e.target.value as PublishStatus)}
              >
                <option value="DRAFT">Brouillon</option>
                <option value="PUBLISHED">Publié</option>
                <option value="ARCHIVED">Archivé</option>
              </select>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted">Format</div>
              <select
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
                value={trainingFormat}
                onChange={(e) => setTrainingFormat(e.target.value as "VIDEO" | "RESOURCES" | "MIXED")}
              >
                <option value="VIDEO">Vidéo</option>
                <option value="RESOURCES">Ressources</option>
                <option value="MIXED">Mixte</option>
              </select>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted">Niveau (optionnel)</div>
              <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="Débutant, Intermédiaire…" />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Lien vidéo (si Vidéo/Mixte)</div>
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-muted">Objectifs (1 par ligne)</div>
              <Textarea value={objectivesText} onChange={(e) => setObjectivesText(e.target.value)} rows={5} placeholder="Ex: Structurer son CV\nPréparer un pitch…" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted">Ressources (1 par ligne)</div>
              <Textarea value={resourcesText} onChange={(e) => setResourcesText(e.target.value)} rows={5} placeholder="Ex: https://…\nPDF: …" />
              {trainingFormat === "RESOURCES" && toLines(resourcesText).length === 0 ? (
                <div className="mt-1 text-xs text-danger">Au moins une ressource est requise.</div>
              ) : null}
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
              <div className="text-xs font-semibold text-muted">(Réservé) Image</div>
              <Input value="" disabled placeholder="V1" />
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

            <div className={cn("mt-3 grid gap-3 sm:grid-cols-3", !isPaid && "opacity-70")}>
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
