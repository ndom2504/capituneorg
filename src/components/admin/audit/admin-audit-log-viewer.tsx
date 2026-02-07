"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AuditItem = {
  id: string;
  action: string;
  objectType: string | null;
  objectId: string | null;
  createdAt: string;
  admin: { id: string; fullName: string; email: string };
};

type ResponsePayload = {
  items: AuditItem[];
};

type Props = {
  viewerRole: "ADMIN" | "MODERATOR";
};

const actionOptions = [
  "",
  "VERIFY_PRO",
  "REJECT_PRO",
  "SUSPEND_USER",
  "SUSPEND_PROFILE",
  "REACTIVATE_PROFILE",
  "REACTIVATE_USER",
  "FORCE_LOGOUT",
  "ADD_ADMIN_NOTE",
  "REPORT_REVIEW",
  "REPORT_RESOLVE",
  "REPORT_DISMISS",
  "FEATURE_EVENT",
  "UNFEATURE_EVENT",
  "PUBLISH_JOB",
  "CLOSE_JOB",
  "CREATE_NOTIFICATION_TEMPLATE",
  "UPDATE_NOTIFICATION_TEMPLATE",
  "ARCHIVE_NOTIFICATION_TEMPLATE",
  "RESTORE_NOTIFICATION_TEMPLATE",
  "SEND_NOTIFICATION",
  "HIDE_POST",
  "RESTORE_POST",
  "DELETE_COMMENT",
  "LOCK_COMMENTS",
  "UNLOCK_COMMENTS",
  "PIN_POST",
  "UNPIN_POST",
  "BAN_COMMUNITY",
  "UNBAN_COMMUNITY",
] as const;

export function AdminAuditLogViewer({ viewerRole }: Props) {
  const [q, setQ] = useState("");
  const [action, setAction] = useState<(typeof actionOptions)[number]>("");
  const [objectType, setObjectType] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);

  const canAct = viewerRole === "ADMIN";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (action) params.set("action", action);
      if (objectType.trim()) params.set("objectType", objectType.trim());

      const url = params.toString() ? `/api/admin/audit?${params.toString()}` : "/api/admin/audit";
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as ResponsePayload & { error?: string };

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
  }, [q, action, objectType]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => items, [items]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit logs</CardTitle>
        <CardDescription>
          Historique des actions admin.{!canAct && " Lecture seule (MODERATOR)."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-muted">{loading ? "Chargement…" : `${rows.length} événement(s)`}</div>

          <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
            <div className="w-full lg:w-[320px]">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher (admin, objet, id)…"
              />
            </div>

            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-[220px]"
              value={action}
              onChange={(e) => setAction(e.target.value as (typeof actionOptions)[number])}
              aria-label="Filtrer par action"
            >
              {actionOptions.map((a) => (
                <option key={a} value={a}>
                  {a ? a : "Toutes les actions"}
                </option>
              ))}
            </select>

            <div className="w-full lg:w-[220px]">
              <Input
                value={objectType}
                onChange={(e) => setObjectType(e.target.value)}
                placeholder="objectType (ex: User)"
              />
            </div>

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
            Aucun événement.
          </div>
        )}

        <div className="space-y-2">
          {rows.map((it) => {
            const isUser = it.objectType === "User" && !!it.objectId;
            const dateLabel = new Date(it.createdAt).toLocaleString();

            return (
              <div
                key={it.id}
                className="rounded-[var(--radius-md)] border border-border bg-white p-3"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <div className="text-sm font-semibold text-navy">{it.action}</div>
                  <div className="text-xs text-muted">{dateLabel}</div>
                </div>

                <div className="text-xs text-muted">
                  Par {it.admin.fullName} · {it.admin.email}
                </div>

                <div className="mt-2 text-sm text-text">
                  <span className="text-muted">Objet:</span> {it.objectType ?? "—"}
                  {it.objectId ? (
                    <>
                      {" "}
                      <span className="text-muted">·</span> {" "}
                      {isUser ? (
                        <Link className="underline" href={`/admin/users/${it.objectId}`}>
                          {it.objectId}
                        </Link>
                      ) : (
                        <span className="font-mono text-xs">{it.objectId}</span>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
