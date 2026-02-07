"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProfileMediaUploader } from "@/components/profile/profile-media-uploader";
import { SERVICES, type ServiceId, isServiceId, serviceLabel } from "@/lib/taxonomy";

type ProfileStatus = "DRAFT" | "PUBLISHED" | "SUSPENDED";

type Profession =
  | "IMMIGRATION_CONSULTANT"
  | "IMMIGRATION_LAWYER"
  | "ORIENTATION_COUNSELOR"
  | "ACADEMIC_COUNSELOR"
  | "EMPLOYMENT_COUNSELOR"
  | "CASE_MANAGER"
  | "CERTIFIED_TRANSLATOR"
  | "INTEGRATION_COACH"
  | "COMMUNITY_ORG";

type Format = "VISIO" | "IN_PERSON" | "BOTH";

type ResponseTime = "H24" | "H48" | "H72";

type PricingMode = "FREE" | "PAID";

type ApiProfile = {
  id: string;
  userId: string;
  status: ProfileStatus;
  isVerified: boolean;
  profession: Profession;
  headline: string | null;
  organization: string | null;
  country: string;
  city: string;
  languages: string[];
  themes: string[];
  specialties: string[];
  services: string[];
  targetAudiences: string[];
  availability: unknown | null;
  format: Format;
  responseTime: ResponseTime | null;
  licenseNumber: string | null;
  licenseAuthority: string | null;
  proofUrl: string | null;
  bioShort: string | null;
  bioLong: string | null;

  employerDetails: string | null;
  pricingMode: PricingMode;
  price30Min: number | null;
  price60Min: number | null;
  updatedAt: string;
};

type GetResponse = { profile: ApiProfile | null };

type ViewerInfo = { fullName: string; avatarUrl: string | null };

type GetResponseWithViewer = { profile: ApiProfile | null; viewer?: ViewerInfo };

type SaveResponse = { ok?: boolean; profile?: { id: string; status: ProfileStatus; updatedAt: string } };

