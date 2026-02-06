"use client";

import * as React from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AvatarBubble } from "@/components/ui/avatar-bubble";

type JobApplicationStatus = "RECUE" | "EN_COURS" | "RETENUE" | "REFUSEE";

type Application = {
  id: string;
  createdAt: string;
  status: JobApplicationStatus;
  cvUrl: string;
  applicant: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    email: string;
    preRegistrationData: {
      residenceSituation: string | null;
    } | null;
  };
  job: {
    id: string;
    title: string;
    jobType: string;
    domain: string;
  };
};

type ApiResponse = {
  applications: Application[];
};

const STATUS_LABELS: Record<JobApplicationStatus, string> = {
  RECUE: "Reçue",
  EN_COURS: "En cours",
  RETENUE: "Retenue",
  REFUSEE: "Refusée",
};

const STATUS_COLORS: Record<JobApplicationStatus, string> = {
  RECUE: "bg-blue-100 text-blue-700",
  EN_COURS: "bg-yellow-100 text-yellow-700",
  RETENUE: "bg-green-100 text-green-700",
  REFUSEE: "bg-gray-100 text-gray-700",
};

export function ReceivedApplicationsView() {
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
      const res = await fetch("/api/jobs/applications");
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

  async function updateStatus(applicationId: string, newStatus: JobApplicationStatus) {
    try {
      const res = await fetch("/api/jobs/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de la mise à jour du statut");
      }

      // Rafraîchir la liste
      await fetchApplications();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted">Chargement des candidatures...</p>
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
          <h1 className="text-2xl font-bold text-navy">Candidatures reçues</h1>
          <p className="text-sm text-muted">
            {applications.length} candidature{applications.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-md border border-border bg-white p-8 text-center">
          <p className="text-muted">Aucune candidature reçue pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.id}
              className="rounded-md border border-border bg-white p-4 transition hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <AvatarBubble
                  url={app.applicant.avatarUrl}
                  name={app.applicant.fullName}
                  size="md"
                />

                {/* Informations */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-navy">{app.applicant.fullName}</h3>
                      <p className="text-sm text-muted">{app.applicant.email}</p>
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
                    <p className="font-medium text-navy">Offre : {app.job.title}</p>
                    <p className="text-muted">
                      {app.job.jobType} • {app.job.domain}
                    </p>
                    <p className="text-muted">
                      Candidature reçue le {new Date(app.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(app.cvUrl, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                      Télécharger CV
                    </Button>

                    <div className="flex gap-2">
                      {app.status !== "EN_COURS" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(app.id, "EN_COURS")}
                        >
                          Marquer en cours
                        </Button>
                      )}
                      {app.status !== "RETENUE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(app.id, "RETENUE")}
                          className="text-green-600 hover:text-green-700"
                        >
                          Retenir
                        </Button>
                      )}
                      {app.status !== "REFUSEE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus(app.id, "REFUSEE")}
                          className="text-red-600 hover:text-red-700"
                        >
                          Refuser
                        </Button>
                      )}
                    </div>
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
