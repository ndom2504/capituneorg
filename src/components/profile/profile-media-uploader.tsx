"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Kind = "avatar" | "cover";

type Props = {
  kind: Kind;
  initialUrl?: string | null;
};

export function ProfileMediaUploader({ kind, initialUrl }: Props) {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function onUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("file", file);

      const res = await fetch("/api/user-media", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "Échec du téléversement.");
      }

      setFile(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  const label = kind === "avatar" ? "Photo de profil" : "Photo de couverture";
  const hint =
    kind === "avatar"
      ? "PNG/JPEG/WebP · 5MB max"
      : "Recommandé: format large · PNG/JPEG/WebP · 5MB max";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-navy">{label}</div>
          <div className="text-xs text-muted">{hint}</div>
        </div>
      </div>

      <div className={cn("rounded-[var(--radius-md)] border border-border bg-white/60 p-3")}> 
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Preview kind={kind} url={previewUrl ?? initialUrl ?? null} />
            <div className="text-xs text-muted">
              {file ? file.name : "Aucun fichier sélectionné"}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-border bg-white/70 px-3 py-2 text-sm font-semibold text-text hover:bg-white">
              Choisir un fichier
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <Button disabled={!file || loading} onClick={onUpload}>
              {loading ? "Téléversement…" : "Téléverser"}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="mt-2 text-sm font-medium text-red-700">{error}</div>
        ) : null}
      </div>
    </div>
  );
}

function Preview({ kind, url }: { kind: Kind; url: string | null }) {
  if (kind === "cover") {
    return (
      <div className="h-14 w-28 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Aperçu" className="h-full w-full object-cover" />
        ) : null}
      </div>
    );
  }

  return (
    <div className="h-12 w-12 overflow-hidden rounded-full border border-border bg-surface">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Aperçu" className="h-full w-full object-cover" />
      ) : null}
    </div>
  );
}
