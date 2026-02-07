"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type JobItem = {
  id: string;
  title: string;
  status: string;
  jobType: string;
  domain: string;
  experienceLevel: string;
  city: string | null;
  province: string | null;
  remote: boolean;
  languages: string;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  poster: { id: string; fullName: string; email: string | null };
  applicationsCount: number;
};

type JobResponsePayload = {
  canAct: boolean;
  items: JobItem[];
};

type ApplicationItem = {
  id: string;
  status: string;
  cvUrl: string;
  createdAt: string;
  updatedAt: string;
  applicant: {
    id: string;
    fullName: string;
    email: string;
    accountType: string;
    accountStatus: string;
    isCertified: boolean;
  };
};

type Props = {
  viewerRole: "ADMIN" | "MODERATOR";
};

const statusOptions = ["", "DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"] as const;

export function AdminJobsPanel({ viewerRole }: Props) {
  const canAct = viewerRole === "ADMIN";

  const [busyByJobId, setBusyByJobId] = useState<Record<string, boolean>>({});

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof statusOptions)[number]>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<JobItem[]>([]);

  const [openApplicationsJobId, setOpenApplicationsJobId] = useState<string | null>(null);
  const [applicationsByJobId, setApplicationsByJobId] = useState<Record<string, ApplicationItem[]>>({});
  const [applicationsLoadingByJobId, setApplicationsLoadingByJobId] = useState<Record<string, boolean>>({});
  const [applicationsErrorByJobId, setApplicationsErrorByJobId] = useState<Record<string, string | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      const url = params.toString() ? `/api/admin/jobs?${params.toString()}` : "/api/admin/jobs";

      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as JobResponsePayload & { error?: string };
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
  }, [q, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => items, [items]);

  async function doJobAction(jobId: string, action: "PUBLISH" | "CLOSE") {
    setError(null);
    setBusyByJobId((prev) => ({ ...prev, [jobId]: true }));

    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId, action }),
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
      setBusyByJobId((prev) => ({ ...prev, [jobId]: false }));
    }
  }

  async function loadApplications(jobId: string) {
    setApplicationsLoadingByJobId((prev) => ({ ...prev, [jobId]: true }));
    setApplicationsErrorByJobId((prev) => ({ ...prev, [jobId]: null }));

    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/applications?limit=100`, { cache: "no-store" });
      const data = (await res.json()) as { items?: ApplicationItem[]; error?: string };
      if (!res.ok) {
        setApplicationsErrorByJobId((prev) => ({ ...prev, [jobId]: data.error ?? "Erreur serveur." }));
        setApplicationsByJobId((prev) => ({ ...prev, [jobId]: [] }));
        return;
      }

      setApplicationsByJobId((prev) => ({ ...prev, [jobId]: data.items ?? [] }));
    } catch {
      setApplicationsErrorByJobId((prev) => ({ ...prev, [jobId]: "Erreur réseau." }));
      setApplicationsByJobId((prev) => ({ ...prev, [jobId]: [] }));
    } finally {
      setApplicationsLoadingByJobId((prev) => ({ ...prev, [jobId]: false }));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offres & candidatures</CardTitle>
        <CardDescription>
          Supervision V1 (lecture).{!canAct && " Lecture seule (MODERATOR)."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-muted">{loading ? "Chargement…" : `${rows.length} offre(s)`}</div>

          <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
            <div className="w-full lg:w-[320px]">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (titre, poster, id)…" />
            </div>

            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-[200px]"
              value={status}
              onChange={(e) => setStatus(e.target.value as (typeof statusOptions)[number])}
              aria-label="Filtrer par statut"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s || "Tous statuts"}
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
          <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-muted">Aucune offre.</div>
        )}

        <div className="space-y-3">
          {rows.map((it) => {
            const location = [it.city, it.province].filter(Boolean).join(", ") || "—";
            const when = it.publishedAt
              ? `Publié: ${new Date(it.publishedAt).toLocaleDateString()}`
              : `Créé: ${new Date(it.createdAt).toLocaleDateString()}`;

            const busy = busyByJobId[it.id] === true;

            return (
              <Card key={it.id} className="hover:translate-y-0">
                <CardHeader>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <CardTitle className="text-base">{it.title}</CardTitle>
                    <div className="text-xs text-muted">{when}</div>
                  </div>
                  <CardDescription>
                    Statut: {it.status} · {it.jobType} · {it.domain} · {it.experienceLevel} · {location} · {it.remote ? "Remote" : "Sur place"} · Candidatures: {it.applicationsCount}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="text-sm text-muted">
                    Poster: <Link className="text-primary hover:underline" href={`/admin/users/${it.poster.id}`}>{it.poster.fullName}</Link>
                    {it.poster.email ? <span className="text-muted"> · {it.poster.email}</span> : null}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      variant="primary"
                      disabled={!canAct || busy || it.status !== "DRAFT"}
                      onClick={() => void doJobAction(it.id, "PUBLISH")}
                    >
                      Publier
                    </Button>

                    <Button
                      variant="outline"
                      disabled={!canAct || busy || it.status !== "PUBLISHED"}
                      onClick={() => void doJobAction(it.id, "CLOSE")}
                    >
                      Clôturer
                    </Button>

                    {!canAct && <div className="text-sm text-muted sm:ml-auto">Actions désactivées pour MODERATOR.</div>}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      variant="outline"
                      disabled={applicationsLoadingByJobId[it.id] === true}
                      onClick={() => {
                        const next = openApplicationsJobId === it.id ? null : it.id;
                        setOpenApplicationsJobId(next);
                        if (next) void loadApplications(it.id);
                      }}
                    >
                      {openApplicationsJobId === it.id ? "Masquer les candidatures" : "Voir les candidatures"}
                    </Button>

                    {openApplicationsJobId === it.id && (
                      <Button
                        variant="outline"
                        disabled={applicationsLoadingByJobId[it.id] === true}
                        onClick={() => void loadApplications(it.id)}
                      >
                        Rafraîchir les candidatures
                      </Button>
                    )}

                    {!canAct && <div className="text-sm text-muted sm:ml-auto">Lecture seule.</div>}
                  </div>

                  {openApplicationsJobId === it.id && (
                    <div className="rounded-[var(--radius-md)] border border-border bg-white p-3">
                      <div className="mb-2 text-sm font-medium text-navy">Candidatures (100 dernières)</div>

                      {applicationsErrorByJobId[it.id] && (
                        <div className="mb-2 text-sm text-red-600">{applicationsErrorByJobId[it.id]}</div>
                      )}

                      {applicationsLoadingByJobId[it.id] === true ? (
                        <div className="text-sm text-muted">Chargement…</div>
                      ) : (
                        <div className="space-y-2">
                          {(applicationsByJobId[it.id] ?? []).length === 0 ? (
                            <div className="text-sm text-muted">Aucune candidature.</div>
                          ) : (
                            (applicationsByJobId[it.id] ?? []).map((a) => (
                              <div key={a.id} className="flex flex-col gap-1 border-b border-border pb-2 last:border-b-0 last:pb-0">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                                  <div className="text-sm">
                                    <Link className="text-primary hover:underline" href={`/admin/users/${a.applicant.id}`}>
                                      {a.applicant.fullName}
                                    </Link>
                                    <span className="text-muted"> · {a.applicant.email}</span>
                                  </div>
                                  <div className="text-xs text-muted">{new Date(a.createdAt).toLocaleString()}</div>
                                </div>
                                <div className="text-xs text-muted">
                                  Statut: {a.status} · {a.applicant.accountType} · {a.applicant.accountStatus}{a.applicant.isCertified ? " · Certifié" : ""}
                                </div>
                                <div className="text-xs">
                                  <a className="text-primary hover:underline" href={a.cvUrl} target="_blank" rel="noreferrer">
                                    Ouvrir le CV
                                  </a>
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
