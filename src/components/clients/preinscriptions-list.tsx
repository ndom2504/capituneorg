"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AvatarBubble } from "@/components/ui/avatar-bubble";
import { cn } from "@/lib/cn";

type ReviewStatus =
  | "NEW"
  | "IN_REVIEW"
  | "ACCEPTED"
  | "REJECTED"
  | "NEEDS_INFO";

type PreinscriptionListItem = {
  id: string;
  createdAt: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  objective: string;
  desiredStart: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  constraints: string[];
  review:
    | {
        id: string;
        status: ReviewStatus;
        updatedAt: string;
      }
    | null;
};

type ApiResponse = {
  items: PreinscriptionListItem[];
};

function badge(status: ReviewStatus | "SUBMITTED" | string) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs";

  if (status === "ACCEPTED")
    return <span className={cn(base, "border-green-200 bg-green-50 text-green-700")}>Acceptée</span>;
  if (status === "REJECTED")
    return <span className={cn(base, "border-red-200 bg-red-50 text-red-700")}>Refusée</span>;
  if (status === "NEEDS_INFO")
    return <span className={cn(base, "border-amber-200 bg-amber-50 text-amber-800")}>Infos requises</span>;
  if (status === "IN_REVIEW")
    return <span className={cn(base, "border-blue-200 bg-blue-50 text-blue-700")}>En analyse</span>;
  if (status === "NEW")
    return <span className={cn(base, "border-slate-200 bg-slate-50 text-slate-700")}>Nouveau</span>;
  if (status === "SUBMITTED")
    return <span className={cn(base, "border-slate-200 bg-slate-50 text-slate-700")}>Soumise</span>;

  return <span className={cn(base, "border-slate-200 bg-slate-50 text-slate-700")}>{String(status)}</span>;
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PreinscriptionsList() {
  const [items, setItems] = useState<PreinscriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let canceled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/clients/preinscriptions", {
          method: "GET",
          headers: { "content-type": "application/json" },
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as ApiResponse;
        if (!canceled) setItems(data.items ?? []);
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
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;

    return items.filter((it) => {
      const hay = [
        it.firstName,
        it.lastName,
        it.email,
        it.objective,
        it.review?.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [items, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-muted">
            {loading
              ? "Chargement…"
              : `${filtered.length} préinscription(s)`}
          </div>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher (nom, email, statut…)"
            className="w-full sm:w-[320px]"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setQ("")}
            disabled={!q}
          >
            Effacer
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="p-4">
          <div className="text-sm font-medium text-danger">Erreur</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-text">
            {error}
          </div>
          <div className="mt-3">
            <Button
              onClick={() => {
                setItems([]);
                setError(null);
                setLoading(true);
                // force reload
                window.location.reload();
              }}
            >
              Réessayer
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((it) => {
          const title = `${it.firstName} ${it.lastName}`.trim();
          const budgetText =
            it.budgetMin != null && it.budgetMax != null
              ? `${formatMoney(it.budgetMin)} – ${formatMoney(it.budgetMax)}`
              : it.budgetMax != null
                ? `≤ ${formatMoney(it.budgetMax)}`
                : it.budgetMin != null
                  ? `≥ ${formatMoney(it.budgetMin)}`
                  : "—";

          return (
            <Card key={it.id} className="h-[360px] p-4">
              <div className="grid h-full grid-rows-[96px_1fr_52px]">
                <div className="flex items-start justify-center pt-2">
                  <AvatarBubble name={title || it.email} size="xl" />
                </div>

                <div className="min-w-0 overflow-hidden text-center">
                  <div className="max-w-full truncate text-base font-semibold text-navy">
                    {title || it.email}
                  </div>
                  <div className="mt-2 flex justify-center">{badge(it.review?.status ?? "NEW")}</div>

                  <div className="mt-2 truncate text-sm text-muted">{it.email}</div>
                  <div className="mt-2 line-clamp-2 text-sm text-text">Objectif: {it.objective}</div>
                  {it.desiredStart ? (
                    <div className="mt-2 truncate text-xs text-muted">Début: {it.desiredStart}</div>
                  ) : null}

                  <div className="mt-3 grid gap-1 text-sm">
                    <div className="truncate">
                      <span className="text-muted">Budget:</span>{" "}
                      <span className="font-medium text-text">{budgetText}</span>
                    </div>
                    {it.constraints?.length ? (
                      <div className="line-clamp-2 text-xs">
                        <span className="text-muted">Contraintes:</span>{" "}
                        <span className="text-text">{it.constraints.join(", ")}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-end">
                  <Link href={`/clients/preinscriptions/${it.id}`} className="w-full">
                    <Button className="h-11 w-full">Ouvrir</Button>
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}

        {!loading && !filtered.length && !error ? (
          <Card className="p-6">
            <div className="text-sm text-muted">Aucune préinscription.</div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
