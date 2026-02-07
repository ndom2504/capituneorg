"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ProfileItem = {
  id: string;
  status: string;
  verificationStatus: string;
  profession: string;
  headline: string | null;
  organization: string | null;
  country: string;
  city: string;
  format: string;
  responseTime: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  proofUrl: string | null;
  licenseNumber: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    accountType: string;
    accountStatus: string;
    isCertified: boolean;
  };
};

type ResponsePayload = {
  canAct: boolean;
  items: ProfileItem[];
};

type Props = {
  viewerRole: "ADMIN" | "MODERATOR";
};

const statusOptions = ["", "DRAFT", "PUBLISHED", "SUSPENDED"] as const;
const verificationOptions = ["", "DRAFT", "PENDING", "VERIFIED", "REJECTED", "SUSPENDED"] as const;

export function AdminMarketplaceProfilesPanel({ viewerRole }: Props) {
  const canAct = viewerRole === "ADMIN";

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof statusOptions)[number]>("");
  const [verificationStatus, setVerificationStatus] = useState<(typeof verificationOptions)[number]>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ProfileItem[]>([]);
  const [busyById, setBusyById] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (verificationStatus) params.set("verificationStatus", verificationStatus);

      const url = params.toString() ? `/api/admin/marketplace/profiles?${params.toString()}` : "/api/admin/marketplace/profiles";
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
  }, [q, status, verificationStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => items, [items]);

  async function doAction(profileId: string, action: "SUSPEND" | "REACTIVATE") {
    setError(null);
    setBusyById((prev) => ({ ...prev, [profileId]: true }));

    try {
      const res = await fetch("/api/admin/marketplace/profiles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId, action }),
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
      setBusyById((prev) => ({ ...prev, [profileId]: false }));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profils marketplace</CardTitle>
        <CardDescription>
          Supervision V1 (suspension / réactivation).{!canAct && " Lecture seule (MODERATOR)."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-muted">{loading ? "Chargement…" : `${rows.length} profil(s)`}</div>

          <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
            <div className="w-full lg:w-[320px]">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (user, email, ville, id)…" />
            </div>

            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-[180px]"
              value={status}
              onChange={(e) => setStatus(e.target.value as (typeof statusOptions)[number])}
              aria-label="Filtrer par status"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s || "Tous status"}
                </option>
              ))}
            </select>

            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/85 px-3 text-sm text-text transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:w-[210px]"
              value={verificationStatus}
              onChange={(e) => setVerificationStatus(e.target.value as (typeof verificationOptions)[number])}
              aria-label="Filtrer par verification"
            >
              {verificationOptions.map((s) => (
                <option key={s} value={s}>
                  {s || "Toutes vérifications"}
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
          <div className="rounded-[var(--radius-md)] border border-border bg-white p-3 text-sm text-muted">Aucun profil.</div>
        )}

        <div className="space-y-3">
          {rows.map((it) => {
            const busy = busyById[it.id] === true;
            const title = it.headline || it.organization || it.profession;
            const meta = `${it.country} · ${it.city} · ${it.format}`;
            const updated = new Date(it.updatedAt).toLocaleString();

            return (
              <Card key={it.id} className="hover:translate-y-0">
                <CardHeader>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <CardTitle className="text-base">{title}</CardTitle>
                    <div className="text-xs text-muted">Maj: {updated}</div>
                  </div>
                  <CardDescription>
                    Status: {it.status} · Vérif: {it.verificationStatus} · {meta}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="text-sm text-muted">
                    User: <Link className="text-primary hover:underline" href={`/admin/users/${it.user.id}`}>{it.user.fullName}</Link>
                    <span className="text-muted"> · {it.user.email}</span>
                  </div>

                  <div className="text-xs text-muted">
                    {it.user.accountType} · {it.user.accountStatus}{it.user.isCertified ? " · Certifié" : ""}
                    {it.licenseNumber ? ` · Licence: ${it.licenseNumber}` : ""}
                  </div>

                  {it.proofUrl ? (
                    <div className="text-xs">
                      <a className="text-primary hover:underline" href={it.proofUrl} target="_blank" rel="noreferrer">
                        Ouvrir la preuve
                      </a>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      variant="outline"
                      disabled={!canAct || busy || it.status === "SUSPENDED"}
                      onClick={() => void doAction(it.id, "SUSPEND")}
                    >
                      Suspendre
                    </Button>

                    <Button
                      variant="primary"
                      disabled={!canAct || busy || it.status !== "SUSPENDED"}
                      onClick={() => void doAction(it.id, "REACTIVATE")}
                    >
                      Réactiver
                    </Button>

                    {!canAct && <div className="text-sm text-muted sm:ml-auto">Actions désactivées pour MODERATOR.</div>}
                  </div>

                  <div className="text-xs text-muted">Profile ID: {it.id}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
