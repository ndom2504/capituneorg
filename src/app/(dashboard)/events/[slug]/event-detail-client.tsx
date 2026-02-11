"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { User } from "@prisma/client";

import { cn } from "@/lib/cn";

export function EventDetailClient({
  event,
  viewer,
  isRegistered,
}: {
  event: {
    id: string;
    slug: string;
    title: string;
    description: string;
    type: string;
    mode: string;
    status: string; // Added status
    durationMin: number | null;
    startsAt: string | null;
    liveUrl: string | null;
    bannerUrl: string | null;
    isPaid: boolean;
    price: number | null;
    registrationCount: number;
    creator: {
      id: string;
      fullName: string;
      avatarUrl: string | null;
      accountType: string;
    };
  };
  viewer: (User & any) | null;
  isRegistered: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(isRegistered);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("canceled")) {
      setError("Le paiement a été annulé.");
    }
  }, []);

  async function handleRegister() {
    if (!viewer) {
      const currentPath = window.location.pathname;
      window.location.href = `/auth?from=${encodeURIComponent(currentPath)}`;
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (event.isPaid && event.price && !registered) {
        // Redirection vers Checkout
        const res = await fetch(`/api/checkout/event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: event.id }),
        });
        
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Erreur lors de l'initialisation du paiement");
        }
        
        const { url } = await res.json();
        window.location.href = url;
        return;
      }

      // Cas gratuit ou déjà inscrit (même si déjà inscrit, on peut sécuriser l'appel)
      const res = await fetch(`/api/events/${event.id}/register`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setRegistered(true);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Erreur lors de l'action");
    } finally {
      // Si paiement, la redirection se chargera de quitter la page
      if (!event.isPaid || registered) {
        setLoading(false);
      }
    }
  }

  const dateFormatter = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function formatDate(dateIso: string | null) {
    if (!dateIso) return "Date TBD";
    return dateFormatter.format(new Date(dateIso));
  }

  function getBannerUrl(url: string | null) {
    if (!url) return null;
    if (url.startsWith("http") || url.startsWith("/")) return url;
    return `/uploads/events/${url}`;
  }

  return (
    <div className="space-y-6 py-6 pb-12">
      <Link href="/events" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-navy transition-colors group">
        <div className="p-1.5 rounded-full bg-white border border-border group-hover:border-primary/30 shadow-sm transition-all group-hover:-translate-x-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </div>
        Retour aux sessions
      </Link>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1 space-y-8">
          {/* Banner */}
          <div className="relative group overflow-hidden rounded-2xl border border-border shadow-sm bg-gray-100">
            {event.bannerUrl ? (
              <img
                src={getBannerUrl(event.bannerUrl) ?? ""}
                alt={event.title}
                className="w-full h-[400px] object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-[300px] flex items-center justify-center bg-navy/5 text-navy/10 uppercase font-black text-6xl tracking-widest italic animate-pulse">
                Capitune
              </div>
            )}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="px-3 py-1 bg-navy/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                {event.type}
              </span>
              <span className="px-3 py-1 bg-primary/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                {event.mode}
              </span>
              {event.status === "DRAFT" && (
                <span className="px-3 py-1 bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                   Brouillon
                </span>
              )}
            </div>
          </div>

          {/* Header Info */}
          <div className="space-y-4 px-2">
            <h1 className="text-4xl font-black text-navy leading-tight tracking-tight">{event.title}</h1>
            <div className="prose prose-navy max-w-none">
              <p className="text-lg text-muted font-medium leading-relaxed italic border-l-4 border-primary/20 pl-4">
                {event.description}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 pt-4">
            {/* Details Grid */}
            <div className="bg-white p-6 rounded-2xl border border-border space-y-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-navy/5 rounded-xl text-navy">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest">Date & Heure</p>
                    <p className="text-navy font-bold">{formatDate(event.startsAt)}</p>
                  </div>
                </div>
                {event.durationMin && (
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-navy/5 rounded-xl text-navy">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-muted uppercase tracking-widest">Durée prévue</p>
                      <p className="text-navy font-bold">{event.durationMin} minutes d'expertise</p>
                    </div>
                  </div>
                )}
            </div>

            {/* Creator Card */}
            <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4 group cursor-pointer hover:border-primary/30 transition-all">
              <img
                src={event.creator.avatarUrl || "/brand/capitune-logo.png"}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md transition-transform group-hover:rotate-3"
                alt=""
              />
              <div>
                <p className="text-[10px] font-black text-muted uppercase tracking-widest">Intervenant</p>
                <p className="text-lg font-black text-navy group-hover:text-primary transition-colors">{event.creator.fullName}</p>
                <p className="text-[11px] font-bold text-primary/80 uppercase">{event.creator.accountType === "PROFESSIONAL" ? "Expert Canada" : "Organisateur"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Sidebar CTA */}
        <div className="w-full lg:w-80 space-y-6">
          <div className="bg-white rounded-3xl border border-border shadow-2xl p-6 space-y-6 sticky top-8">
            <div className="text-center space-y-2 py-4 bg-gray-50 rounded-2xl border border-border/50">
               <p className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Prix de l'accès</p>
               {event.isPaid && event.price ? (
                <p className="text-4xl font-black text-navy">{event.price.toFixed(2)} <span className="text-lg tracking-tighter">CA$</span></p>
              ) : (
                <p className="text-4xl font-black text-green-600">Gratuit</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-[12px] text-red-600 font-bold text-center">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <Button
                size="md"
                className="w-full h-14 text-md font-black italic shadow-lg active:scale-[0.98] transition-all bg-primary"
                onClick={handleRegister}
                disabled={loading || registered}
                variant={registered ? "outline" : "primary"}
              >
                {loading ? (
                  "Traitement..."
                ) : registered ? (
                   <span className="flex items-center gap-2">Place réservée ✓</span>
                ) : event.isPaid ? (
                  `Réserver (${event.price?.toFixed(2)} CA$)`
                ) : (
                  "Réserver ma place"
                )}
              </Button>

              {registered && !error && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-[11px] text-green-700 font-bold text-center animate-in fade-in slide-in-from-top-1">
                   Votre place est confirmée. Vous recevrez les détails de participation.
                </div>
              )}

              {!registered && event.isPaid && (
                <p className="text-[10px] text-center text-muted px-4 font-bold uppercase tracking-tighter italic">
                  Paiement sécurisé via Stripe
                </p>
              )}

              <p className="text-[10px] text-center text-muted px-4 font-medium italic leading-relaxed">
                En vous inscrivant, vous recevrez les instructions par notification et email.
              </p>
            </div>

            <div className="pt-6 border-t border-gray-100 space-y-4 text-center">
               <div className="flex items-center justify-between text-xs px-1 font-bold text-navy">
                  <span className="opacity-50 uppercase tracking-tighter italic">Inscrits confirmés</span>
                  <span className="bg-navy/5 px-2 py-1 rounded-md">{event.registrationCount}</span>
               </div>
               
               {event.liveUrl && registered && (
                 <div className="space-y-2">
                    <a href={event.liveUrl} target="_blank" rel="noreferrer" className="block">
                      <Button variant="primary" className="w-full h-12 bg-navy text-white font-black italic shadow-md hover:bg-navy/90 transition-all flex items-center justify-center gap-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          Rejoindre l'événement
                      </Button>
                    </a>
                    <Button 
                      variant="outline" 
                      className="w-full h-10 border-dashed border-border text-[10px] font-bold text-muted hover:bg-gray-50"
                      onClick={() => {
                        navigator.clipboard.writeText(event.liveUrl || "");
                        alert("Lien copié !");
                      }}
                    >
                      Copier le lien de participation
                    </Button>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
