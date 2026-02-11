"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EventFormModal } from "./event-form-modal";

export type EventItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  status: string;
  startsAt: string | null;
  bannerUrl: string | null;
  isPaid: boolean;
  price: number | null;
  durationMin: number | null;
  createdAt: string;
  _count: { registrations: number };
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    PUBLISHED: "bg-green-100 text-green-700",
    ENDED: "bg-blue-100 text-blue-700",
    CANCELLED: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function formatDate(dateIso: string) {
  return new Date(dateIso).toLocaleDateString("fr-FR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventsManage({ initialEvents }: { initialEvents: EventItem[] }) {
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [sharingMenuId, setSharingMenuId] = useState<string | null>(null);

  async function handleShareToCommunity(ev: EventItem) {
    if (!confirm(`Souhaitez-vous partager l'événement "${ev.title}" sur le flux de la communauté ?`)) return;
    
    setSharingId(ev.id);
    try {
      const publicUrl = `${window.location.origin}/events/${ev.slug}`;
      const content = `🚀 Je viens de publier un nouvel événement : **${ev.title}** !\n\n${ev.description}\n\nRejoignez-nous ici : ${publicUrl}`;
      
      const formData = new FormData();
      formData.append("content", content);
      
      const res = await fetch("/api/user-posts", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors du partage");
      }

      alert("Événement partagé avec succès sur la communauté ! 🚀");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Erreur lors du partage");
    } finally {
      setSharingId(null);
    }
  }

  async function handleCopyLink(slug: string) {
    const url = `${window.location.origin}/events/${slug}`;
    await navigator.clipboard.writeText(url);
    alert("Lien de l'événement copié dans le presse-papier !");
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet événement?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur suppression");
      setEvents(events.filter((e) => e.id !== eventId));
    } catch (e) {
      console.error(e);
      alert("Erreur: " + (e instanceof Error ? e.message : "Impossible de supprimer"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-navy">Gestion des événements</h1>
            <p className="text-muted mt-1">Créez, modifiez et gérez vos événements et formations.</p>
          </div>
          <Button onClick={() => setShowModal(true)}>+ Créer un événement</Button>
        </div>

        {/* Create Modal */}
        {showModal && (
          <EventFormModal
            onClose={() => setShowModal(false)}
            onSuccess={(newEvent) => {
              setEvents([newEvent, ...events]);
              setShowModal(false);
            }}
          />
        )}

        {/* Events List */}
        {events.length === 0 ? (
          <div className="bg-white border border-border rounded-lg p-8 text-center text-muted">
            <p>Aucun événement créé. Commencez par créer votre premier événement!</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white border border-border rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted">Titre</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted">Inscrits</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {ev.bannerUrl ? (
                          <img
                            src={ev.bannerUrl}
                            className="w-16 h-10 object-cover rounded border border-border"
                            alt=""
                          />
                        ) : (
                          <div className="w-16 h-10 bg-gray-100 rounded border border-border flex items-center justify-center">
                             <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-navy text-sm leading-tight truncate">{ev.title}</p>
                          <p className="text-[11px] text-muted line-clamp-1 italic">{ev.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs font-semibold text-navy">{ev.type}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={ev.status} />
                    </td>
                    <td className="px-4 py-4 text-[11px] text-muted font-medium uppercase tracking-wider">
                      {ev.startsAt ? formatDate(ev.startsAt) : "Date à définir"}
                    </td>
                    <td className="px-4 py-4 text-sm text-right font-black text-navy">{ev._count.registrations}</td>
                    <td className="px-4 py-4 text-right space-x-2 flex justify-end items-center">
                      <Link href={`/events/${ev.slug || ev.id}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-gray-200">
                          Aperçu
                        </Button>
                      </Link>

                      {ev.status === "PUBLISHED" && (
                        <div className="relative inline-block text-left">
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={sharingId === ev.id}
                            className="h-8 text-xs font-black italic bg-navy text-white px-3 shadow-md hover:scale-105 active:scale-95 transition-all"
                            onClick={() => setSharingMenuId(sharingMenuId === ev.id ? null : ev.id)}
                          >
                            {sharingId === ev.id ? (
                              "Partage..."
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                Partager
                              </>
                            )}
                          </Button>
                          {sharingMenuId === ev.id && (
                            <>
                              <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm" onClick={() => setSharingMenuId(null)} />
                              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 bg-white border border-border rounded-xl shadow-2xl z-[101] py-4 animate-in fade-in zoom-in duration-200">
                                <div className="px-4 pb-3 border-b border-border mb-2">
                                  <p className="text-sm font-black text-navy uppercase tracking-wider">Partage de l'événement</p>
                                  <p className="text-[10px] text-muted truncate">{ev.title}</p>
                                </div>
                                <button
                                  className="w-full px-4 py-3 text-left text-xs font-bold text-navy hover:bg-gray-100 flex items-center gap-3 transition-colors"
                                  onClick={() => { handleShareToCommunity(ev); setSharingMenuId(null); }}
                                >
                                  <span className="text-2xl">🏢</span> 
                                  <div>
                                    <p>Vers la communauté</p>
                                    <p className="text-[10px] text-muted font-normal">Publier sur le flux Capitune</p>
                                  </div>
                                </button>
                                <button
                                  className="w-full px-4 py-3 text-left text-xs font-bold text-navy hover:bg-gray-100 flex items-center gap-3 transition-colors"
                                  onClick={() => { handleCopyLink(ev.slug); setSharingMenuId(null); }}
                                >
                                  <span className="text-2xl">🔗</span>
                                  <div>
                                    <p>Copier le lien</p>
                                    <p className="text-[10px] text-muted font-normal">Lien direct vers l'événement</p>
                                  </div>
                                </button>
                                <div className="mt-2 px-4 pt-2">
                                  <Button variant="ghost" className="w-full h-8 text-[11px] font-bold" onClick={() => setSharingMenuId(null)}>
                                    Annuler
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <Link href={`/events/manage/${ev.id}/edit`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-bold border-gray-200">
                          Éditer
                        </Button>
                      </Link>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(ev.id)}
                        disabled={loading}
                        className="h-8 text-xs font-bold text-red-400 hover:text-red-700 hover:bg-red-50"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
