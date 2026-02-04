"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AvatarBubble } from "@/components/ui/avatar-bubble";
import { cn } from "@/lib/cn";

type ClientItem = {
  preRegistrationId: string;
  reviewId: string;
  createdAt: string;
  acceptedAt: string;
  firstName: string;
  lastName: string;
  email: string;
  recommendedTrack: string | null;
};

type ApiResponse = {
  items: ClientItem[];
};

function badge(status: "ACTIVE") {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs";
  if (status === "ACTIVE")
    return <span className={cn(base, "border-green-200 bg-green-50 text-green-700")}>Actif</span>;
  return <span className={cn(base, "border-slate-200 bg-slate-50 text-slate-700")}>{status}</span>;
}

export function ClientsActifs() {
  const [items, setItems] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let canceled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/clients/clients", {
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
      const hay = [it.firstName, it.lastName, it.email, it.recommendedTrack]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [items, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted">
          {loading ? "Chargement…" : `${filtered.length} client(s) actif(s)`}
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher (nom, email, parcours…)"
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
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((it) => {
          const fullName = `${it.firstName} ${it.lastName}`.trim();
          return (
            <Card key={it.reviewId} className="h-[360px] p-4">
              <div className="grid h-full grid-rows-[96px_1fr_52px]">
                <div className="flex items-start justify-center pt-2">
                  <AvatarBubble name={fullName || it.email} size="xl" />
                </div>

                <div className="min-w-0 overflow-hidden text-center">
                  <div className="max-w-full truncate text-base font-semibold text-navy">{fullName}</div>
                  <div className="mt-2 flex justify-center">{badge("ACTIVE")}</div>
                  <div className="mt-2 truncate text-sm text-muted">{it.email}</div>
                  {it.recommendedTrack ? (
                    <div className="mt-3 line-clamp-2 text-sm">
                      <span className="text-muted">Parcours:</span>{" "}
                      <span className="text-text">{it.recommendedTrack}</span>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-end">
                  <Link href={`/clients/preinscriptions/${it.preRegistrationId}`} className="w-full">
                    <Button className="h-11 w-full">Ouvrir</Button>
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}

        {!loading && !filtered.length && !error ? (
          <Card className="p-6">
            <div className="text-sm text-muted">Aucun client actif.</div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
