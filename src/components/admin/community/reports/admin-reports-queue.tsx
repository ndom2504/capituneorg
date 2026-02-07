"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ReportItem = {
  id: string;
  targetType: string;
  targetId: string | null;
  status: string;
  reason: string | null;
  reporter: { id: string; fullName: string; email: string } | null;
  resolvedBy: { id: string; fullName: string; email: string } | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = {
  canAct: boolean;
  items: ReportItem[];
};

type Props = {
  viewerRole: "ADMIN" | "MODERATOR";
};

const statusOptions = ["", "OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"] as const;
const targetTypeOptions = ["", "POST", "COMMENT", "PROFILE", "OFFER", "PRO", "DOSSIER", "OTHER"] as const;

export function AdminReportsQueue({ viewerRole }: Props) {
  const canAct = viewerRole === "ADMIN";

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof statusOptions)[number]>("");
  const [targetType, setTargetType] = useState<(typeof targetTypeOptions)[number]>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ReportItem[]>([]);
  const [busyById, setBusyById] = useState<Record<string, boolean>>({});
  const [noteById, setNoteById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (targetType) params.set("targetType", targetType);

      const url = params.toString() ? `/api/admin/community/reports?${params.toString()}` : "/api/admin/community/reports";
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as ListResponse & { error?: string };
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
  }, [q, status, targetType]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => items, [items]);

  async function doAction(reportId: string, action: "MARK_IN_REVIEW" | "RESOLVE" | "DISMISS") {
    setError(null);
    setBusyById((prev) => ({ ...prev, [reportId]: true }));

    try {
      const note = (noteById[reportId] ?? "").trim();

      const res = await fetch("/api/admin/community/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reportId, action, ...(action === "MARK_IN_REVIEW" ? {} : { note }) }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur serveur.");
        return;
      }

      setNoteById((prev) => {
        const next = { ...prev };
        delete next[reportId];
        return next;
      });

      await load();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusyById((prev) => ({ ...prev, [reportId]: false }));
    }
  }

  async function doSanction(reportId: string, sanction: "HIDE_POST" | "DELETE_COMMENT" | "SUSPEND_PROFILE") {
    setError(null);
    setBusyById((prev) => ({ ...prev, [reportId]: true }));

    try {
      const note = (noteById[reportId] ?? "").trim();

      const res = await fetch("/api/admin/community/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reportId, action: "SANCTION", sanction, note }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur serveur.");
        return;
      }

      setNoteById((prev) => {
        const next = { ...prev };
        delete next[reportId];
        return next;
      });

      await load();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusyById((prev) => ({ ...prev, [reportId]: false }));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signalements</CardTitle>
        <CardDescription>
          File de modération des reports (OPEN/IN_REVIEW par défaut).{!canAct && " Lecture seule (MODERATOR)."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-muted">{loading ? "Chargement…" : `${rows.length} report(s)`}</div>

          <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
            <div className="w-full lg:w-[320px]">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher (id, targetId, reporter, motif)…"
              />
            </div>

            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-[180px]"
              value={status}
              onChange={(e) => setStatus(e.target.value as (typeof statusOptions)[number])}
              aria-label="Filtrer par status"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s ? s : "OPEN + IN_REVIEW"}
                </option>
              ))}
            </select>

            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-[180px]"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as (typeof targetTypeOptions)[number])}
              aria-label="Filtrer par targetType"
            >
              {targetTypeOptions.map((t) => (
                <option key={t} value={t}>
                  {t ? t : "Tous les types"}
                </option>
              ))}
            </select>

            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              Rafraîchir
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-muted">
            Aucun report.
          </div>
        )}

        <div className="space-y-3">
          {rows.map((it) => {
            const busy = !!busyById[it.id];
            const createdLabel = new Date(it.createdAt).toLocaleString();
            const resolvedLabel = it.resolvedAt ? new Date(it.resolvedAt).toLocaleString() : "";
            const note = noteById[it.id] ?? it.resolutionNote ?? "";

            const canSanction = canAct && !busy && (it.status === "OPEN" || it.status === "IN_REVIEW") && !!it.targetId;
            const isPost = it.targetType === "POST";
            const isComment = it.targetType === "COMMENT";
            const isProfile = it.targetType === "PRO" || it.targetType === "PROFILE";

            return (
              <Card key={it.id} className="hover:translate-y-0">
                <CardHeader>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <CardTitle className="text-base">{it.targetType}</CardTitle>
                    <div className="text-xs text-muted">{createdLabel}</div>
                  </div>
                  <CardDescription>
                    <span className="font-semibold">{it.status}</span>
                    {it.targetId ? ` · targetId: ${it.targetId}` : ""}
                    {it.reason ? ` · Motif: ${it.reason}` : ""}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="grid gap-2 text-sm text-text sm:grid-cols-2">
                    <div>
                      <div className="text-xs text-muted">Reporter</div>
                      <div className="text-sm">
                        {it.reporter ? `${it.reporter.fullName} · ${it.reporter.email}` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted">Résolution</div>
                      <div className="text-sm">
                        {it.resolvedBy ? `${it.resolvedBy.fullName}` : "—"}
                        {resolvedLabel ? ` · ${resolvedLabel}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted">Note de résolution</div>
                    <Textarea
                      value={note}
                      onChange={(e) =>
                        setNoteById((prev) => ({
                          ...prev,
                          [it.id]: e.target.value,
                        }))
                      }
                      placeholder="Optionnel: contexte / décision…"
                      disabled={!canAct || busy}
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      disabled={!canAct || busy || it.status !== "OPEN"}
                      onClick={() => void doAction(it.id, "MARK_IN_REVIEW")}
                    >
                      Prendre en charge
                    </Button>

                    {isPost && (
                      <Button
                        variant="outline"
                        disabled={!canSanction}
                        onClick={() => void doSanction(it.id, "HIDE_POST")}
                      >
                        Masquer le post
                      </Button>
                    )}

                    {isComment && (
                      <Button
                        variant="outline"
                        disabled={!canSanction}
                        onClick={() => void doSanction(it.id, "DELETE_COMMENT")}
                      >
                        Supprimer le commentaire
                      </Button>
                    )}

                    {isProfile && (
                      <Button
                        variant="outline"
                        disabled={!canSanction}
                        onClick={() => void doSanction(it.id, "SUSPEND_PROFILE")}
                      >
                        Suspendre le profil
                      </Button>
                    )}

                    <Button
                      variant="primary"
                      disabled={!canAct || busy || (it.status !== "OPEN" && it.status !== "IN_REVIEW")}
                      onClick={() => void doAction(it.id, "RESOLVE")}
                    >
                      Résoudre
                    </Button>

                    <Button
                      variant="outline"
                      disabled={!canAct || busy || (it.status !== "OPEN" && it.status !== "IN_REVIEW")}
                      onClick={() => void doAction(it.id, "DISMISS")}
                    >
                      Rejeter
                    </Button>

                    {!canAct && (
                      <div className="text-sm text-muted sm:ml-auto">
                        Actions désactivées pour MODERATOR.
                      </div>
                    )}
                  </div>

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
