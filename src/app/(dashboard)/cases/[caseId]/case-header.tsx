"use client";

import { useState } from "react";

const options: Array<{ value: string; label: string }> = [
  { value: "PENDING", label: "En attente" },
  { value: "ACCEPTED", label: "Acceptée" },
  { value: "REJECTED", label: "Refusée" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "DONE", label: "Terminée" },
];

type Props = {
  caseId: string;
  title: string;
  description: string;
  status: string;
  viewerRole: "REQUESTER" | "PROFESSIONAL";
  canEditStatus: boolean;
  otherUserName: string;
  onStatusChange?: (next: string) => void;
};

export function CaseHeader({ caseId, title, description, status, viewerRole, canEditStatus, otherUserName, onStatusChange }: Props) {
  const [current, setCurrent] = useState(status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(next: string) {
    if (next === current) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setCurrent(data.status);
      onStatusChange?.(data.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-muted">Dossier</p>
          <h1 className="text-xl font-semibold text-navy">{title}</h1>
          <p className="text-sm text-muted mt-1 whitespace-pre-line">{description}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-muted">
              Avec {otherUserName}
            </span>
            {!canEditStatus && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-navy">
                Statut: {current}
              </span>
            )}
          </div>
        </div>
        {canEditStatus && (
          <div className="flex flex-col items-end gap-2 min-w-[180px]">
            <label className="text-xs font-semibold text-muted">Statut</label>
            <select
              className="w-full rounded-md border border-border px-2 py-2 text-sm focus:border-navy focus:outline-none"
              value={current}
              disabled={saving}
              onChange={(e) => updateStatus(e.target.value)}
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <p className="text-[11px] text-muted">{saving ? "Mise à jour..." : ""}</p>
          </div>
        )}
      </div>
      <div className="mt-3 text-xs text-muted">
        Rôle : {viewerRole === "REQUESTER" ? "Demandeur" : "Professionnel"}
      </div>
    </div>
  );
}
