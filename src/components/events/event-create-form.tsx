"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EventCreateForm({ onSuccess }: { onSuccess?: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objectives, setObjectives] = useState("");
  const [audience, setAudience] = useState("");
  const [prerequisites, setPrerequisites] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [type, setType] = useState<"LIVE" | "WEBINAIRE" | "ATELIER" | "FORMATION">("WEBINAIRE");
  const [theme, setTheme] = useState<"ETUDES" | "TRAVAIL" | "ENTREPRENEUR" | "DOCUMENTS" | "BUDGET">("TRAVAIL");
  const [level, setLevel] = useState<"DEBUTANT" | "INTERMEDIAIRE" | "AVANCE">("DEBUTANT");
  const [format, setFormat] = useState<"LIVE" | "REPLAY">("LIVE");
  const [startsAt, setStartsAt] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [replayUrl, setReplayUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const body = {
      title,
      description,
      objectives: objectives || undefined,
      audience: audience || undefined,
      prerequisites: prerequisites || undefined,
      durationMin: durationMin ? parseInt(durationMin, 10) : undefined,
      type,
      theme,
      level,
      format,
      startsAt: startsAt || undefined,
      liveUrl: liveUrl || undefined,
      replayUrl: replayUrl || undefined,
    };

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Erreur lors de la création");
      }

      // Reset form
      setTitle("");
      setDescription("");
      setObjectives("");
      setAudience("");
      setPrerequisites("");
      setDurationMin("");
      setStartsAt("");
      setLiveUrl("");
      setReplayUrl("");
      
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer un événement ou une formation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-navy">
              Titre <span className="text-red-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Introduction à l'entrepreneuriat"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-navy">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre événement..."
              required
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              rows={4}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="event-type" className="mb-1 block text-sm font-medium text-navy">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                id="event-type"
                value={type}
                onChange={(e) => setType(e.target.value as "LIVE" | "WEBINAIRE" | "ATELIER" | "FORMATION")}
                required
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="LIVE">Live</option>
                <option value="WEBINAIRE">Webinaire</option>
                <option value="ATELIER">Atelier</option>
                <option value="FORMATION">Formation</option>
              </select>
            </div>

            <div>
              <label htmlFor="event-theme" className="mb-1 block text-sm font-medium text-navy">
                Thème <span className="text-red-500">*</span>
              </label>
              <select
                id="event-theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value as "ETUDES" | "TRAVAIL" | "ENTREPRENEUR" | "DOCUMENTS" | "BUDGET")}
                required
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ETUDES">Études</option>
                <option value="TRAVAIL">Travail</option>
                <option value="ENTREPRENEUR">Entrepreneuriat</option>
                <option value="DOCUMENTS">Documents</option>
                <option value="BUDGET">Budget</option>
              </select>
            </div>

            <div>
              <label htmlFor="event-level" className="mb-1 block text-sm font-medium text-navy">
                Niveau <span className="text-red-500">*</span>
              </label>
              <select
                id="event-level"
                value={level}
                onChange={(e) => setLevel(e.target.value as "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE")}
                required
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="DEBUTANT">Débutant</option>
                <option value="INTERMEDIAIRE">Intermédiaire</option>
                <option value="AVANCE">Avancé</option>
              </select>
            </div>

            <div>
              <label htmlFor="event-format" className="mb-1 block text-sm font-medium text-navy">
                Format <span className="text-red-500">*</span>
              </label>
              <select
                id="event-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as "LIVE" | "REPLAY")}
                required
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="LIVE">En direct (à venir)</option>
                <option value="REPLAY">Replay (disponible)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-navy">
              Durée (minutes)
            </label>
            <Input
              type="number"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              placeholder="Ex: 60"
            />
          </div>

          {format === "LIVE" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-navy">
                Date et heure de début
              </label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-navy">
              Objectifs
            </label>
            <textarea
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="Que vont apprendre les participants ?"
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              rows={3}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-navy">
              Public cible
            </label>
            <Input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Ex: Étudiants, professionnels en reconversion..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-navy">
              Prérequis
            </label>
            <Input
              value={prerequisites}
              onChange={(e) => setPrerequisites(e.target.value)}
              placeholder="Ex: Aucun prérequis nécessaire"
            />
          </div>

          {format === "LIVE" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-navy">
                URL du live
              </label>
              <Input
                type="url"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}

          {format === "REPLAY" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-navy">
                URL du replay
              </label>
              <Input
                type="url"
                value={replayUrl}
                onChange={(e) => setReplayUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="bg-navy hover:bg-navy/90">
              {loading ? "Création..." : "Créer l'événement"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
