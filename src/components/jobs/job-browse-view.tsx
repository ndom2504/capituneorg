"use client";

import * as React from "react";

export function JobBrowseView() {
  const [jobs, setJobs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedJob, setSelectedJob] = React.useState<any>(null);

  React.useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => {
        setJobs(data.jobs || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Offres d'emploi</h1>
        <p className="mt-1 text-sm text-muted">
          Parcourez les offres et postulez avec votre CV
        </p>
      </div>

      {loading && (
        <div className="text-center py-12 text-muted">
          Chargement des offres...
        </div>
      )}

      {!loading && jobs.length === 0 && (
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
          <p className="font-medium text-muted">Aucune offre d'emploi disponible</p>
          <p className="mt-1 text-sm text-muted">
            Revenez plus tard pour découvrir de nouvelles opportunités
          </p>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-lg border border-border bg-white p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{job.title}</h3>
                  <p className="mt-1 text-sm text-muted">{job.poster?.fullName || "Employeur"}</p>
                  
                  <p className="mt-3 text-sm line-clamp-3">{job.description}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded bg-surface px-2 py-1 text-xs font-medium">
                      {formatJobType(job.jobType)}
                    </span>
                    <span className="rounded bg-surface px-2 py-1 text-xs font-medium">
                      {formatExperienceLevel(job.experienceLevel)}
                    </span>
                    {job.location && (
                      <span className="rounded bg-surface px-2 py-1 text-xs font-medium">
                        📍 {job.location}
                      </span>
                    )}
                    {job.remote && (
                      <span className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                        💼 À distance
                      </span>
                    )}
                    {(job.salaryMin || job.salaryMax) && (
                      <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                        💰 {formatSalary(job.salaryMin, job.salaryMax)}
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
      )}

      {selectedJob && (
        <JobApplicationModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}

function JobApplicationModal({ job, onClose }: { job: any; onClose: () => void }) {
  const [submitting, setSubmitting] = React.useState(false);
  const [cvFile, setCvFile] = React.useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    // Upload CV first if provided
    let cvUrl = null;
    if (cvFile) {
      const uploadFormData = new FormData();
      uploadFormData.append("file", cvFile);
      
      try {
        const uploadRes = await fetch("/api/user-media/upload", {
          method: "POST",
          body: uploadFormData,
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          cvUrl = uploadData.url;
        }
      } catch (error) {
        console.error("Erreur lors de l'upload du CV:", error);
      }
    }

    const data = {
      jobId: job.id,
      coverLetter: formData.get("coverLetter"),
      cvUrl,
    };

    try {
      const res = await fetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        alert("Candidature envoyée avec succès !");
        onClose();
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
              {formatExperienceLevel(job.experienceLevel)}
            </span>
            {job.location && (
              <span className="rounded bg-surface px-2 py-1 text-xs font-medium">
                📍 {job.location}
              </span>
            )}
            {job.remote && (
              <span className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                💼 À distance
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="coverLetter" className="block text-sm font-medium">
              Lettre de motivation
            </label>
            <textarea
              id="coverLetter"
              name="coverLetter"
              rows={5}
              placeholder="Expliquez pourquoi vous êtes le candidat idéal pour ce poste..."
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cv" className="block text-sm font-medium">
              CV (facultatif)
            </label>
            <input
              type="file"
              id="cv"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              className="mt-1 w-full text-sm"
            />
            <p className="mt-1 text-xs text-muted">
              Formats acceptés: PDF, DOC, DOCX (max 5MB)
            </p>
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
    FULL_TIME: "Temps plein",
    PART_TIME: "Temps partiel",
    CONTRACT: "Contrat",
    INTERNSHIP: "Stage",
    TEMPORARY: "Temporaire",
  };
  return types[type] || type;
}

function formatExperienceLevel(level: string): string {
  const levels: Record<string, string> = {
    ENTRY: "Débutant",
    INTERMEDIATE: "Intermédiaire",
    SENIOR: "Senior",
    EXPERT: "Expert",
  };
  return levels[level] || level;
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
