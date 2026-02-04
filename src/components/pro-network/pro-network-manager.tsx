"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Network = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  owner: { id: string; fullName: string; email: string };
  members: {
    userId: string;
    role: "OWNER" | "MEMBER";
    user: { id: string; fullName: string; email: string };
  }[];
};

export function ProNetworkManager({
  initialNetworks,
}: {
  initialNetworks: Network[];
}) {
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [memberEmail, setMemberEmail] = React.useState("");
  const [selectedNetworkId, setSelectedNetworkId] = React.useState<string>(
    initialNetworks[0]?.id ?? "",
  );
  const [addingMember, setAddingMember] = React.useState(false);
  const [memberError, setMemberError] = React.useState<string | null>(null);

  async function createNetwork() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/pro-networks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = (await res.json().catch(() => null)) as
        | null
        | { error?: string };

      if (!res.ok) {
        setError(data?.error ?? "Impossible de créer le réseau.");
        return;
      }

      setName("");
      setDescription("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function addMember() {
    setMemberError(null);
    if (!selectedNetworkId) {
      setMemberError("Choisissez un réseau.");
      return;
    }

    setAddingMember(true);
    try {
      const res = await fetch(`/api/pro-networks/${selectedNetworkId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: memberEmail }),
      });
      const data = (await res.json().catch(() => null)) as
        | null
        | { error?: string };

      if (!res.ok) {
        setMemberError(data?.error ?? "Impossible d’ajouter le membre.");
        return;
      }

      setMemberEmail("");
      router.refresh();
    } finally {
      setAddingMember(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <Card>
          <CardHeader>
            <CardTitle>Créer un réseau professionnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="text-xs text-muted">Nom du réseau</div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Réseau des consultants certifiés"
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted">Description (optionnel)</div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Objectif, spécialités, régions, etc."
              />
            </div>

            {error ? (
              <div className="rounded-[var(--radius-md)] border border-border bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <Button
              className="bg-navy hover:bg-navy/90"
              disabled={saving || name.trim().length < 2}
              onClick={createNetwork}
            >
              {saving ? "Création…" : "Créer"}
            </Button>

            <div className="pt-2 text-xs text-muted">
              Visible uniquement sur le dashboard professionnel.
            </div>
          </CardContent>
        </Card>

        <div className="h-4" />

        <Card>
          <CardHeader>
            <CardTitle>Ajouter un professionnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="text-xs text-muted">Réseau</div>
              <select
                className="w-full rounded-[var(--radius-md)] border border-border bg-white/70 px-3 py-2 text-sm"
                value={selectedNetworkId}
                onChange={(e) => setSelectedNetworkId(e.target.value)}
              >
                <option value="" disabled>
                  Sélectionner…
                </option>
                {initialNetworks.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted">Email du professionnel</div>
              <Input
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="pro2@capitune.local"
              />
            </div>

            {memberError ? (
              <div className="rounded-[var(--radius-md)] border border-border bg-red-50 px-3 py-2 text-sm text-red-700">
                {memberError}
              </div>
            ) : null}

            <Button
              variant="outline"
              className="bg-white/70"
              disabled={addingMember || !selectedNetworkId || !memberEmail.trim()}
              onClick={addMember}
            >
              {addingMember ? "Ajout…" : "Ajouter"}
            </Button>

            <div className="text-xs text-muted">
              Seul le propriétaire du réseau peut ajouter.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-7">
        <Card>
          <CardHeader>
            <CardTitle>Mes réseaux</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {initialNetworks.length === 0 ? (
              <div className="text-sm text-muted">
                Aucun réseau pour le moment.
              </div>
            ) : (
              initialNetworks.map((n) => (
                <div
                  key={n.id}
                  className="rounded-[var(--radius-md)] border border-border bg-white/60 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-navy">
                        {n.name}
                      </div>
                      {n.description ? (
                        <div className="mt-1 text-sm text-muted">
                          {n.description}
                        </div>
                      ) : null}
                      <div className="mt-1 text-xs text-muted">
                        Propriétaire: {n.owner.fullName}
                      </div>
                    </div>

                    <div className="text-xs text-muted">
                      {n.members.length} membre(s)
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {n.members.map((m) => (
                      <div
                        key={m.userId}
                        className="flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-white/70 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-text">
                            {m.user.fullName}
                          </div>
                          <div className="truncate text-xs text-muted">
                            {m.user.email}
                          </div>
                        </div>
                        <div className="ml-2 shrink-0 rounded-full border border-border bg-white px-2 py-1 text-[11px] font-semibold text-navy">
                          {m.role === "OWNER" ? "Owner" : "Membre"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
