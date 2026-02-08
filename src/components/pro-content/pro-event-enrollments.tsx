"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { readApiError } from "@/components/pro-content/api";

type EnrollmentRow = {
  id: string;
  paymentStatus: "PENDING" | "PAID" | "REFUNDED" | "FAILED" | string;
  stripeSessionId: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string | null;
    email: string | null;
    accountType: string;
  };
};

type Response = {
  item?: {
    id: string;
    type: "EVENT" | "TRAINING";
    title: string;
    isPaid: boolean;
    currency: string;
    priceCents: number | null;
  };
  enrollments?: EnrollmentRow[];
  error?: string;
};

function money(item: { isPaid: boolean; currency: string; priceCents: number | null }) {
  if (!item.isPaid) return "Gratuit";
  if (!item.priceCents) return "Payant";
  return `${(item.priceCents / 100).toFixed(2)} ${item.currency.toUpperCase()}`;
}

function fmt(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("fr-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProEventEnrollments({ contentId, backHref }: { contentId: string; backHref: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<Response["item"] | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/clients/content-items/${contentId}/enrollments`, { cache: "no-store" });
      const data = (await res.json()) as Response;

      if (!res.ok) {
        setItem(null);
        setEnrollments([]);
        setError(data.error ?? (await readApiError(res)));
        return;
      }

      setItem(data.item ?? null);
      setEnrollments(data.enrollments ?? []);
    } catch {
      setError("Erreur réseau.");
      setItem(null);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Inscrits</h1>
          {item ? (
            <p className="mt-1 text-sm text-muted">
              {item.title} — {money(item)}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">Liste des inscriptions.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={backHref}>
            <Button variant="outline">Retour</Button>
          </Link>
          <Button variant="outline" onClick={() => void load()}>Actualiser</Button>
        </div>
      </div>

      {error ? (
        <Card className="p-4">
          <div className="text-sm font-medium text-danger">Erreur</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-text">{error}</div>
        </Card>
      ) : null}

      {loading ? (
        <Card className="p-4">
          <div className="text-sm text-muted">Chargement…</div>
        </Card>
      ) : null}

      {!loading && enrollments.length === 0 ? (
        <Card className="p-4">
          <div className="text-sm text-muted">Aucune inscription pour le moment.</div>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {enrollments.map((e) => (
          <Card key={e.id} className="p-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                <span className="min-w-0 truncate">{e.user.fullName || e.user.email || e.user.id}</span>
                <span className="rounded-full border border-border bg-white/70 px-2 py-0.5 text-xs font-semibold text-muted">
                  {e.paymentStatus}
                </span>
              </CardTitle>
              <CardDescription>{fmt(e.createdAt)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-text">
                <div><span className="text-muted">Email:</span> {e.user.email ?? "—"}</div>
                <div><span className="text-muted">Compte:</span> {e.user.accountType}</div>
                <div><span className="text-muted">Stripe session:</span> {e.stripeSessionId ?? "—"}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
