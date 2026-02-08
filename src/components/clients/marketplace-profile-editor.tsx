"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProfileMediaUploader } from "@/components/profile/profile-media-uploader";
import {
  SERVICE_CATEGORIES,
  SERVICES_PICKER,
  type ServiceId,
  isServiceId,
  serviceLabel,
} from "@/lib/taxonomy";
import {
  PROFESSION_CATEGORIES,
  PROFESSIONS_PICKER,
  getProfession,
  isRegulatedProfession,
  professionLabel,
  type ProfessionCategoryId,
} from "@/lib/professions";

type ProfileStatus = "DRAFT" | "PUBLISHED" | "SUSPENDED";

type Format = "VISIO" | "IN_PERSON" | "BOTH";

type ResponseTime = "H24" | "H48" | "H72";

type PricingMode = "FREE" | "PAID";

type ApiProfile = {
  id: string;
  userId: string;
  status: ProfileStatus;
  isVerified: boolean;
  verificationStatus?: string;
  rejectionReason?: string | null;
  profession: string; // Legacy
  primaryProfessionId: string;
  secondaryProfessionIds: string[];
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

type ViewerInfo = { fullName: string; avatarUrl: string | null; isCertified?: boolean };

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

function professionCategoryFromProfessionId(id: string): ProfessionCategoryId {
  return (
    getProfession(id)?.category ??
    (PROFESSION_CATEGORIES[0]?.id as ProfessionCategoryId)
  );
}

export function MarketplaceProfileEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ title: string; detail?: string } | null>(null);
  const [lastIntent, setLastIntent] = useState<ProfileStatus | null>(null);

  const [profileId, setProfileId] = useState<string | null>(null);

  const [status, setStatus] = useState<ProfileStatus>("DRAFT");
  const [primaryProfessionCategory, setPrimaryProfessionCategory] =
    useState<ProfessionCategoryId>(PROFESSION_CATEGORIES[0]?.id);
  const [primaryProfessionId, setPrimaryProfessionId] = useState<string>(
    PROFESSIONS_PICKER[0]?.id ?? "profession.immigration.orientation_counselor",
  );
  const [secondaryProfessionIds, setSecondaryProfessionIds] = useState<string[]>([]);
  const [secondaryProfessionCategory, setSecondaryProfessionCategory] =
    useState<ProfessionCategoryId>(PROFESSION_CATEGORIES[0]?.id);
  const [secondaryProfessionToAdd, setSecondaryProfessionToAdd] = useState<string>("");

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
  const [viewerIsCertified, setViewerIsCertified] = useState<boolean | null>(null);

  const languages = useMemo(() => parseList(languagesText), [languagesText]);

  const hasRegulatedProfession = useMemo(() => {
    if (isRegulatedProfession(primaryProfessionId)) return true;
    return secondaryProfessionIds.some((id) => isRegulatedProfession(id));
  }, [primaryProfessionId, secondaryProfessionIds]);

  const hasEmployerService = useMemo(
    () =>
      servicesSelected.some(
        (id) => id === "service.employeur" || id.startsWith("service.employeur."),
      ),
    [servicesSelected],
  );

  const primaryProfessionsForCategory = useMemo(() => {
    return PROFESSIONS_PICKER.filter((p) => p.category === primaryProfessionCategory);
  }, [primaryProfessionCategory]);

  const secondaryProfessionsForCategory = useMemo(() => {
    return PROFESSIONS_PICKER.filter((p) => p.category === secondaryProfessionCategory);
  }, [secondaryProfessionCategory]);

  useEffect(() => {
    const first = secondaryProfessionsForCategory.find((p) => p.id !== primaryProfessionId)?.id ?? "";
    setSecondaryProfessionToAdd(first);
  }, [secondaryProfessionsForCategory, primaryProfessionId]);

  const pickerServicesByCategory = useMemo(() => {
    type PickerService = (typeof SERVICES_PICKER)[number];
    const byCategory = new Map<string, PickerService[]>();
    for (const svc of SERVICES_PICKER) {
      const key = svc.category ?? "__UNCATEGORIZED__";
      const arr = byCategory.get(key);
      if (arr) arr.push(svc);
      else byCategory.set(key, [svc]);
    }
    return byCategory;
  }, []);

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
          setViewer({
            fullName: dataWithViewer.viewer.fullName,
            avatarUrl: dataWithViewer.viewer.avatarUrl,
          });
          setViewerIsCertified(dataWithViewer.viewer.isCertified ?? null);
        }

        if (data.profile) {
          const p = data.profile;
          setProfileId(p.id);
          setStatus(p.status);
          setPrimaryProfessionId(p.primaryProfessionId);
          setPrimaryProfessionCategory(professionCategoryFromProfessionId(p.primaryProfessionId));
          setSecondaryProfessionIds(p.secondaryProfessionIds ?? []);
          setSecondaryProfessionCategory(PROFESSION_CATEGORIES[0]?.id);
          setSecondaryProfessionToAdd("");
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

  async function readApiError(res: Response) {
    try {
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const data = (await res.json()) as { error?: string };
        return data?.error || `HTTP ${res.status}`;
      }

      const text = await res.text();
      if (!text) return `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(text) as { error?: string };
        return parsed?.error || text;
      } catch {
        return text;
      }
    } catch {
      return `HTTP ${res.status}`;
    }
  }

  async function submit(nextStatus: ProfileStatus) {
    setSaving(true);
    setNotice(null);
    setError(null);
    setLastIntent(nextStatus);

    try {
      if (!complianceAccepted) {
        throw new Error("Vous devez accepter l’engagement de transparence.");
      }
      if (!accuracyConfirmed) {
        throw new Error("Vous devez confirmer l’exactitude des informations.");
      }

      if (!languages.length) {
        throw new Error("Au moins une langue est requise.");
      }
      if (!city.trim()) {
        throw new Error("Ville requise.");
      }
      if (!country.trim()) {
        throw new Error("Pays requis.");
      }
      if (!primaryProfessionId.trim()) {
        throw new Error("Métier principal requis.");
      }

      if (hasRegulatedProfession && nextStatus === "PUBLISHED") {
        if (!licenseNumber.trim() || !licenseAuthority.trim() || !proofUrl.trim()) {
          throw new Error(
            "Métier réglementé : licence + autorité + preuve sont requises. La publication est bloquée jusqu’à validation admin.",
          );
        }
      }

      const res = await fetch("/api/clients/marketplace-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          primaryProfessionId,
          secondaryProfessionIds,
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
          employerDetails: hasEmployerService ? employerDetails.trim() || null : null,
          pricingMode,
          price30Min: pricingMode === "PAID" && price30Min ? Number(price30Min) : null,
          price60Min: pricingMode === "PAID" && price60Min ? Number(price60Min) : null,
          complianceAccepted,
          accuracyConfirmed,
        }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      const payload = (await res.json()) as SaveResponse;
      if (payload.profile?.id) setProfileId(payload.profile.id);
      if (payload.profile?.status) setStatus(payload.profile.status);

      const resultingStatus = payload.profile?.status ?? nextStatus;
      if (nextStatus === "PUBLISHED") {
        if (resultingStatus === "PUBLISHED") {
          setNotice({
            title: "Profil publié",
            detail: "Votre profil est maintenant visible côté demandeur.",
          });
        } else {
          setNotice({
            title: "Profil enregistré (non publié)",
            detail:
              viewerIsCertified === false
                ? "Votre compte doit être certifié pour apparaître dans la Marketplace."
                : "La publication est en attente (validation admin / vérification des métiers).",
          });
        }
      } else if (nextStatus === "SUSPENDED") {
        setNotice({ title: "Profil suspendu" });
      } else {
        setNotice({ title: "Brouillon enregistré" });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft() {
    await submit("DRAFT");
  }

  async function publish() {
    await submit("PUBLISHED");
  }

  async function removeProfile() {
    if (!profileId) return;
    const confirmed = window.confirm(
      "Supprimer définitivement votre profil Marketplace ? Cette action est irréversible.",
    );
    if (!confirmed) return;

    setSaving(true);
    setNotice(null);
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
      setPrimaryProfessionCategory(PROFESSION_CATEGORIES[0]?.id);
      setPrimaryProfessionId(PROFESSIONS_PICKER[0]?.id ?? "profession.immigration.orientation_counselor");
      setSecondaryProfessionIds([]);
      setSecondaryProfessionCategory(PROFESSION_CATEGORIES[0]?.id);
      setSecondaryProfessionToAdd("");
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

      setNotice({ title: "Profil supprimé" });
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

      {viewerIsCertified === false ? (
        <Card className="p-4">
          <div className="text-sm font-medium text-danger">Publication indisponible</div>
          <div className="mt-1 text-sm text-text">
            Votre compte n’est pas certifié. Le profil ne peut pas être publié et n’apparaîtra pas côté demandeur.
          </div>
        </Card>
      ) : null}

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

      {notice ? (
        <Card className="p-4">
          <div className="text-sm font-medium text-navy">{notice.title}</div>
          {notice.detail ? <div className="mt-1 text-sm text-muted">{notice.detail}</div> : null}
          {lastIntent === "PUBLISHED" && status !== "PUBLISHED" ? (
            <div className="mt-2 text-xs text-muted">
              Statut actuel: <span className="font-semibold">Brouillon</span> (en attente).
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card className="p-4">
        <div className="space-y-3">
          <div>
            <div className="text-xs font-semibold text-muted">Statut</div>
            <select
              aria-label="Statut du profil"
              className="h-10 w-full rounded-(--radius-md) border border-border bg-white/70 px-3 text-sm text-text"
              value={status}
              disabled
            >
              <option value="DRAFT">Brouillon</option>
              <option value="PUBLISHED">Publié</option>
              <option value="SUSPENDED">Suspendu</option>
            </select>
            <div className="mt-1 text-xs text-muted">Pour publier, utilisez le bouton “Publier”.</div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Métier principal</div>

            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              <select
                aria-label="Catégorie de métier principal"
                className="h-10 w-full rounded-(--radius-md) border border-border bg-white/70 px-3 text-sm text-text"
                value={primaryProfessionCategory}
                onChange={(e) => {
                  const nextCat = e.target.value as ProfessionCategoryId;
                  setPrimaryProfessionCategory(nextCat);
                  const first = PROFESSIONS_PICKER.find((p) => p.category === nextCat)?.id;
                  if (first) setPrimaryProfessionId(first);
                }}
              >
                {PROFESSION_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Métier principal"
                className="h-10 w-full rounded-(--radius-md) border border-border bg-white/70 px-3 text-sm text-text"
                value={primaryProfessionId}
                onChange={(e) => {
                  const next = e.target.value;
                  setPrimaryProfessionId(next);
                  setPrimaryProfessionCategory(professionCategoryFromProfessionId(next));
                }}
              >
                {primaryProfessionsForCategory.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-1 text-xs text-muted">
              1 métier principal obligatoire. Les métiers (principal et secondaires) doivent être validés par l’admin.
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">Métiers secondaires (optionnel)</div>

            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              <select
                aria-label="Catégorie de métiers secondaires"
                className="h-10 w-full rounded-(--radius-md) border border-border bg-white/70 px-3 text-sm text-text"
                value={secondaryProfessionCategory}
                onChange={(e) => setSecondaryProfessionCategory(e.target.value as ProfessionCategoryId)}
              >
                {PROFESSION_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Métier secondaire"
                className="h-10 w-full rounded-(--radius-md) border border-border bg-white/70 px-3 text-sm text-text"
                value={secondaryProfessionToAdd}
                onChange={(e) => setSecondaryProfessionToAdd(e.target.value)}
              >
                <option value="">—</option>
                {secondaryProfessionsForCategory
                  .filter((p) => p.id !== primaryProfessionId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
              </select>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                disabled={!secondaryProfessionToAdd}
                onClick={() => {
                  const id = secondaryProfessionToAdd;
                  if (!id) return;
                  setSecondaryProfessionIds((prev) => {
                    if (prev.includes(id)) return prev;
                    if (prev.length >= 6) return prev;
                    return [...prev, id];
                  });
                  setSecondaryProfessionToAdd("");
                }}
              >
                Ajouter
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={!secondaryProfessionIds.length}
                onClick={() => setSecondaryProfessionIds([])}
              >
                Réinitialiser
              </Button>
            </div>

            {secondaryProfessionIds.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {secondaryProfessionIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/70 px-2 py-0.5 text-xs text-text"
                  >
                    {professionLabel(id)}
                    <button
                      type="button"
                      className="text-muted hover:text-text"
                      aria-label={`Retirer ${professionLabel(id)}`}
                      onClick={() =>
                        setSecondaryProfessionIds((prev) => prev.filter((x) => x !== id))
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {hasRegulatedProfession ? (
            <div className="rounded-(--radius-md) border border-border bg-white/60 p-3 text-xs text-muted">
              <div className="font-semibold text-text">Métier réglementé</div>
              <div className="mt-1">
                La soumission/représentation officielle n’est autorisée que pour les métiers réglementés. Licence +
                autorité + preuve sont requises, et la publication est bloquée jusqu’à validation admin.
              </div>
            </div>
          ) : null}

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
              aria-label="Format de rendez-vous"
              className="h-10 w-full rounded-(--radius-md) border border-border bg-white/70 px-3 text-sm text-text"
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
              aria-label="Délai de réponse"
              className="h-10 w-full rounded-(--radius-md) border border-border bg-white/70 px-3 text-sm text-text"
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
            <div className="mt-2 space-y-3">
              {SERVICE_CATEGORIES.map((cat) => {
                const items = pickerServicesByCategory.get(cat.id) ?? [];
                if (!items.length) return null;

                return (
                  <div key={cat.id}>
                    <div className="text-xs font-semibold text-muted">{cat.label}</div>
                    {cat.description ? (
                      <div className="mt-1 text-xs text-muted">{cat.description}</div>
                    ) : null}

                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {items.map((svc) => {
                        const checked = servicesSelected.includes(svc.id as ServiceId);
                        return (
                          <label
                            key={svc.id}
                            className="flex items-start gap-2 rounded-(--radius-md) border border-border bg-white/60 px-3 py-2 text-sm text-text"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? Array.from(new Set([...servicesSelected, svc.id as ServiceId]))
                                  : servicesSelected.filter((id) => id !== (svc.id as ServiceId));
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
                  </div>
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

            {hasEmployerService ? (
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
                aria-label="Mode de tarification"
                className="h-10 w-full rounded-(--radius-md) border border-border bg-white/70 px-3 text-sm text-text"
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
              <div className="text-xs font-semibold text-muted">
                Numéro de licence {hasRegulatedProfession ? "(requis)" : "(optionnel)"}
              </div>
              <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
            </div>
            <div>
              <div className="text-xs font-semibold text-muted">
                Autorité {hasRegulatedProfession ? "(requis)" : "(optionnel)"}
              </div>
              <Input value={licenseAuthority} onChange={(e) => setLicenseAuthority(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted">
              Lien justificatif {hasRegulatedProfession ? "(requis)" : "(optionnel)"}
            </div>
            <Input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://…" />
          </div>
        </div>

        <div className="mt-3 rounded-(--radius-md) border border-border bg-white/60 p-3 text-xs text-muted">
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

        <div className="mt-3 flex items-center gap-2">
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
          <div className="ml-auto flex flex-col items-end gap-2">
            <div className="text-xs text-muted">
              “Enregistrer” crée un brouillon : vous pourrez revenir le modifier plus tard.
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={saveDraft} disabled={saving || !complianceAccepted || !accuracyConfirmed}>
                Enregistrer
              </Button>
              <Button
                onClick={publish}
                disabled={
                  saving ||
                  !complianceAccepted ||
                  !accuracyConfirmed ||
                  viewerIsCertified === false
                }
              >
                Publier
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
