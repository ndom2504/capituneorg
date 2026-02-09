"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

type UploadKind = "competence" | "id";

type UploadResult = {
  ok: boolean;
  url?: string;
  error?: string;
};

export function ProVerificationMobileUpload() {
  const sp = useSearchParams();
  const token = (sp.get("t") ?? "").trim();

  const [uploading, setUploading] = useState<UploadKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [competenceUrl, setCompetenceUrl] = useState<string | null>(null);
  const [idUrl, setIdUrl] = useState<string | null>(null);

  const linkOk = useMemo(() => token.length > 20, [token]);

  async function upload(kind: UploadKind, file: File) {
    setError(null);
    setUploading(kind);

    try {
      const form = new FormData();
      form.set("t", token);
      form.set("kind", kind);
      form.set("file", file);

      const res = await fetch("/api/public/pro-verification-doc", {
        method: "POST",
        body: form,
      });

      const data = (await res.json().catch(() => null)) as UploadResult | null;
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      const url = (data?.url ?? "").trim();
      if (!url) throw new Error("Upload incomplet (URL manquante).");

      if (kind === "competence") setCompetenceUrl(url);
      else setIdUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setUploading(null);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-navy">Téléverser vos documents</h1>
        <p className="text-sm text-muted">
          Prenez une photo ou importez un PDF. Une fois terminé, revenez sur votre ordinateur et cliquez sur
          Enregistrer.
        </p>
      </div>

      {!linkOk ? (
        <div className="mt-4 rounded-md border border-border bg-white p-4 text-sm">
          <div className="font-semibold text-navy">Lien invalide</div>
          <div className="mt-1 text-muted">
            Scannez à nouveau le QR code depuis la page de votre profil professionnel.
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="mt-5 space-y-3 rounded-md border border-border bg-white p-4">
        <div>
          <div className="text-sm font-semibold text-navy">1) Preuve de compétence</div>
          <div className="text-xs text-muted">Certificat / diplôme / licence… (PDF ou photo)</div>
          {competenceUrl ? (
            <a className="mt-2 block text-sm underline" href={competenceUrl} target="_blank" rel="noreferrer">
              Voir le document
            </a>
          ) : null}
        </div>
        <label className="block">
          <input
            type="file"
            accept="application/pdf,image/*"
            capture="environment"
            className="block w-full text-sm"
            disabled={!linkOk || uploading !== null}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void upload("competence", file);
            }}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={!competenceUrl}
          onClick={() => {
            // Pas d’action: le serveur a déjà mis à jour le profil.
          }}
        >
          {competenceUrl ? "Document enregistré" : "En attente"}
        </Button>
      </section>

      <section className="mt-4 space-y-3 rounded-md border border-border bg-white p-4">
        <div>
          <div className="text-sm font-semibold text-navy">2) Pièce d’identité</div>
          <div className="text-xs text-muted">Idéalement recto + verso (PDF ou photos)</div>
          {idUrl ? (
            <a className="mt-2 block text-sm underline" href={idUrl} target="_blank" rel="noreferrer">
              Voir le document
            </a>
          ) : null}
        </div>
        <label className="block">
          <input
            type="file"
            accept="application/pdf,image/*"
            capture="environment"
            className="block w-full text-sm"
            disabled={!linkOk || uploading !== null}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void upload("id", file);
            }}
          />
        </label>
        <Button type="button" variant="outline" disabled={!idUrl}>
          {idUrl ? "Document enregistré" : "En attente"}
        </Button>
      </section>

      <div className="mt-5 rounded-md border border-border bg-white p-4 text-sm">
        <div className="font-semibold text-navy">Étape suivante</div>
        <div className="mt-1 text-muted">
          Revenez sur votre ordinateur → Profil Marketplace → cliquez sur Enregistrer, puis “Demander la
          vérification”.
        </div>
      </div>
    </main>
  );
}
