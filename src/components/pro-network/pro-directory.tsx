"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AvatarBubble } from "@/components/ui/avatar-bubble";
import { cn } from "@/lib/cn";

export type DirectoryPro = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  profession: string;
  professionLabel: string;
  organization: string | null;
  country: string;
  city: string;
  languages: string[];
  specialties: string[];
  isVerified: boolean;
  isPartnerWithViewer: boolean;
};

export function ProDirectory({
  items,
  onPropose,
}: {
  items: DirectoryPro[];
  onPropose: (targetUserId: string) => void;
}) {
  const [q, setQ] = React.useState("");
  const [profession, setProfession] = React.useState("");
  const [specialty, setSpecialty] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [language, setLanguage] = React.useState("");
  const [city, setCity] = React.useState("");
  const [status, setStatus] = React.useState<"" | "VERIFIED" | "PARTNER" | "OCCASIONAL">("");

  const professions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const it of items) map.set(it.profession, it.professionLabel);
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [items]);

  const languages = React.useMemo(() => {
    const set = new Set<string>();
    for (const it of items) for (const l of it.languages) set.add(l);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [items]);

  const specialties = React.useMemo(() => {
    const set = new Set<string>();
    for (const it of items) for (const s of it.specialties) set.add(s);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [items]);

  const countries = React.useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const c = it.country?.trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [items]);

  const cities = React.useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const c = it.city?.trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [items]);

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((it) => {
      if (profession && it.profession !== profession) return false;
      if (specialty && !it.specialties.includes(specialty)) return false;
      if (country && it.country !== country) return false;
      if (language && !it.languages.includes(language)) return false;
      if (city && it.city !== city) return false;

      if (status === "VERIFIED" && !it.isVerified) return false;
      if (status === "PARTNER" && !it.isPartnerWithViewer) return false;
      if (status === "OCCASIONAL" && it.isPartnerWithViewer) return false;

      if (!query) return true;
      const hay = [
        it.fullName,
        it.organization ?? "",
        it.professionLabel,
        it.city,
        it.country,
        it.languages.join(" "),
        it.specialties.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [items, q, profession, specialty, country, language, city, status]);

  return (
    <Card id="annuaire">
      <CardHeader>
        <CardTitle>Professionnels du réseau</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher (nom, orga, spécialité…)"
            className="lg:col-span-2"
          />

          <select
            className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm"
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
          >
            <option value="">Métier (tous)</option>
            {professions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <select
            className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          >
            <option value="">Spécialité (toutes)</option>
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="">Pays / région (tous)</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="">Langue (toutes)</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          <select
            className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="">Ville (toutes)</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="">Statut (tous)</option>
            <option value="VERIFIED">Vérifié</option>
            <option value="PARTNER">Partenaire</option>
            <option value="OCCASIONAL">Intervenant occasionnel</option>
          </select>

          <div className="flex gap-2 lg:col-span-6">
            <Button
              variant="outline"
              className="bg-white/70"
              onClick={() => {
                setQ("");
                setProfession("");
                setSpecialty("");
                setCountry("");
                setLanguage("");
                setCity("");
                setStatus("");
              }}
            >
              Réinitialiser
            </Button>
            <div className="flex items-center text-xs text-muted">
              {filtered.length} résultat(s)
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3 text-sm text-muted">
            Aucun professionnel ne correspond à vos filtres.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((it) => (
              <ProCard key={it.userId} item={it} onPropose={onPropose} />
            ))}
          </div>
        )}

        <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3 text-sm text-muted">
          Pas de messagerie libre: toute interaction passe par une demande structurée de collaboration.
        </div>
      </CardContent>
    </Card>
  );
}

function chip(text: string) {
  return (
    <span className="rounded-full border border-border bg-white/70 px-2 py-0.5 text-xs text-muted">
      {text}
    </span>
  );
}

function ProCard({
  item,
  onPropose,
}: {
  item: DirectoryPro;
  onPropose: (targetUserId: string) => void;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3">
      <div className="flex items-start gap-3">
        <AvatarBubble
          name={item.fullName}
          url={item.avatarUrl}
          size="lg"
        />

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-navy">
            {item.fullName}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {chip(item.professionLabel)}
            {item.isVerified ? (
              <span className="rounded-full border border-border bg-white/70 px-2 py-0.5 text-xs font-semibold text-navy">
                Vérifié
              </span>
            ) : null}
            {item.isPartnerWithViewer ? (
              <span className="rounded-full border border-border bg-white/70 px-2 py-0.5 text-xs font-semibold text-green-700">
                Partenaire
              </span>
            ) : (
              <span className="rounded-full border border-border bg-white/70 px-2 py-0.5 text-xs font-semibold text-muted">
                Intervenant occasionnel
              </span>
            )}
          </div>

          {item.organization ? (
            <div className="mt-1 truncate text-xs text-muted">{item.organization}</div>
          ) : null}

          <div className="mt-1 truncate text-xs text-muted">
            {item.city} • {item.country}
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {item.specialties.slice(0, 4).map((s) => (
              <span key={s} className="rounded-full border border-border bg-white/70 px-2 py-0.5 text-[11px] text-text">
                {s}
              </span>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {item.languages.slice(0, 4).map((l) => (
              <span key={l} className="rounded-full border border-border bg-white/70 px-2 py-0.5 text-[11px] text-muted">
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={`/marketplace/${item.userId}`}
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-xs font-semibold text-navy hover:bg-white",
          )}
        >
          Voir le profil
        </Link>
        <Button
          size="sm"
          className="h-9 bg-navy text-xs text-white hover:bg-navy/90"
          onClick={() => onPropose(item.userId)}
        >
          Proposer une collaboration
        </Button>
      </div>
    </div>
  );
}
