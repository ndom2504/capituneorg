"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type UserItem = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  accountType: "USER" | "PROFESSIONAL" | "ADMIN";
  adminRole: "ADMIN" | "MODERATOR";
  accountStatus: "ACTIVE" | "SUSPENDED" | "DELETED";
  suspendedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  professionalProfile: { id: string; verificationStatus: string } | null;
};

type ListResponse = {
  canAct: boolean;
  items: UserItem[];
};

type Props = {
  viewerRole: "ADMIN" | "MODERATOR";
};

export function AdminUsersPanel({ viewerRole }: Props) {
  const canAct = viewerRole === "ADMIN";

  const router = useRouter();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "ACTIVE" | "SUSPENDED" | "DELETED">("");
  const [type, setType] = useState<"" | "USER" | "PROFESSIONAL" | "ADMIN">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<UserItem[]>([]);

  const [busyById, setBusyById] = useState<Record<string, boolean>>({});
  const [suspendReasonById, setSuspendReasonById] = useState<Record<string, string>>({});
  const [noteById, setNoteById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      const url = params.toString() ? `/api/admin/users?${params.toString()}` : "/api/admin/users";
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
  }, [q, status, type]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleItems = useMemo(() => items, [items]);

  async function doUserAction(
    userId: string,
    action: "SUSPEND" | "REACTIVATE" | "DELETE" | "FORCE_LOGOUT" | "ADD_NOTE",
    options?: { reasonOverride?: string },
  ) {
    setError(null);
    setBusyById((prev) => ({ ...prev, [userId]: true }));

    try {
      const suspendReason = (suspendReasonById[userId] ?? "").trim();
      const noteBody = (noteById[userId] ?? "").trim();

      const payload: any = { action };
      if (action === "SUSPEND" || action === "DELETE") {
        payload.reason = (options?.reasonOverride ?? suspendReason).trim();
      }
      if (action === "ADD_NOTE") payload.noteBody = noteBody;

      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Erreur serveur.");
        return;
      }

      if (action === "ADD_NOTE") {
        setNoteById((prev) => ({ ...prev, [userId]: "" }));
      }

      await load();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusyById((prev) => ({ ...prev, [userId]: false }));
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Liste utilisateurs</CardTitle>
          <CardDescription>
            Recherche + actions V1.{!canAct && " Lecture seule (MODERATOR)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted">
              {loading ? "Chargement…" : `${visibleItems.length} utilisateur(s)`}
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="w-full sm:w-[280px]">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher (nom, email)…"
                />
              </div>

              <select
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text placeholder:text-muted transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-[210px]"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                aria-label="Filtrer par statut"
              >
                <option value="">Tous les statuts</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="DELETED">DELETED</option>
              </select>

              <select
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text placeholder:text-muted transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-[220px]"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                aria-label="Filtrer par type"
              >
                <option value="">Tous les types</option>
                <option value="USER">USER</option>
                <option value="PROFESSIONAL">PROFESSIONAL</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {!loading && visibleItems.length === 0 && (
            <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-muted">
              Aucun résultat.
            </div>
          )}

          <div className="space-y-3">
            {visibleItems.map((u) => {
              const busy = !!busyById[u.id];
              const suspendReason = suspendReasonById[u.id] ?? "";
              const noteBody = noteById[u.id] ?? "";

              return (
                <Card key={u.id} className="hover:translate-y-0">
                  <CardHeader>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <CardTitle>{u.fullName}</CardTitle>
                      <div className="text-xs text-muted">{u.email}</div>
                    </div>
                    <CardDescription>
                      {u.accountType}
                      {u.accountType === "ADMIN" ? ` (${u.adminRole})` : ""}
                      {` · ${u.accountStatus}`}
                      {u.professionalProfile
                        ? ` · Profil: ${u.professionalProfile.verificationStatus}`
                        : ""}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted">Motif de suspension (requis)</div>
                        <Textarea
                          value={suspendReason}
                          onChange={(e) =>
                            setSuspendReasonById((prev) => ({
                              ...prev,
                              [u.id]: e.target.value,
                            }))
                          }
                          placeholder="Ex: comportement abusif, fraude, non conformité…"
                          disabled={!canAct || busy}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            disabled={busy}
                            onClick={() => router.push(`/admin/users/${u.id}`)}
                          >
                            Détails
                          </Button>

                          {u.accountStatus !== "SUSPENDED" ? (
                            <Button
                              variant="outline"
                              disabled={!canAct || busy}
                              onClick={() => void doUserAction(u.id, "SUSPEND")}
                            >
                              Suspendre
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              disabled={!canAct || busy}
                              onClick={() => void doUserAction(u.id, "REACTIVATE")}
                            >
                              Réactiver
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            disabled={!canAct || busy}
                            onClick={() => void doUserAction(u.id, "FORCE_LOGOUT")}
                          >
                            Forcer déconnexion
                          </Button>

                          {u.accountStatus !== "DELETED" && (
                            <Button
                              variant="outline"
                              disabled={!canAct || busy}
                              onClick={() => {
                                const reason = prompt(
                                  "Motif du bannissement (obligatoire) :",
                                  suspendReasonById[u.id] ?? "",
                                );
                                if (!reason || !reason.trim()) return;

                                if (
                                  confirm(
                                    "⚠️ ATTENTION: Cette action bannira l'utilisateur (statut DELETED) et forcera sa déconnexion. Continuer ?",
                                  )
                                ) {
                                  void doUserAction(u.id, "DELETE", { reasonOverride: reason });
                                }
                              }}
                              className="border-red-600 text-red-600 hover:bg-red-50"
                            >
                              🚫 Bannir/Effacer
                            </Button>
                          )}

                          {!canAct && (
                            <div className="text-sm text-muted">Actions désactivées pour MODERATOR.</div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted">Note admin</div>
                        <Textarea
                          value={noteBody}
                          onChange={(e) =>
                            setNoteById((prev) => ({
                              ...prev,
                              [u.id]: e.target.value,
                            }))
                          }
                          placeholder="Ajouter une note interne…"
                          disabled={!canAct || busy}
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            disabled={!canAct || busy}
                            onClick={() => void doUserAction(u.id, "ADD_NOTE")}
                          >
                            Ajouter note
                          </Button>
                        </div>
                      </div>
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
