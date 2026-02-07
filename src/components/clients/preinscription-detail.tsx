"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

type ReviewStatus =
  | "NEW"
  | "IN_REVIEW"
  | "ACCEPTED"
  | "REJECTED"
  | "NEEDS_INFO";

type Feasibility = "LOW" | "MEDIUM" | "HIGH";

type PreRegistrationDetail = {
  id: string;
  createdAt: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  objective: string;
  desiredStart: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  constraints: string[];
  notes: string | null;
  review:
    | {
        id: string;
        status: ReviewStatus;
        feasibility: Feasibility | null;
        recommendedTrack: string | null;
        internalNotes: string | null;
        assignedProId: string | null;
        updatedAt: string;
      }
    | null;
};

type ApiGetResponse = {
  item: PreRegistrationDetail;
  viewer: { id: string; accountType: string; isCertified: boolean };
};

type ApiPostResponse = {
  review: NonNullable<PreRegistrationDetail["review"]>;
};

function badge(status: ReviewStatus | string) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs";

  if (status === "ACCEPTED")
    return <span className={cn(base, "border-green-200 bg-green-50 text-green-700")}>Acceptée</span>;
  if (status === "REJECTED")
    return <span className={cn(base, "border-red-200 bg-red-50 text-red-700")}>Refusée</span>;
  if (status === "NEEDS_INFO")
    return <span className={cn(base, "border-amber-200 bg-amber-50 text-amber-800")}>Infos requises</span>;
  if (status === "IN_REVIEW")
    return <span className={cn(base, "border-primary/20 bg-primary/10 text-navy")}>En analyse</span>;
  if (status === "NEW")
    return <span className={cn(base, "border-slate-200 bg-slate-50 text-slate-700")}>Nouveau</span>;

  return <span className={cn(base, "border-slate-200 bg-slate-50 text-slate-700")}>{String(status)}</span>;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PreinscriptionDetail({
  preRegistrationId,
}: {
  preRegistrationId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewer, setViewer] = useState<ApiGetResponse["viewer"] | null>(null);
  const [item, setItem] = useState<PreRegistrationDetail | null>(null);

  const [status, setStatus] = useState<ReviewStatus>("IN_REVIEW");
  const [feasibility, setFeasibility] = useState<Feasibility | "">("");
  const [recommendedTrack, setRecommendedTrack] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const [meetingStartsAt, setMeetingStartsAt] = useState("");
  const [meetingDuration, setMeetingDuration] = useState("45");
  const [meetingUrl, setMeetingUrl] = useState("");

  useEffect(() => {
    let canceled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/clients/preinscriptions/${preRegistrationId}`,
          {
            method: "GET",
            headers: { "content-type": "application/json" },
          },
        );
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as ApiGetResponse;
        if (canceled) return;

        setViewer(data.viewer);
        setItem(data.item);

        const r = data.item.review;
        if (r) {
          setStatus(r.status);
          setFeasibility(r.feasibility ?? "");
          setRecommendedTrack(r.recommendedTrack ?? "");
          setInternalNotes(r.internalNotes ?? "");
        } else {
          setStatus("IN_REVIEW");
          setFeasibility("");
          setRecommendedTrack("");
          setInternalNotes("");
        }
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
  }, [preRegistrationId]);

  const canAssign = viewer?.accountType === "ADMIN";

  const budgetText = useMemo(() => {
    if (!item) return "—";
    if (item.budgetMin != null && item.budgetMax != null)
      return `${formatMoney(item.budgetMin)} – ${formatMoney(item.budgetMax)}`;
    if (item.budgetMax != null) return `≤ ${formatMoney(item.budgetMax)}`;
    if (item.budgetMin != null) return `≥ ${formatMoney(item.budgetMin)}`;
    return "—";
  }, [item]);

  async function saveReview(nextStatus?: ReviewStatus) {
    if (!item) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/clients/preinscriptions/${preRegistrationId}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            status: nextStatus ?? status,
            feasibility: feasibility || null,
            recommendedTrack: recommendedTrack.trim() || null,
            internalNotes: internalNotes.trim() || null,
          }),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as ApiPostResponse;
      setItem({ ...item, review: data.review });
      setStatus(data.review.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function createMeeting() {
    if (!item) return;
    if (!meetingStartsAt) {
      setError("Choisissez une date/heure pour le meeting.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/clients/meetings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          preRegistrationId: item.id,
          startsAt: new Date(meetingStartsAt).toISOString(),
          durationMin: Math.max(15, Number(meetingDuration) || 45),
          locationUrl: meetingUrl.trim() || null,
          type: "DISCOVERY_CALL",
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      // simple UX: clear form
      setMeetingStartsAt("");
      setMeetingDuration("45");
      setMeetingUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link href="/clients/preinscriptions" className="text-sm text-muted">
          ← Retour à la liste
        </Link>
        {item?.review?.status ? badge(item.review.status) : badge("NEW")}
      </div>

      {error ? (
        <Card className="p-4">
          <div className="text-sm font-medium text-danger">Erreur</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-text">
            {error}
          </div>
        </Card>
      ) : null}

      {loading || !item ? (
        <Card className="p-6">
          <div className="text-sm text-muted">Chargement…</div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card className="p-4">
              <div className="text-lg font-semibold text-navy">
                {item.firstName} {item.lastName}
              </div>
              <div className="mt-1 text-sm text-muted">
                <span className="font-medium text-text">{item.email}</span>
                {item.phone ? (
                  <>
                    <span className="mx-2">•</span>
                    <span>{item.phone}</span>
                  </>
                ) : null}
              </div>

              <div className="mt-4 grid gap-2 text-sm">
                <div>
                  <span className="text-muted">Objectif:</span>{" "}
                  <span className="font-medium text-text">{item.objective}</span>
                </div>
                <div>
                  <span className="text-muted">Début souhaité:</span>{" "}
                  <span className="text-text">{item.desiredStart ?? "—"}</span>
                </div>
                <div>
                  <span className="text-muted">Budget:</span>{" "}
                  <span className="font-medium text-text">{budgetText}</span>
                </div>
                {item.constraints?.length ? (
                  <div>
                    <span className="text-muted">Contraintes:</span>{" "}
                    <span className="text-text">
                      {item.constraints.join(", ")}
                    </span>
                  </div>
                ) : null}
                {item.notes ? (
                  <div>
                    <span className="text-muted">Notes client:</span>{" "}
                    <span className="text-text">{item.notes}</span>
                  </div>
                ) : null}
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-base font-semibold text-navy">
                Planifier un meeting
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <div className="text-xs text-muted">Date & heure</div>
                  <Input
                    type="datetime-local"
                    value={meetingStartsAt}
                    onChange={(e) => setMeetingStartsAt(e.target.value)}
                  />
                </div>
                <div>
                  <div className="text-xs text-muted">Durée (min)</div>
                  <Input
                    type="number"
                    min={15}
                    step={15}
                    value={meetingDuration}
                    onChange={(e) => setMeetingDuration(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-3">
                  <div className="text-xs text-muted">Lien (Zoom/Meet…)</div>
                  <Input
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="https://…"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button onClick={createMeeting} disabled={saving}>
                  Créer le meeting
                </Button>
                <div className="text-xs text-muted">
                  Le meeting sera lié à cette préinscription.
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <div className="text-base font-semibold text-navy">
                Décision & suivi
              </div>

              <div className="mt-3 grid gap-3">
                <div>
                  <div className="text-xs text-muted">Statut</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(
                      [
                        "IN_REVIEW",
                        "NEEDS_INFO",
                        "ACCEPTED",
                        "REJECTED",
                      ] as const
                    ).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={cn(
                          "rounded-[var(--radius-md)] border px-2 py-1 text-xs",
                          status === s
                            ? "border-primary/25 bg-primary/12 text-navy"
                            : "border-border bg-white/60 text-text hover:bg-white/80",
                        )}
                      >
                        {s === "IN_REVIEW"
                          ? "En analyse"
                          : s === "NEEDS_INFO"
                            ? "Infos requises"
                            : s === "ACCEPTED"
                              ? "Acceptée"
                              : "Refusée"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted">Faisabilité</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(["LOW", "MEDIUM", "HIGH"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFeasibility(f)}
                        className={cn(
                          "rounded-[var(--radius-md)] border px-2 py-1 text-xs",
                          feasibility === f
                            ? "border-primary/25 bg-primary/12 text-navy"
                            : "border-border bg-white/60 text-text hover:bg-white/80",
                        )}
                      >
                        {f === "LOW"
                          ? "Basse"
                          : f === "MEDIUM"
                            ? "Moyenne"
                            : "Haute"}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setFeasibility("")}
                      className={cn(
                        "rounded-[var(--radius-md)] border px-2 py-1 text-xs",
                        !feasibility
                          ? "border-primary/25 bg-primary/12 text-navy"
                          : "border-border bg-white/60 text-text hover:bg-white/80",
                      )}
                    >
                      —
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted">Parcours recommandé</div>
                  <Input
                    value={recommendedTrack}
                    onChange={(e) => setRecommendedTrack(e.target.value)}
                    placeholder="Ex: Études → stage → travail"
                  />
                </div>

                <div>
                  <div className="text-xs text-muted">Notes internes</div>
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={8}
                    placeholder="Points clés, risques, prochaines actions…"
                  />
                </div>

                {canAssign ? (
                  <div className="rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    Assignation pro: côté Admin uniquement (API supportée), UI
                    simplifiée ici.
                  </div>
                ) : null}

                <div className="flex items-center gap-2">
                  <Button onClick={() => saveReview()} disabled={saving}>
                    Enregistrer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => saveReview("ACCEPTED")}
                    disabled={saving}
                  >
                    Accepter
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => saveReview("REJECTED")}
                    disabled={saving}
                  >
                    Refuser
                  </Button>
                </div>

                <div className="text-xs text-muted">
                  Astuce: utilisez “Infos requises” si vous devez demander des
                  précisions avant d’accepter.
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-sm font-medium text-navy">Actions</div>
              <div className="mt-3 flex flex-col gap-2">
                <Link href="/clients/meetings">
                  <Button variant="outline" className="w-full">
                    Voir les meetings
                  </Button>
                </Link>
                <Link href="/clients/actifs">
                  <Button variant="outline" className="w-full">
                    Voir les clients actifs
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
