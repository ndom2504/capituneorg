"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  initialFullName: string;
  initialEmail: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
};

export function ProfileInfoEditor({
  initialFullName,
  initialEmail,
  avatarUrl,
  coverUrl,
}: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState(initialFullName);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    setFullName(initialFullName);
    setEmail(initialEmail);
    setError(null);
    setIsEditing(false);
  }

  function handleSave() {
    setError(null);

    const trimmedName = fullName.replace(/\s+/g, " ").trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      setError("Le nom doit contenir au moins 2 caractères.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setError("L'adresse email est invalide.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/user-profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fullName: trimmedName, email: trimmedEmail }),
        });

        const data = (await res.json().catch(() => null)) as
          | { fullName?: string; email?: string; error?: string }
          | null;

        if (!res.ok || !data?.fullName) {
          setError(data?.error ?? "Impossible de mettre à jour le profil.");
          return;
        }

        setIsEditing(false);
        router.refresh();
      } catch {
        setError("Une erreur est survenue lors de la sauvegarde.");
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-(--radius-md) border border-border bg-white/60">
      <div className="relative h-28">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt="Couverture"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--capitune-navy),var(--capitune-blue))]" />
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="-mt-12 h-16 w-16 shrink-0 rounded-full border border-border bg-white p-1 shadow-sm">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-navy">
                  {initialFullName.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 pt-2">
              {isEditing ? (
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">
                      Nom complet
                    </label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Votre nom"
                      disabled={isPending}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">
                      Adresse email
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      disabled={isPending}
                    />
                  </div>
                  {error ? <div className="text-sm text-red-600">{error}</div> : null}
                </div>
              ) : (
                <div>
                  <div className="text-sm font-semibold text-navy">{fullName}</div>
                  <div className="text-sm text-muted">{email}</div>
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 gap-2 pt-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  Annuler
                </Button>
                <Button
                  size="sm"
                  className="bg-navy hover:bg-navy/90"
                  onClick={handleSave}
                  disabled={isPending}
                >
                  {isPending ? "Sauvegarde..." : "Enregistrer"}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Modifier
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
