"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { EventItem } from "./events-manage";

export function EventFormModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (event: EventItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("LIVE");
  const [mode, setMode] = useState("ONLINE");
  const [startsAt, setStartsAt] = useState("");
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [liveUrl, setLiveUrl] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<number | null>(null);
  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUploadBanner(file: File) {
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/events/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setBannerUrl(data.fileUrl);
      
      // Preview
      const reader = new FileReader();
      reader.onload = (e) => setBannerPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } catch (e) {
      setError("Erreur upload bannière");
    }
  }

  async function handleCreate() {
    if (!title.trim() || !description.trim()) {
      setError("Titre et description requis");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/events/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          type,
          mode,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          durationMin: durationMin ? parseInt(durationMin.toString()) : null,
          liveUrl: liveUrl || null,
          isPaid,
          price: isPaid && price ? Math.round(price * 100) / 100 : null,
          bannerUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur création");
      }
      const data = await res.json();
      onSuccess(data.event);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-navy">Créer un événement</h2>
          <button onClick={onClose} className="text-2xl text-muted">
            ×
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">{error}</div>}

        <div className="space-y-4">
          {/* Titre */}
          <div>
            <label className="text-sm font-semibold text-navy">Titre</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded border border-border text-sm mt-1"
              placeholder="Ex: Formation React avancée"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-semibold text-navy">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded border border-border text-sm mt-1"
              placeholder="Décrivez votre événement..."
            />
          </div>

          {/* Type & Mode */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-navy">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded border border-border text-sm mt-1"
              >
                <option value="LIVE">Live</option>
                <option value="WEBINAIRE">Webinaire</option>
                <option value="ATELIER">Atelier</option>
                <option value="FORMATION">Formation</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-navy">Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full px-3 py-2 rounded border border-border text-sm mt-1"
              >
                <option value="ONLINE">En ligne</option>
                <option value="IN_PERSON">Présentiel</option>
              </select>
            </div>
          </div>

          {/* Date & Durée */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-navy">Date & Heure</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full px-3 py-2 rounded border border-border text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-navy">Durée (minutes)</label>
              <input
                type="number"
                min="0"
                value={durationMin ?? ""}
                onChange={(e) => setDurationMin(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 rounded border border-border text-sm mt-1"
                placeholder="60"
              />
            </div>
          </div>

          {/* URL Externe */}
          <div>
            <label className="text-sm font-semibold text-navy">Lien externe (Teams/Zoom/etc)</label>
            <input
              type="url"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              className="w-full px-3 py-2 rounded border border-border text-sm mt-1"
              placeholder="https://..."
            />
          </div>

          {/* Pricing */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-navy">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="w-4 h-4"
              />
              Événement payant
            </label>
            {isPaid && (
              <div>
                <label className="text-sm text-muted">Prix (CAD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price ?? ""}
                  onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 rounded border border-border text-sm mt-1"
                  placeholder="29.99"
                />
              </div>
            )}
          </div>

          {/* Banner */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-navy">Bannière</label>
            <label className="flex items-center gap-2 px-4 py-2 rounded border border-border cursor-pointer hover:bg-gray-50 text-sm">
              <span>Téléverser une image</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadBanner(file);
                }}
              />
            </label>
            {bannerPreview && (
              <div className="mt-2 rounded border border-border p-2">
                <img src={bannerPreview} alt="Preview" className="max-h-32 w-full object-contain" />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={loading || !title.trim() || !description.trim()}>
            {loading ? "Création..." : "Créer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