function parseList(text: string) {
  return text
    .split(/[,\n]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinList(list: string[]) {
  return (list ?? []).join(", ");
}

function professionLabel(p: Profession) {
  switch (p) {
    case "IMMIGRATION_CONSULTANT":
      return "Consultant en immigration";
    case "IMMIGRATION_LAWYER":
      return "Avocat en immigration";
    case "ORIENTATION_COUNSELOR":
      return "Conseiller d’orientation";
    case "ACADEMIC_COUNSELOR":
      return "Conseiller académique";
    case "EMPLOYMENT_COUNSELOR":
      return "Conseiller emploi";
    case "CASE_MANAGER":
      return "Gestionnaire de dossier";
    case "CERTIFIED_TRANSLATOR":
      return "Traducteur certifié";
    case "INTEGRATION_COACH":
      return "Coach d’intégration";
    case "COMMUNITY_ORG":
      return "Organisme communautaire";
    default:
      return p;
  }
}

export function MarketplaceProfileEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [profileId, setProfileId] = useState<string | null>(null);

  const [status, setStatus] = useState<ProfileStatus>("DRAFT");
  const [profession, setProfession] = useState<Profession>("ORIENTATION_COUNSELOR");
  const [headline, setHeadline] = useState("");
  const [organization, setOrganization] = useState("");
  const [country, setCountry] = useState("Canada");
  const [city, setCity] = useState("");
  const [languagesText, setLanguagesText] = useState("Français");
  const [themesText, setThemesText] = useState("");
  const [specialtiesText, setSpecialtiesText] = useState("");
  const [servicesSelected, setServicesSelected] = useState<ServiceId[]>([]);
  const [servicesOtherText, setServicesOtherText] = useState("");
  const [targetAudiencesText, setTargetAudiencesText] = useState("");
  const [format, setFormat] = useState<Format>("VISIO");
  const [responseTime, setResponseTime] = useState<ResponseTime | "">("H48");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseAuthority, setLicenseAuthority] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [bioShort, setBioShort] = useState("");
  const [bioLong, setBioLong] = useState("");

  const [employerDetails, setEmployerDetails] = useState("");
  const [pricingMode, setPricingMode] = useState<PricingMode>("FREE");
  const [price30Min, setPrice30Min] = useState("");
  const [price60Min, setPrice60Min] = useState("");

  const [complianceAccepted, setComplianceAccepted] = useState(false);
  const [accuracyConfirmed, setAccuracyConfirmed] = useState(false);

  const [viewer, setViewer] = useState<ViewerInfo | null>(null);

  const languages = useMemo(() => parseList(languagesText), [languagesText]);

  useEffect(() => {
    let canceled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/clients/marketplace-profile", {
          method: "GET",
          headers: { "content-type": "application/json" },
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as GetResponse;
        if (canceled) return;

        const dataWithViewer = data as unknown as GetResponseWithViewer;
        if (dataWithViewer.viewer) {
          setViewer(dataWithViewer.viewer);
        }

        if (data.profile) {
          const p = data.profile;
          setProfileId(p.id);
          setStatus(p.status);
          setProfession(p.profession);
          setHeadline(p.headline ?? "");
          setOrganization(p.organization ?? "");
          setCountry(p.country ?? "Canada");
          setCity(p.city ?? "");
          setLanguagesText(joinList(p.languages ?? []));
          setThemesText(joinList(p.themes ?? []));
          setSpecialtiesText(joinList(p.specialties ?? []));
          const existingServices = p.services ?? [];
          setServicesSelected(existingServices.filter((s): s is ServiceId => isServiceId(s)));
          setServicesOtherText(joinList(existingServices.filter((s) => !isServiceId(s))));
          setTargetAudiencesText(joinList(p.targetAudiences ?? []));
          setFormat(p.format ?? "VISIO");
          setResponseTime((p.responseTime as ResponseTime | null) ?? "");
          setLicenseNumber(p.licenseNumber ?? "");
          setLicenseAuthority(p.licenseAuthority ?? "");
          setProofUrl(p.proofUrl ?? "");
          setBioShort(p.bioShort ?? "");
          setBioLong(p.bioLong ?? "");
          setEmployerDetails(p.employerDetails ?? "");
          setPricingMode(p.pricingMode ?? "FREE");
          setPrice30Min(p.price30Min != null ? String(p.price30Min) : "");
          setPrice60Min(p.price60Min != null ? String(p.price60Min) : "");
        } else {
          setProfileId(null);
        }
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

  async function save() {
    setSaving(true);
    setOk(null);
    setError(null);

    try {
      if (!languages.length) {
        throw new Error("Au moins une langue est requise.");
      }
      if (!city.trim()) {
        throw new Error("Ville requise.");
      }
      if (!country.trim()) {
        throw new Error("Pays requis.");
      }

      const res = await fetch("/api/clients/marketplace-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status,
          profession,
          headline: headline.trim() || null,
          organization: organization.trim() || null,
          country: country.trim(),
          city: city.trim(),
          languages,
          themes: parseList(themesText),
          specialties: parseList(specialtiesText),
          services: [...servicesSelected, ...parseList(servicesOtherText)],
          targetAudiences: parseList(targetAudiencesText),
          format,
          responseTime: responseTime || null,
          licenseNumber: licenseNumber.trim() || null,
          licenseAuthority: licenseAuthority.trim() || null,
          proofUrl: proofUrl.trim() || null,
          bioShort: bioShort.trim() || null,
          bioLong: bioLong.trim() || null,
          employerDetails:
            servicesSelected.includes("service.employeur")
              ? employerDetails.trim() || null
              : null,
          pricingMode,
          price30Min: pricingMode === "PAID" && price30Min ? Number(price30Min) : null,
          price60Min: pricingMode === "PAID" && price60Min ? Number(price60Min) : null,
          complianceAccepted,
          accuracyConfirmed,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const payload = (await res.json()) as SaveResponse;
      setOk(payload.profile?.updatedAt ?? "OK");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function removeProfile() {
    if (!profileId) return;
    const confirmed = window.confirm(
      "Supprimer définitivement votre profil Marketplace ? Cette action est irréversible.",
    );
    if (!confirmed) return;

    setSaving(true);
    setOk(null);
    setError(null);

    try {
      const res = await fetch("/api/clients/marketplace-profile", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      setProfileId(null);
      setStatus("DRAFT");
      setProfession("ORIENTATION_COUNSELOR");
      setHeadline("");
      setOrganization("");
      setCountry("Canada");
      setCity("");
      setLanguagesText("Français");
      setThemesText("");
      setSpecialtiesText("");
      setServicesSelected([]);
      setServicesOtherText("");
      setTargetAudiencesText("");
      setFormat("VISIO");
      setResponseTime("H48");
      setLicenseNumber("");
      setLicenseAuthority("");
      setProofUrl("");
      setBioShort("");
      setBioLong("");
      setEmployerDetails("");
      setPricingMode("FREE");
      setPrice30Min("");
      setPrice60Min("");
      setComplianceAccepted(false);
      setAccuracyConfirmed(false);

      setOk("Profil supprimé");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-navy">Mon profil Marketplace</h2>
        <p className="mt-1 text-sm text-muted">
          Créez/éditez votre profil public. Aucun email/téléphone n’est affiché. Publication réservée aux pros certifiés.
        </p>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold text-navy">Photo de profil (visible en Marketplace)</div>
        <div className="mt-1 text-xs text-muted">
          Cette photo apparaît côté demandeur sur les fiches Marketplace et dans les demandes.
        </div>
        <div className="mt-3">
          <ProfileMediaUploader kind="avatar" initialUrl={viewer?.avatarUrl ?? null} />
        </div>
      </Card>

      {loading ? (
        <Card className="p-6">
          <div className="text-sm text-muted">Chargement…</div>
        </Card>
      ) : null}

      {error ? (
        <Card className="p-4">
          <div className="text-sm font-medium text-danger">Erreur</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-text">{error}</div>
        </Card>
      ) : null}

      {ok ? (
        <Card className="p-4">
          <div className="text-sm font-medium text-navy">Enregistré</div>
          <div className="mt-1 text-xs text-muted">Mis à jour: {ok}</div>
        </Card>
      ) : null}

      <Card className="p-4">
        <div className="space-y-3">
          <div>
            <div className="text-xs font-semibold text-muted">Statut</div>
            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProfileStatus)}
            >
              <option value="DRAFT">Brouillon</option>
              <option value="PUBLISHED">Publié</option>
              <option value="SUSPENDED">Suspendu</option>
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Métier</div>
            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
              value={profession}
              onChange={(e) => setProfession(e.target.value as Profession)}
            >
              {(
                [
                  "IMMIGRATION_CONSULTANT",
                  "IMMIGRATION_LAWYER",
                  "ORIENTATION_COUNSELOR",
                  "ACADEMIC_COUNSELOR",
                  "EMPLOYMENT_COUNSELOR",
                  "CASE_MANAGER",
                  "CERTIFIED_TRANSLATOR",
                  "INTEGRATION_COACH",
                  "COMMUNITY_ORG",
                ] as Profession[]
              ).map((p) => (
                <option key={p} value={p}>
                  {professionLabel(p)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Accroche</div>
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Ex: Spécialiste permis d’études"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Organisation (optionnel)</div>
            <Input
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Ex: Cabinet ABC"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-muted">Pays</div>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Canada" />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted">Ville</div>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Montréal" />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Langues (séparées par virgules)</div>
            <Input
              value={languagesText}
              onChange={(e) => setLanguagesText(e.target.value)}
              placeholder="Français, Anglais"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Format</div>
            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
              value={format}
              onChange={(e) => setFormat(e.target.value as Format)}
            >
              <option value="VISIO">Visio</option>
              <option value="IN_PERSON">Présentiel</option>
              <option value="BOTH">Visio + présentiel</option>
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Délai de réponse (optionnel)</div>
            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
              value={responseTime}
              onChange={(e) => setResponseTime(e.target.value as ResponseTime | "")}
            >
              <option value="">—</option>
              <option value="H24">24h</option>
              <option value="H48">48h</option>
              <option value="H72">72h</option>
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Thèmes (virgules)</div>
            <Input
              value={themesText}
              onChange={(e) => setThemesText(e.target.value)}
              placeholder="Études, permis, installation"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Spécialités (virgules)</div>
            <Input
              value={specialtiesText}
              onChange={(e) => setSpecialtiesText(e.target.value)}
              placeholder="CAQ, permis d’études…"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Services CAPITUNE (tags)</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {SERVICES.map((svc) => {
                const checked = servicesSelected.includes(svc.id);
                return (
                  <label
                    key={svc.id}
                    className="flex items-start gap-2 rounded-[var(--radius-md)] border border-border bg-white/60 px-3 py-2 text-sm text-text"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? Array.from(new Set([...servicesSelected, svc.id]))
                          : servicesSelected.filter((id) => id !== svc.id);
                        setServicesSelected(next);
                      }}
                    />
                    <span>
                      <span className="font-semibold text-navy">{serviceLabel(svc.id)}</span>
                      {svc.description ? (
                        <span className="mt-0.5 block text-xs text-muted">{svc.description}</span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-muted">Utilisez ces tags pour améliorer le matching automatique.</div>

            <div className="mt-3">
              <div className="text-xs font-semibold text-muted">Autres services (optionnel, virgules)</div>
              <Input
                value={servicesOtherText}
                onChange={(e) => setServicesOtherText(e.target.value)}
                placeholder="Ex: relecture dossier, stratégie…"
              />
            </div>

            {servicesSelected.includes("service.employeur") ? (
              <div className="mt-3">
                <div className="text-xs font-semibold text-muted">Détails emploi (visible sur votre profil)</div>
                <div className="mt-1 text-xs text-muted">
                  Décrivez les postes, conditions, prérequis, localisation, processus, etc.
                </div>
                <Textarea
                  value={employerDetails}
                  onChange={(e) => setEmployerDetails(e.target.value)}
                  rows={5}
                  placeholder="Ex: Postes ouverts, NOC/TEER, langue, remote/présentiel, salaire indicatif…"
                />
              </div>
            ) : null}
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Publics (virgules)</div>
            <Input
              value={targetAudiencesText}
              onChange={(e) => setTargetAudiencesText(e.target.value)}
              placeholder="Étudiants, familles…"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Bio courte (max ~300)</div>
            <Textarea value={bioShort} onChange={(e) => setBioShort(e.target.value)} rows={3} />
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Bio longue (max ~1000)</div>
            <Textarea value={bioLong} onChange={(e) => setBioLong(e.target.value)} rows={6} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <div className="text-xs font-semibold text-muted">Tarification</div>
              <select
                className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm text-text"
                value={pricingMode}
                onChange={(e) => setPricingMode(e.target.value as PricingMode)}
              >
                <option value="FREE">Gratuit</option>
                <option value="PAID">Payant</option>
              </select>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted">Prix 30 min (CAD)</div>
              <Input
                type="number"
                min={0}
                value={price30Min}
                onChange={(e) => setPrice30Min(e.target.value)}
                disabled={pricingMode !== "PAID"}
              />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted">Prix 60 min (CAD)</div>
              <Input
                type="number"
                min={0}
                value={price60Min}
                onChange={(e) => setPrice60Min(e.target.value)}
                disabled={pricingMode !== "PAID"}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-muted">Numéro de licence (optionnel)</div>
              <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted">Autorité (optionnel)</div>
              <Input value={licenseAuthority} onChange={(e) => setLicenseAuthority(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Lien justificatif (optionnel)</div>
            <Input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://…" />
          </div>
        </div>

        <div className="mt-3 rounded-[var(--radius-md)] border border-border bg-white/60 p-3 text-xs text-muted">
          <div className="font-semibold text-text">Conformité</div>
          <label className="mt-2 flex items-start gap-2">
            <input
              type="checkbox"
              checked={complianceAccepted}
              onChange={(e) => setComplianceAccepted(e.target.checked)}
            />
            <span>
              J’accepte l’engagement de transparence (pas de contact direct, respect des règles de la plateforme).
            </span>
          </label>
          <label className="mt-2 flex items-start gap-2">
            <input
              type="checkbox"
              checked={accuracyConfirmed}
              onChange={(e) => setAccuracyConfirmed(e.target.checked)}
            />
            <span>Je confirme que les informations fournies sont exactes.</span>
          </label>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          {profileId ? (
            <Button
              variant="outline"
              className="mr-auto border-danger/30 text-danger hover:bg-danger/5"
              onClick={removeProfile}
              disabled={saving}
            >
              Supprimer définitivement mon profil
            </Button>
          ) : null}
          <Button onClick={save} disabled={saving}>
            Enregistrer
          </Button>
        </div>
      </Card>
    </div>
  );
}
