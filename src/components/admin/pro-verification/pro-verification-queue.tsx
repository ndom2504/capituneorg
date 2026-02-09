"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { professionLabel } from "@/lib/professions";

type QueueItem = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  profession: string;
  primaryProfessionId?: string;
  secondaryProfessionIds?: string[];
  organization: string | null;
  headline: string | null;
  country: string;
  city: string;
  licenseNumber: string | null;
  licenseAuthority: string | null;
  proofUrl: string | null;
  idProofUrl: string | null;
  verificationRequestedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type QueueResponse = {
  canAct: boolean;
  items: QueueItem[];
};

type Props = {
  viewerRole: "ADMIN" | "MODERATOR";
};

function normalizeUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return url;
  return `/${url}`;
}

export function ProVerificationQueue({ viewerRole }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState("");

  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({});
  const [busyById, setBusyById] = useState<Record<string, boolean>>({});

  const canAct = viewerRole === "ADMIN";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/pro-verification", { cache: "no-store" });
      const data = (await res.json()) as QueueResponse & { error?: string };
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
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => {
      const hay = `${i.fullName} ${i.email} ${i.city} ${i.country} ${i.profession}`.toLowerCase();
      return hay.includes(q);
    });
  }, [filter, items]);

  async function doAction(profileId: string, action: "VERIFY" | "REJECT" | "SUSPEND") {
    setError(null);
    setBusyById((prev) => ({ ...prev, [profileId]: true }));

    try {
      const reason = (rejectReasonById[profileId] ?? "").trim();
      const res = await fetch("/api/admin/pro-verification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          profileId,
          ...(action === "REJECT" || action === "SUSPEND" ? { reason } : {}),
        }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur serveur.");
        return;
      }

      setRejectReasonById((prev) => {
        const next = { ...prev };
        delete next[profileId];
        return next;
      });

      await load();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusyById((prev) => ({ ...prev, [profileId]: false }));
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>File d’attente</CardTitle>
          <CardDescription>
            Profils marketplace en attente (PENDING).{!canAct && " Lecture seule (MODERATOR)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted">
              {loading ? "Chargement…" : `${filteredItems.length} profil(s)`}
            </div>

            <div className="w-full sm:w-[360px]">
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Rechercher (nom, email, ville, profession)…"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {!loading && filteredItems.length === 0 && (
            <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-muted">
              Aucun profil en attente.
            </div>
          )}

          <div className="space-y-3">
            {filteredItems.map((item) => {
              const busy = !!busyById[item.id];
              const rejectReason = rejectReasonById[item.id] ?? "";

              return (
                <Card key={item.id} className="hover:translate-y-0">
                  <CardHeader>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <CardTitle>{item.fullName}</CardTitle>
                      <div className="text-xs text-muted">{item.email}</div>
                    </div>
                    <CardDescription>
                      {item.primaryProfessionId ? professionLabel(item.primaryProfessionId) : item.profession}
                      {item.organization ? ` · ${item.organization}` : ""}
                      {item.headline ? ` · ${item.headline}` : ""}
                      {` · ${item.city}, ${item.country}`}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {item.secondaryProfessionIds && item.secondaryProfessionIds.length ? (
                      <div className="text-xs text-muted">
                        Secondaires: {item.secondaryProfessionIds.map((id) => professionLabel(id)).join(" · ")}
                      </div>
                    ) : null}

                    <div className="grid gap-2 text-sm text-text sm:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted">Justificatif compétence (certificat/diplôme)</div>
                        {item.proofUrl ? (
                          <a
                            className="text-sm underline"
                            href={normalizeUrl(item.proofUrl)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ouvrir le document
                          </a>
                        ) : (
                          <div className="text-sm text-muted">Aucun document</div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-muted">Pièce d’identité</div>
                        {item.idProofUrl ? (
                          <a
                            className="text-sm underline"
                            href={normalizeUrl(item.idProofUrl)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ouvrir le document
                          </a>
                        ) : (
                          <div className="text-sm text-muted">Aucun document</div>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm text-text sm:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted">Licence</div>
                        <div className="text-sm">
                          {item.licenseNumber ? item.licenseNumber : "—"}
                          {item.licenseAuthority ? ` · ${item.licenseAuthority}` : ""}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted">Demande</div>
                        <div className="text-sm text-muted">
                          {item.verificationRequestedAt
                            ? new Date(item.verificationRequestedAt).toLocaleString("fr-CA")
                            : new Date(item.updatedAt).toLocaleString("fr-CA")}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted">
                        Motif (requis pour Rejeter/Suspendre)
                      </div>
                      <Textarea
                        value={rejectReason}
                        onChange={(e) =>
                          setRejectReasonById((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        placeholder="Ex: document illisible, informations manquantes…"
                        disabled={!canAct || busy}
                      />
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        variant="primary"
                        disabled={!canAct || busy}
                        onClick={() => void doAction(item.id, "VERIFY")}
                      >
                        Valider
                      </Button>

                      <Button
                        variant="outline"
                        disabled={!canAct || busy}
                        onClick={() => void doAction(item.id, "REJECT")}
                      >
                        Rejeter
                      </Button>

                      <Button
                        variant="outline"
                        disabled={!canAct || busy}
                        onClick={() => void doAction(item.id, "SUSPEND")}
                      >
                        Suspendre
                      </Button>

                      {!canAct && (
                        <div className="text-sm text-muted sm:ml-auto">
                          Actions désactivées pour MODERATOR.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
