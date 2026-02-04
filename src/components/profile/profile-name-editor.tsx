"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfileNameEditor({
  initialFullName,
}: {
  initialFullName: string;
}) {
  const router = useRouter();

  const [value, setValue] = React.useState(initialFullName);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<string | null>(null);

  const dirty = value.trim() !== initialFullName.trim();

  async function save() {
    setError(null);
    setSaved(null);

    const fullName = value.replace(/\s+/g, " ").trim();
    if (fullName.length < 2) {
      setError("Nom trop court.");
      return;
    }

    try {
      setBusy(true);
      const res = await fetch("/api/user-profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fullName }),
      });

      const payload = (await res.json().catch(() => null)) as
        | { fullName?: string; error?: string }
        | null;

      if (!res.ok || !payload?.fullName) {
        setError(payload?.error ?? "Impossible de modifier le nom.");
        return;
      }

      setSaved("Nom mis à jour.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-navy">Nom affiché</div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Votre nom"
        />
        <Button
          className="bg-navy hover:bg-navy/90"
          onClick={save}
          disabled={!dirty || busy}
        >
          Enregistrer
        </Button>
      </div>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {saved ? <div className="text-sm text-green-700">{saved}</div> : null}
    </div>
  );
}
