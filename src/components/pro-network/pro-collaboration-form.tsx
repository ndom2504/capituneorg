"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { DirectoryPro } from "./pro-directory";

type CollaborationType =
  | "DOSSIER_PARTAGE"
  | "INTERVENTION_PONCTUELLE"
  | "RECOMMANDATION_CROISEE"
  | "PARTENARIAT_LONG_TERME";

function typeLabel(t: CollaborationType) {
  switch (t) {
    case "DOSSIER_PARTAGE":
      return "Partage de dossier";
    case "INTERVENTION_PONCTUELLE":
      return "Intervention ponctuelle";
    case "RECOMMANDATION_CROISEE":
      return "Recommandation croisée";
    case "PARTENARIAT_LONG_TERME":
      return "Partenariat long terme";
  }
}

export function ProCollaborationForm({
  pros,
  preselectedUserId,
  onSubmitted,
}: {
  pros: DirectoryPro[];
  preselectedUserId?: string | null;
  onSubmitted?: () => void;
}) {
  const [targetUserId, setTargetUserId] = React.useState(preselectedUserId ?? "");
  const [collabType, setCollabType] = React.useState<CollaborationType>("INTERVENTION_PONCTUELLE");
  const [duration, setDuration] = React.useState("");
  const [context, setContext] = React.useState("");
  const [consent, setConsent] = React.useState(false);

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (preselectedUserId) setTargetUserId(preselectedUserId);
  }, [preselectedUserId]);

  async function submit() {
    setError(null);
    setOk(null);

    if (!targetUserId) {
      setError("Choisissez un professionnel.");
      return;
    }
    if (!consent) {
      setError("Vous devez confirmer l’accord de confidentialité.");
      return;
    }

    setBusy(true);
    try {
      const message = [
        `Type: ${typeLabel(collabType)}`,
        duration.trim() ? `Durée estimée: ${duration.trim()}` : null,
        context.trim() ? `Contexte: ${context.trim()}` : null,
        "Confidentialité: accord requis ✔️",
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch("/api/relationships/partnership", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUserId, message }),
      });

      const payload = (await res.json().catch(() => null)) as
        | { requestId?: string; status?: string; error?: string }
        | null;

      if (!res.ok) {
        setError(payload?.error ?? "Demande impossible.");
        return;
      }

      setOk("Demande envoyée.");
      setContext("");
      setDuration("");
      setConsent(false);
      onSubmitted?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card id="collaboration">
      <CardHeader>
        <CardTitle>Proposer une collaboration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="text-xs text-muted">Professionnel</div>
          <select
            className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
          >
            <option value="" disabled>
              Sélectionner…
            </option>
            {pros.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.fullName} — {p.professionLabel}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted">Type de collaboration</div>
          <select
            className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 text-sm"
            value={collabType}
            onChange={(e) => setCollabType(e.target.value as CollaborationType)}
          >
            <option value="DOSSIER_PARTAGE">Partage de dossier</option>
            <option value="INTERVENTION_PONCTUELLE">Intervention ponctuelle</option>
            <option value="RECOMMANDATION_CROISEE">Recommandation croisée</option>
            <option value="PARTENARIAT_LONG_TERME">Partenariat long terme</option>
          </select>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted">Durée estimée (optionnel)</div>
          <Input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Ex: 2 semaines, 1 appel, 3 mois…"
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted">Contexte</div>
          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Décrivez le besoin, le cadre, et ce que vous attendez de la collaboration…"
          />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span className="text-muted">
            Confidentialité: je confirme que tout partage d’information client requiert le consentement.
          </span>
        </label>

        {error ? (
          <div className="rounded-[var(--radius-md)] border border-border bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {ok ? (
          <div className="rounded-[var(--radius-md)] border border-border bg-green-50 px-3 py-2 text-sm text-green-700">
            {ok}
          </div>
        ) : null}

        <Button
          className="w-full bg-navy text-white hover:bg-navy/90"
          disabled={busy}
          onClick={submit}
        >
          {busy ? "Envoi…" : "Envoyer la demande"}
        </Button>

        <div className="text-xs text-muted">
          Statuts disponibles: Envoyée / Acceptée / Refusée (mode MVP).
        </div>
      </CardContent>
    </Card>
  );
}
