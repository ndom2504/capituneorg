"use client";

import * as React from "react";

export function ProfessionalJobOffersView() {
  const [showCreateForm, setShowCreateForm] = React.useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes offres d'emploi</h1>
          <p className="mt-1 text-sm text-muted">
            Créez et gérez vos offres d'emploi
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          Créer une offre
        </button>
      </div>

      {showCreateForm && (
        <CreateJobForm onClose={() => setShowCreateForm(false)} />
      )}

      <JobOffersList />
    </div>
  );
}

function CreateJobForm({ onClose }: { onClose: () => void }) {
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title"),
      description: formData.get("description"),
      requirements: formData.get("requirements"),
      jobType: formData.get("jobType"),
      domain: formData.get("domain"),
      experienceLevel: formData.get("experienceLevel"),
      city: formData.get("city"),
      province: formData.get("province"),
      remote: formData.get("remote") === "on",
      languages: formData.get("languages"),
      startDate: formData.get("startDate") || null,
      deadline: formData.get("deadline") || null,
      salaryMin: formData.get("salaryMin") ? parseInt(formData.get("salaryMin") as string) : null,
      salaryMax: formData.get("salaryMax") ? parseInt(formData.get("salaryMax") as string) : null,
      status: formData.get("status"),
    };

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        onClose();
        window.location.reload();
      } else {
        alert("Erreur lors de la création de l'offre");
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la création de l'offre");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Créer une offre d'emploi</h2>
        <button
          onClick={onClose}
          className="text-muted hover:text-text"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium">
            Titre du poste *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium">
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={5}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="requirements" className="block text-sm font-medium">
            Exigences
          </label>
          <textarea
            id="requirements"
            name="requirements"
            rows={3}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="jobType" className="block text-sm font-medium">
              Type de contrat *
            </label>
            <select
              id="jobType"
              name="jobType"
              required
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="STAGE">Stage</option>
              <option value="MISSION">Mission</option>
              <option value="FREELANCE">Freelance</option>
            </select>
          </div>

          <div>
            <label htmlFor="domain" className="block text-sm font-medium">
              Domaine *
            </label>
            <select
              id="domain"
              name="domain"
              required
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="TECH">Tech</option>
              <option value="SANTE">Santé</option>
              <option value="COMMERCE_GESTION">Commerce & Gestion</option>
              <option value="INGENIERIE">Ingénierie</option>
              <option value="TECHNIQUE">Technique</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="experienceLevel" className="block text-sm font-medium">
              Niveau d'expérience
            </label>
            <select
              id="experienceLevel"
              name="experienceLevel"
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="ENTRY">Junior</option>
              <option value="INTERMEDIATE">Intermédiaire</option>
              <option value="SENIOR">Senior</option>
              <option value="EXPERT">Expert</option>
            </select>
          </div>

          <div>
            <label htmlFor="languages" className="block text-sm font-medium">
              Langue(s) *
            </label>
            <select
              id="languages"
              name="languages"
              required
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="FR">Français</option>
              <option value="EN">Anglais</option>
              <option value="BILINGUE">Bilingue (FR/EN)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium">
              Ville *
            </label>
            <input
              type="text"
              id="city"
              name="city"
              required
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="province" className="block text-sm font-medium">
              Province *
            </label>
            <select
              id="province"
              name="province"
              required
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Sélectionnez</option>
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
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="remote"
            name="remote"
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <label htmlFor="remote" className="text-sm">
            Travail à distance possible
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium">
              Date de début
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="deadline" className="block text-sm font-medium">
              Date limite de candidature
            </label>
            <input
              type="date"
              id="deadline"
              name="deadline"
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="salaryMin" className="block text-sm font-medium">
              Salaire min (CAD/an)
            </label>
            <input
              type="number"
              id="salaryMin"
              name="salaryMin"
              placeholder="50000"
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="salaryMax" className="block text-sm font-medium">
              Salaire max (CAD/an)
            </label>
            <input
              type="number"
              id="salaryMax"
              name="salaryMax"
              placeholder="80000"
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium">
            Statut de publication
          </label>
          <select
            id="status"
            name="status"
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="DRAFT">Brouillon (ne sera pas visible)</option>
            <option value="PUBLISHED">Publier immédiatement</option>
          </select>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "Création..." : "Créer l'offre"}
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
  );
}

function JobOffersList() {
  const [jobs, setJobs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/jobs?my=true")
      .then((res) => res.json())
      .then((data) => {
        setJobs(data.jobs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-white p-12 text-center">
        <p className="text-muted">Chargement de vos offres...</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
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
        <p className="font-medium text-muted">Aucune offre d'emploi</p>
        <p className="mt-1 text-sm text-muted">
          Créez votre première offre pour commencer à recruter
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <div key={job.id} className="rounded-lg border border-border bg-white p-4 transition hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-navy">{job.title}</h3>
                  <p className="mt-1 text-sm text-muted line-clamp-2">{job.description}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  job.status === "PUBLISHED" ? "bg-green-100 text-green-700" :
                  job.status === "CLOSED" ? "bg-gray-100 text-gray-700" :
                  job.status === "ARCHIVED" ? "bg-gray-100 text-gray-600" :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {job.status === "PUBLISHED" ? "Publié" :
                   job.status === "CLOSED" ? "Fermé" :
                   job.status === "ARCHIVED" ? "Archivé" :
                   "Brouillon"}
                </span>
              </div>
              
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded bg-surface px-2 py-1 text-xs font-medium">
                  {job.jobType}
                </span>
                <span className="rounded bg-surface px-2 py-1 text-xs font-medium">
                  {job.domain}
                </span>
                {(job.city || job.province) && (
                  <span className="rounded bg-surface px-2 py-1 text-xs font-medium">
                    {job.city}{job.city && job.province ? ", " : ""}{job.province}
                  </span>
                )}
                {job.remote && (
                  <span className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                    Remote
                  </span>
                )}
                <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                  {job._count?.applications || 0} candidature{(job._count?.applications || 0) !== 1 ? "s" : ""}
                </span>
              </div>
              
              <div className="mt-3 text-xs text-muted">
                {job.publishedAt && (
                  <span>Publié le {new Date(job.publishedAt).toLocaleDateString("fr-FR")}</span>
                )}
                {!job.publishedAt && job.createdAt && (
                  <span>Créé le {new Date(job.createdAt).toLocaleDateString("fr-FR")}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
