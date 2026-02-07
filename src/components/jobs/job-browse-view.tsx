"use client";

import * as React from "react";
import { Search, Filter, X, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Job = {
  id: string;
  title: string;
  description: string;
  requirements?: string | null;
  publishedAt?: string | null;
  domain: string;
  province?: string | null;
  city?: string | null;
  jobType: string;
  remote?: boolean | null;
  languages?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  experienceLevel: string;
  poster?: {
    fullName?: string | null;
  } | null;
};

type UserProfile = {
  preRegistrationData?: {
    mainDomain?: string | null;
  } | null;
};

type SavedCv = {
  url: string;
  fileName: string;
  savedAt: string;
};

const CV_STORAGE_KEY = "capitune.userCv.v1";

function loadSavedCv(): SavedCv | null {
  try {
    const raw = window.localStorage.getItem(CV_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedCv>;
    if (!parsed.url || !parsed.fileName) return null;
    return {
      url: String(parsed.url),
      fileName: String(parsed.fileName),
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function persistSavedCv(cv: SavedCv | null) {
  try {
    if (!cv) {
      window.localStorage.removeItem(CV_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(cv));
  } catch {
    // ignore
  }
}

export function JobBrowseView() {
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedJob, setSelectedJob] = React.useState<Job | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);

  const [savedCv, setSavedCv] = React.useState<SavedCv | null>(null);
  const [cvBusy, setCvBusy] = React.useState(false);
  const [cvError, setCvError] = React.useState<string | null>(null);
  const [cvOk, setCvOk] = React.useState<string | null>(null);
  
  // États des filtres
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterDomain, setFilterDomain] = React.useState("all");
  const [filterProvince, setFilterProvince] = React.useState("all");
  const [filterJobType, setFilterJobType] = React.useState("all");
  const [filterRemote, setFilterRemote] = React.useState("all");
  const [showFilters, setShowFilters] = React.useState(false);

  React.useEffect(() => {
    setSavedCv(loadSavedCv());

    // Récupérer le profil utilisateur
    fetch("/api/user-profile")
      .then((res) => res.json())
      .then((data: unknown) => {
        const payload = data as { user?: UserProfile | null };
        setUserProfile(payload.user ?? null);
      })
      .catch(() => {});

    // Récupérer les offres
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data: unknown) => {
        const payload = data as { jobs?: Job[] };
        setJobs(Array.isArray(payload.jobs) ? payload.jobs : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function uploadAndSaveCv(file: File) {
    setCvBusy(true);
    setCvError(null);
    setCvOk(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/jobs/upload-cv", { method: "POST", body: form });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const payload = (await res.json()) as { url?: string };
      if (!payload.url) throw new Error("Upload impossible.");

      const next: SavedCv = {
        url: payload.url,
        fileName: file.name,
        savedAt: new Date().toISOString(),
      };
      setSavedCv(next);
      persistSavedCv(next);
      setCvOk("CV importé");
    } catch (e) {
      setCvError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setCvBusy(false);
    }
  }

  function removeSavedCv() {
    setSavedCv(null);
    persistSavedCv(null);
    setCvOk("CV retiré");
    setCvError(null);
  }

  // Filtrage des offres
  const filteredJobs = jobs.filter((job) => {
    // Recherche par mot-clé
    if (searchQuery && !job.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !job.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filtre domaine
    if (filterDomain !== "all" && job.domain !== filterDomain) return false;
    
    // Filtre province
    if (filterProvince !== "all" && job.province !== filterProvince) return false;
    
    // Filtre type de contrat
    if (filterJobType !== "all" && job.jobType !== filterJobType) return false;
    
    // Filtre remote
    if (filterRemote === "yes" && !job.remote) return false;
    if (filterRemote === "no" && job.remote) return false;
    
    return true;
  });

  const hasActiveFilters = filterDomain !== "all" || filterProvince !== "all" || 
                          filterJobType !== "all" || filterRemote !== "all" || searchQuery !== "";

  function clearFilters() {
    setSearchQuery("");
    setFilterDomain("all");
    setFilterProvince("all");
    setFilterJobType("all");
    setFilterRemote("all");
  }

  function isNewJob(publishedAt: string | null): boolean {
    if (!publishedAt) return false;
    const published = new Date(publishedAt);
    const now = new Date();
    const daysDiff = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff < 7;
  }

  // Identifier les offres recommandées (match avec le domaine de l'utilisateur)
  function isRecommendedForUser(job: Job): boolean {
    if (!userProfile?.preRegistrationData?.mainDomain) return false;
    return job.domain === userProfile.preRegistrationData.mainDomain;
  }

  // Séparer les offres recommandées et les autres
  const recommendedJobs = filteredJobs.filter(isRecommendedForUser);
  const otherJobs = filteredJobs.filter(job => !isRecommendedForUser(job));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Offres d’emploi</h1>
        <p className="mt-1 text-sm text-muted">
          Parcourez les offres et postulez avec votre CV
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-navy">Mon CV</div>
            <div className="mt-1 text-xs text-muted">
              Importez votre CV une fois, puis utilisez-le pour postuler plus vite.
            </div>
            {savedCv ? (
              <div className="mt-2 text-xs text-muted">
                Actuel: {" "}
                <a
                  className="underline"
                  href={savedCv.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {savedCv.fileName}
                </a>
              </div>
            ) : (
              <div className="mt-2 text-xs text-muted">Aucun CV importé.</div>
            )}
            {cvError ? (
              <div className="mt-2 whitespace-pre-wrap text-xs text-danger">{cvError}</div>
            ) : null}
            {cvOk ? <div className="mt-2 text-xs text-muted">{cvOk}</div> : null}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                disabled={cvBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  if (!f) return;
                  void uploadAndSaveCv(f);
                  e.currentTarget.value = "";
                }}
                className="w-full text-sm"
              />
              <span className="mt-1 block text-xs text-muted">PDF recommandé, max 10MB.</span>
            </label>
            {savedCv ? (
              <Button
                variant="outline"
                className="border-danger/30 text-danger hover:bg-danger/5"
                onClick={removeSavedCv}
                disabled={cvBusy}
              >
                Retirer mon CV
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Barre de recherche et filtres */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {/* Recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Rechercher par titre ou description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-white pl-10 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {/* Bouton filtres */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? "border-primary bg-primary text-white"
                : "border-border bg-white text-navy hover:bg-surface"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filtres
            {hasActiveFilters && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs text-primary">
                ●
              </span>
            )}
          </button>
        </div>

        {/* Panneau de filtres */}
        {showFilters && (
          <div className="rounded-md border border-border bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-navy">Filtres de recherche</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <X className="h-4 w-4" />
                  Réinitialiser
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Domaine */}
              <div>
                <label
                  htmlFor="filterDomain"
                  className="mb-1 block text-xs font-medium text-muted"
                >
                  Domaine
                </label>
                <select
                  id="filterDomain"
                  value={filterDomain}
                  onChange={(e) => setFilterDomain(e.target.value)}
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="all">Tous les domaines</option>
                  <option value="TECH">Tech</option>
                  <option value="SANTE">Santé</option>
                  <option value="COMMERCE_GESTION">Commerce & Gestion</option>
                  <option value="INGENIERIE">Ingénierie</option>
                  <option value="TECHNIQUE">Technique</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>

              {/* Province */}
              <div>
                <label
                  htmlFor="filterProvince"
                  className="mb-1 block text-xs font-medium text-muted"
                >
                  Province
                </label>
                <select
                  id="filterProvince"
                  value={filterProvince}
                  onChange={(e) => setFilterProvince(e.target.value)}
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="all">Toutes les provinces</option>
                  <option value="QC">Québec</option>
                  <option value="ON">Ontario</option>
                  <option value="BC">Colombie-Britannique</option>
                  <option value="AB">Alberta</option>
                  <option value="MB">Manitoba</option>
                  <option value="SK">Saskatchewan</option>
                  <option value="NS">Nouvelle-Écosse</option>
                  <option value="NB">Nouveau-Brunswick</option>
                  <option value="PE">Île-du-Prince-Édouard</option>
                  <option value="NL">Terre-Neuve-et-Labrador</option>
                </select>
              </div>

              {/* Type de contrat */}
              <div>
                <label
                  htmlFor="filterJobType"
                  className="mb-1 block text-xs font-medium text-muted"
                >
                  Type de contrat
                </label>
                <select
                  id="filterJobType"
                  value={filterJobType}
                  onChange={(e) => setFilterJobType(e.target.value)}
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="all">Tous les types</option>
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="STAGE">Stage</option>
                  <option value="MISSION">Mission</option>
                  <option value="FREELANCE">Freelance</option>
                </select>
              </div>

              {/* Remote */}
              <div>
                <label
                  htmlFor="filterRemote"
                  className="mb-1 block text-xs font-medium text-muted"
                >
                  Travail à distance
                </label>
                <select
                  id="filterRemote"
                  value={filterRemote}
                  onChange={(e) => setFilterRemote(e.target.value)}
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="all">Tous</option>
                  <option value="yes">Oui</option>
                  <option value="no">Non</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Résultats de filtrage */}
        {!loading && (
          <div className="text-sm text-muted">
            {filteredJobs.length} offre{filteredJobs.length !== 1 ? "s" : ""} trouvée{filteredJobs.length !== 1 ? "s" : ""}
            {hasActiveFilters && " (filtré)"}
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-12 text-muted">
          Chargement des offres...
        </div>
      )}

      {!loading && filteredJobs.length === 0 && jobs.length === 0 && (
        <div className="rounded-lg border border-border bg-white p-12 text-center">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-muted opacity-30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          <p className="font-medium text-muted">Aucune offre d’emploi disponible</p>
          <p className="mt-1 text-sm text-muted">
            Revenez plus tard pour découvrir de nouvelles opportunités
          </p>
        </div>
      )}

      {!loading && filteredJobs.length === 0 && jobs.length > 0 && (
        <div className="rounded-md border border-border bg-white p-8 text-center">
          <p className="text-muted">Aucune offre ne correspond à vos critères</p>
          <button
            onClick={clearFilters}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {!loading && filteredJobs.length > 0 && (
        <div className="space-y-6">
          {/* Offres recommandées */}
          {recommendedJobs.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                <h2 className="font-semibold text-navy">Recommandées pour vous</h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {recommendedJobs.length}
                </span>
              </div>
              <div className="grid gap-4">
                {recommendedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-lg border-2 border-amber-200 bg-linear-to-br from-amber-50/50 to-white p-5 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{job.title}</h3>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Recommandé
                          </span>
                          {isNewJob(job.publishedAt ?? null) && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              Nouveau
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted">{job.poster?.fullName || "Employeur"}</p>
                        
                        <p className="mt-3 text-sm line-clamp-3">{job.description}</p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded bg-surface px-2 py-1 text-xs font-medium">
                            {formatJobType(job.jobType)}
                          </span>
                          <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                            {job.domain}
                          </span>
                          {(job.city || job.province) && (
                            <span className="rounded bg-surface px-2 py-1 text-xs font-medium">
                              📍 {job.city}{job.city && job.province ? ", " : ""}{job.province}
                            </span>
                          )}
                          {job.remote && (
                            <span className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                              💼 Remote
                            </span>
                          )}
                          {job.languages && (
                            <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-navy">
                              🗣️ {formatLanguages(job.languages)}
                            </span>
                          )}
                          {(job.salaryMin || job.salaryMax) && (
                            <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-navy">
                              💰 {formatSalary(job.salaryMin ?? null, job.salaryMax ?? null)}
                            </span>
                          )}
                        </div>

                        <div className="mt-4">
                          <button
                            onClick={() => setSelectedJob(job)}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                          >
                            Voir les détails et postuler
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Autres offres */}
          {otherJobs.length > 0 && (
            <div>
              {recommendedJobs.length > 0 && (
                <h2 className="mb-3 font-semibold text-navy">Autres offres</h2>
              )}
              <div className="grid gap-4">
                {otherJobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-lg border border-border bg-white p-5 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-2">
                          <h3 className="font-semibold text-lg">{job.title}</h3>
                          {isNewJob(job.publishedAt ?? null) && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              Nouveau
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted">{job.poster?.fullName || "Employeur"}</p>
                        
                        <p className="mt-3 text-sm line-clamp-3">{job.description}</p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded bg-surface px-2 py-1 text-xs font-medium">
                            {formatJobType(job.jobType)}
                          </span>
                          <span className="rounded bg-surface px-2 py-1 text-xs font-medium">
                            {job.domain}
                          </span>
                          {(job.city || job.province) && (
                            <span className="rounded bg-surface px-2 py-1 text-xs font-medium">
                              📍 {job.city}{job.city && job.province ? ", " : ""}{job.province}
                            </span>
                          )}
                          {job.remote && (
                            <span className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                              💼 Remote
                            </span>
                          )}
                          {job.languages && (
                            <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-navy">
                              🗣️ {formatLanguages(job.languages)}
                            </span>
                          )}
                          {(job.salaryMin || job.salaryMax) && (
                            <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-navy">
                              💰 {formatSalary(job.salaryMin ?? null, job.salaryMax ?? null)}
                            </span>
                          )}
                        </div>

                        <div className="mt-4">
                          <button
                            onClick={() => setSelectedJob(job)}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                          >
                            Voir les détails et postuler
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedJob && (
        <JobApplicationModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          savedCv={savedCv}
        />
      )}
    </div>
  );
}

function JobApplicationModal({
  job,
  onClose,
  savedCv,
}: {
  job: Job;
  onClose: () => void;
  savedCv: SavedCv | null;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const [cvFile, setCvFile] = React.useState<File | null>(null);
  const [cvMode, setCvMode] = React.useState<"saved" | "upload">(savedCv ? "saved" : "upload");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (cvMode === "saved") {
      if (!savedCv?.url) {
        alert("Aucun CV importé. Veuillez téléverser un CV.");
        return;
      }
    } else {
      if (!cvFile) {
        alert("Veuillez sélectionner un CV (obligatoire)");
        return;
      }
    }
    
    setSubmitting(true);

    // Upload CV (obligatoire en V1)
    let cvUrl: string | null = null;
    if (cvMode === "saved") {
      cvUrl = savedCv?.url ?? null;
    } else {
      const uploadFormData = new FormData();
      uploadFormData.append("file", cvFile as File);

      try {
        const uploadRes = await fetch("/api/jobs/upload-cv", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          alert(errorData.error || "Erreur lors de l'upload du CV");
          setSubmitting(false);
          return;
        }

        const uploadData = await uploadRes.json();
        cvUrl = uploadData.url;
      } catch (error) {
        console.error("Erreur lors de l'upload du CV:", error);
        alert("Erreur lors de l'upload du CV");
        setSubmitting(false);
        return;
      }
    }

    const data = {
      jobId: job.id,
      cvUrl,
    };

    try {
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        alert("Candidature envoyée avec succès ! Vous pouvez suivre son statut dans 'Mes candidatures'.");
        onClose();
        window.location.href = "/emploi/mes-candidatures";
      } else {
        const error = await res.json();
        alert(error.error || "Erreur lors de l'envoi de la candidature");
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'envoi de la candidature");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{job.title}</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-muted hover:text-text"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 space-y-4 border-b border-border pb-6">
          <div>
            <h3 className="font-medium">Description</h3>
            <p className="mt-1 text-sm text-muted whitespace-pre-wrap">{job.description}</p>
          </div>

          {job.requirements && (
            <div>
              <h3 className="font-medium">Exigences</h3>
              <p className="mt-1 text-sm text-muted whitespace-pre-wrap">{job.requirements}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <span className="rounded bg-surface px-2 py-1 text-xs font-medium">
              {formatJobType(job.jobType)}
            </span>
            <span className="rounded bg-surface px-2 py-1 text-xs font-medium">
              {job.domain}
            </span>
            <span className="rounded bg-surface px-2 py-1 text-xs font-medium">
              {formatExperienceLevel(job.experienceLevel)}
            </span>
            {(job.city || job.province) && (
              <span className="rounded bg-surface px-2 py-1 text-xs font-medium">
                📍 {job.city}{job.city && job.province ? ", " : ""}{job.province}
              </span>
            )}
            {job.remote && (
              <span className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                💼 Remote
              </span>
            )}
            {job.languages && (
              <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-navy">
                🗣️ {formatLanguages(job.languages)}
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md bg-primary/10 p-4">
            <p className="text-sm text-navy">
              <strong>V1 : Candidature simplifiée</strong><br />
              Pour postuler, déposez simplement votre CV (PDF recommandé). Aucune lettre de motivation requise.
            </p>
          </div>

          <div>
            <label htmlFor="cv" className="block text-sm font-medium">
              CV (obligatoire) *
            </label>

            {savedCv ? (
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="cvMode"
                    checked={cvMode === "saved"}
                    onChange={() => setCvMode("saved")}
                  />
                  <span>
                    Utiliser mon CV importé: <span className="font-medium">{savedCv.fileName}</span>
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="cvMode"
                    checked={cvMode === "upload"}
                    onChange={() => setCvMode("upload")}
                  />
                  <span>Téléverser un autre CV pour cette candidature</span>
                </label>
              </div>
            ) : null}

            <input
              type="file"
              id="cv"
              accept=".pdf,.doc,.docx"
              required={cvMode === "upload"}
              disabled={cvMode === "saved"}
              onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              className="mt-1 w-full text-sm"
            />
            <p className="mt-1 text-xs text-muted">
              Formats acceptés: PDF (recommandé), DOC, DOCX (max 10MB)
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="confirm"
                required
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="confirm" className="text-sm">
                Je confirme que mon CV est exact et à jour
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Envoi..." : "Envoyer ma candidature"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatJobType(type: string): string {
  const types: Record<string, string> = {
    CDI: "CDI",
    CDD: "CDD",
    STAGE: "Stage",
    MISSION: "Mission",
    FREELANCE: "Freelance",
  };
  return types[type] || type;
}

function formatExperienceLevel(level: string): string {
  const levels: Record<string, string> = {
    ENTRY: "Junior",
    INTERMEDIATE: "Intermédiaire",
    SENIOR: "Senior",
    EXPERT: "Expert",
  };
  return levels[level] || level;
}

function formatLanguages(lang: string): string {
  const languages: Record<string, string> = {
    FR: "Français",
    EN: "Anglais",
    BILINGUE: "Bilingue FR/EN",
  };
  return languages[lang] || lang;
}

function formatSalary(min: number | null, max: number | null): string {
  if (min && max) {
    return `${min.toLocaleString()} - ${max.toLocaleString()} $ CAD`;
  }
  if (min) {
    return `À partir de ${min.toLocaleString()} $ CAD`;
  }
  if (max) {
    return `Jusqu'à ${max.toLocaleString()} $ CAD`;
  }
  return "";
}
