"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type EmploymentProfileDto = {
  professionalTitle: string;
  domain: string;
  experienceLevel: string;
  availability: string;
  residenceCountry: string;
  workPreference: string;
  targetProvinces: string[];
  contractTypes: string[];
  immigrationSupport: string;
  primaryLanguage: string;
  otherLanguagesText: string;
  cvUrl: string;
  consentUseCv: boolean;
  accuracyConfirmed: boolean;
};

type ApiGet = {
  profile: EmploymentProfileDto | null;
  isComplete: boolean;
};

const PROVINCES = [
  { code: "QC", label: "Québec" },
  { code: "ON", label: "Ontario" },
  { code: "BC", label: "Colombie-Britannique" },
  { code: "AB", label: "Alberta" },
  { code: "MB", label: "Manitoba" },
  { code: "SK", label: "Saskatchewan" },
  { code: "NS", label: "Nouvelle-Écosse" },
  { code: "NB", label: "Nouveau-Brunswick" },
  { code: "PE", label: "Île-du-Prince-Édouard" },
  { code: "NL", label: "Terre-Neuve-et-Labrador" },
];

const DOMAIN_OPTIONS = [
  { value: "TECH", label: "Tech" },
  { value: "SANTE", label: "Santé" },
  { value: "COMMERCE_GESTION", label: "Commerce & Gestion" },
  { value: "INGENIERIE", label: "Ingénierie" },
  { value: "TECHNIQUE", label: "Technique" },
  { value: "AUTRE", label: "Autre" },
];

const JOB_TYPES = [
  { value: "CDI", label: "CDI" },
  { value: "CDD", label: "CDD" },
  { value: "STAGE", label: "Stage" },
  { value: "MISSION", label: "Mission" },
  { value: "FREELANCE", label: "Freelance" },
];

const EMPTY: EmploymentProfileDto = {
  professionalTitle: "",
  domain: "",
  experienceLevel: "INTERMEDIATE",
  availability: "IMMEDIATE",
  residenceCountry: "",
  workPreference: "CANADA_ONLY",
  targetProvinces: [],
  contractTypes: [],
  immigrationSupport: "NO",
  primaryLanguage: "FR",
  otherLanguagesText: "",
  cvUrl: "",
  consentUseCv: false,
  accuracyConfirmed: false,
};

