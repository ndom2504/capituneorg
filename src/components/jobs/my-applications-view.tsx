"use client";

import * as React from "react";
import { ExternalLink, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AvatarBubble } from "@/components/ui/avatar-bubble";

type JobApplicationStatus = "RECUE" | "EN_COURS" | "RETENUE" | "REFUSEE";

type Application = {
  id: string;
  createdAt: string;
  status: JobApplicationStatus;
  cvUrl: string;
  job: {
    id: string;
    title: string;
    jobType: string;
    domain: string;
    city: string | null;
    province: string | null;
    remote: boolean;
    status: string;
    poster: {
      id: string;
      fullName: string;
      avatarUrl: string | null;
    };
  };
};

type ApiResponse = {
  applications: Application[];
};

const STATUS_LABELS: Record<JobApplicationStatus, string> = {
  RECUE: "Reçue",
  EN_COURS: "En cours d'examen",
  RETENUE: "Retenue",
  REFUSEE: "Refusée",
};

const STATUS_COLORS: Record<JobApplicationStatus, string> = {
  RECUE: "bg-blue-100 text-blue-700",
  EN_COURS: "bg-yellow-100 text-yellow-700",
  RETENUE: "bg-green-100 text-green-700",
  REFUSEE: "bg-gray-100 text-gray-700",
};

export function MyApplicationsView() {
  const [applications, setApplications] = React.useState<Application[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/jobs/my-applications");
      if (!res.ok) {
        throw new Error("Erreur lors du chargement des candidatures");
      }

      const data: ApiResponse = await res.json();
      setApplications(data.applications);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted">Chargement de vos candidatures...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Mes candidatures</h1>
          <p className="text-sm text-muted">
            {applications.length} candidature{applications.length !== 1 ? "s" : ""} envoyée
            {applications.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-md border border-border bg-white p-8 text-center">
          <p className="text-muted">Vous n'avez pas encore postulé à une offre</p>
          <Button variant="outline" className="mt-4" onClick={() => (window.location.href = "/emploi/parcourir")}>
            Parcourir les offres
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.id}
              className="rounded-md border border-border bg-white p-4 transition hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                {/* Avatar du recruteur */}
                <AvatarBubble
                  url={app.job.poster.avatarUrl}
                  name={app.job.poster.fullName}
                  size="md"
                />

                {/* Informations */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-navy">{app.job.title}</h3>
                      <p className="text-sm text-muted">{app.job.poster.fullName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[app.status]}`}
                      >
                        {STATUS_LABELS[app.status]}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm">
                    <p className="text-muted">
                      {app.job.jobType} • {app.job.domain}
                    </p>
                    <p className="text-muted">
                      {app.job.city && app.job.province
                        ? `${app.job.city}, ${app.job.province}`
                        : app.job.province || app.job.city || ""}
                      {app.job.remote && " • Remote"}
                    </p>
                    <p className="text-muted">
                      Candidature envoyée le {new Date(app.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(app.cvUrl, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                      Télécharger mon CV
                    </Button>

                    {app.job.status === "PUBLISHED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => (window.location.href = `/emploi/parcourir?job=${app.job.id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Voir l'offre
                      </Button>
                    )}

                    {app.job.status !== "PUBLISHED" && (
                      <span className="text-xs text-muted">(Offre fermée)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