export function EmploymentProfileEditor() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);
  const [isComplete, setIsComplete] = React.useState(false);

  const [form, setForm] = React.useState<EmploymentProfileDto>(EMPTY);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/jobs/employment-profile", { method: "GET" });
        if (!res.ok) throw new Error("Impossible de charger le profil emploi.");
        const payload = (await res.json()) as ApiGet;
        if (cancelled) return;
        setForm(payload.profile ?? EMPTY);
        setIsComplete(Boolean(payload.isComplete));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleArrayValue(key: "targetProvinces" | "contractTypes", value: string) {
    setForm((prev) => {
      const current = prev[key];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  }

  async function uploadCv(file: File) {
    setUploading(true);
    setError(null);
    setOk(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/jobs/upload-cv", { method: "POST", body: fd });
      const payload = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;

      const url = payload?.url;

      if (!res.ok || !url) {
        throw new Error(payload?.error ?? "Upload du CV impossible.");
      }

      setForm((prev) => ({ ...prev, cvUrl: url }));
      setOk("CV importé.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    setOk(null);

    try {
      const res = await fetch("/api/jobs/employment-profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = (await res.json().catch(() => null)) as
        | { ok?: boolean; isComplete?: boolean; error?: string }
        | null;

      if (!res.ok) {
        throw new Error(payload?.error ?? "Impossible d’enregistrer le profil emploi.");
      }

      setIsComplete(Boolean(payload?.isComplete));
      setOk("Profil emploi enregistré.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted">Chargement…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Mon profil emploi</h1>
        <p className="mt-1 text-sm text-muted">
          Ce profil sert à candidater (il est distinct de votre profil CAPITUNE).
        </p>
        {isComplete ? (
          <div className="mt-2 text-sm text-green-700">Profil complet ✅</div>
        ) : (
          <div className="mt-2 text-sm text-muted">Profil incomplet — requis pour postuler.</div>
        )}
      </div>

      {error ? <div className="text-sm text-danger">{error}</div> : null}
      {ok ? <div className="text-sm text-green-700">{ok}</div> : null}

      <Card className="p-4 space-y-4">
        <div className="text-sm font-semibold text-navy">Informations professionnelles</div>

        <div>
          <label htmlFor="professionalTitle" className="block text-sm font-medium">
            Titre professionnel / métier principal *
          </label>
          <Input
            id="professionalTitle"
            value={form.professionalTitle}
            onChange={(e) => setForm((p) => ({ ...p, professionalTitle: e.target.value }))}
            placeholder="Ex: Développeur full-stack"
          />
        </div>

        <div>
          <label htmlFor="domain" className="block text-sm font-medium">
            Domaine d’activité *
          </label>
          <select
            id="domain"
            value={form.domain}
            onChange={(e) => setForm((p) => ({ ...p, domain: e.target.value }))}
            className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
          >
            <option value="">Sélectionner…</option>
            {DOMAIN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="experienceLevel" className="block text-sm font-medium">
              Niveau d’expérience *
            </label>
            <select
              id="experienceLevel"
              value={form.experienceLevel}
              onChange={(e) => setForm((p) => ({ ...p, experienceLevel: e.target.value }))}
              className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
            >
              <option value="ENTRY">Débutant / Junior</option>
              <option value="INTERMEDIATE">Intermédiaire</option>
              <option value="SENIOR">Senior</option>
              <option value="EXPERT">Expert</option>
            </select>
          </div>

          <div>
            <label htmlFor="availability" className="block text-sm font-medium">
              Disponibilité *
            </label>
            <select
              id="availability"
              value={form.availability}
              onChange={(e) => setForm((p) => ({ ...p, availability: e.target.value }))}
              className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
            >
              <option value="IMMEDIATE">Immédiate</option>
              <option value="ONE_TO_THREE_MONTHS">1–3 mois</option>
              <option value="MORE_THAN_THREE_MONTHS">+3 mois</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="text-sm font-semibold text-navy">Mobilité & immigration</div>

        <div>
          <label htmlFor="residenceCountry" className="block text-sm font-medium">
            Pays de résidence actuel *
          </label>
          <Input
            id="residenceCountry"
            value={form.residenceCountry}
            onChange={(e) => setForm((p) => ({ ...p, residenceCountry: e.target.value }))}
            placeholder="Ex: Maroc"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="workPreference" className="block text-sm font-medium">
              Souhaite travailler *
            </label>
            <select
              id="workPreference"
              value={form.workPreference}
              onChange={(e) => setForm((p) => ({ ...p, workPreference: e.target.value }))}
              className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
            >
              <option value="CANADA_ONLY">Canada uniquement</option>
              <option value="CANADA_AND_REMOTE">Canada + Remote</option>
            </select>
          </div>

          <div>
            <label htmlFor="immigrationSupport" className="block text-sm font-medium">
              Besoin d’accompagnement immigration *
            </label>
            <select
              id="immigrationSupport"
              value={form.immigrationSupport}
              onChange={(e) => setForm((p) => ({ ...p, immigrationSupport: e.target.value }))}
              className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
            >
              <option value="YES">Oui</option>
              <option value="NO">Non</option>
              <option value="IN_PROGRESS">En cours</option>
            </select>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium">Province(s) ciblée(s)</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {PROVINCES.map((p) => (
              <label key={p.code} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.targetProvinces.includes(p.code)}
                  onChange={() => toggleArrayValue("targetProvinces", p.code)}
                />
                {p.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium">Type de contrat recherché *</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {JOB_TYPES.map((t) => (
              <label key={t.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.contractTypes.includes(t.value)}
                  onChange={() => toggleArrayValue("contractTypes", t.value)}
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="text-sm font-semibold text-navy">Langues</div>

        <div>
          <label htmlFor="primaryLanguage" className="block text-sm font-medium">
            Langue principale *
          </label>
          <select
            id="primaryLanguage"
            value={form.primaryLanguage}
            onChange={(e) => setForm((p) => ({ ...p, primaryLanguage: e.target.value }))}
            className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
          >
            <option value="FR">Français</option>
            <option value="EN">Anglais</option>
            <option value="BILINGUE">Bilingue FR/EN</option>
          </select>
        </div>

        <div>
          <label htmlFor="otherLanguagesText" className="block text-sm font-medium">
            Autres langues (niveau)
          </label>
          <Textarea
            id="otherLanguagesText"
            value={form.otherLanguagesText}
            onChange={(e) => setForm((p) => ({ ...p, otherLanguagesText: e.target.value }))}
            placeholder="Ex: Espagnol (B2), Allemand (A2)"
          />
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="text-sm font-semibold text-navy">CV</div>

        <div className="text-sm text-muted">
          Le CV n’est pas public. Il est utilisé uniquement pour vos candidatures.
        </div>

        {form.cvUrl ? (
          <div className="text-sm">
            CV actuel: {" "}
            <a href={form.cvUrl} target="_blank" rel="noreferrer" className="underline">
              Ouvrir
            </a>
          </div>
        ) : (
          <div className="text-sm text-muted">Aucun CV importé.</div>
        )}

        <label className="block text-sm">
          <input
            type="file"
            accept=".pdf"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              if (!f) return;
              void uploadCv(f);
              e.currentTarget.value = "";
            }}
            className="w-full text-sm"
          />
          <span className="mt-1 block text-xs text-muted">PDF uniquement, max 10MB.</span>
        </label>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-sm font-semibold text-navy">Consentements</div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.consentUseCv}
            onChange={(e) => setForm((p) => ({ ...p, consentUseCv: e.target.checked }))}
          />
          <span>J’autorise l’utilisation de mon CV pour les candidatures</span>
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.accuracyConfirmed}
            onChange={(e) => setForm((p) => ({ ...p, accuracyConfirmed: e.target.checked }))}
          />
          <span>Je confirme l’exactitude des informations</span>
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={save} disabled={saving || uploading}>
            {saving ? "Enregistrement…" : "Enregistrer mon profil emploi"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/emploi/parcourir";
            }}
          >
            Retour aux offres
          </Button>
        </div>
      </Card>
    </div>
  );
}
