"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type EventCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  status: string; // Added status
  theme: string;
  level: string;
  mode: string;
  startsAt: string | null;
  durationMin: number | null;
  bannerUrl: string | null;
  isPaid: boolean;
  price: number | null;
  liveUrl: string | null;
  isRegistered: boolean;
  creator: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
};

function formatDate(dateIso: string | null) {
  if (!dateIso) return "Date à venir";
  const date = new Date(dateIso);
  return date.toLocaleDateString("fr-FR", { 
    month: "short", 
    day: "numeric", 
    hour: "2-digit", 
    minute: "2-digit" 
  });
}

function TypeBadge({ type, status }: { type: string; status?: string }) {
  const colors: Record<string, string> = {
    LIVE: "bg-blue-50 text-blue-600 border-blue-200",
    WEBINAIRE: "bg-purple-50 text-purple-600 border-purple-200",
    ATELIER: "bg-green-50 text-green-600 border-green-200",
    FORMATION: "bg-orange-50 text-orange-600 border-orange-200",
  };
  
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn(
        "inline-block px-2 py-0.5 rounded text-[10px] font-bold border",
        colors[type] || "bg-gray-50 text-gray-600 border-gray-200"
      )}>
        {type}
      </span>
      {status === "DRAFT" && (
        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200 uppercase">
          Brouillon
        </span>
      )}
    </div>
  );
}

export function EventsDiscovery({
  initialEvents,
  viewerId,
  isProfessional,
}: {
  initialEvents: EventCard[];
  viewerId: string | null;
  isProfessional: boolean;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return initialEvents.filter((ev) => {
      if (typeFilter !== "ALL" && ev.type !== typeFilter) return false;
      if (!term) return true;
      return ev.title.toLowerCase().includes(term) || ev.description.toLowerCase().includes(term);
    });
  }, [initialEvents, search, typeFilter]);

  return (
    <div className="space-y-10 py-6">
      {/* Premium Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-navy px-8 py-12 text-white shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </span>
            Plateforme d'apprentissage
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
            Sessions & <span className="text-primary italic">Replays</span>
          </h1>
          <p className="max-w-md text-gray-300 text-sm md:text-base font-medium leading-relaxed">
            Accédez à l'expertise de notre communauté à travers des sessions en direct et des formations à la demande.
          </p>

          {isProfessional && (
            <div className="pt-4">
              <Link href="/events/manage">
                <Button className="bg-primary text-white font-black italic shadow-lg hover:scale-105 transition-transform px-6 h-12">
                   Gérer mes sessions
                </Button>
              </Link>
            </div>
          )}
        </div>
        
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-primary/20 blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]"></div>
      </div>

      {/* Search & Filters Overlapping slightly - Adjusted for more space */}
      <div className="relative -mt-6 mx-4 md:mx-12 flex flex-wrap items-center gap-4 bg-white/90 backdrop-blur-xl p-6 rounded-2xl border border-border shadow-xl ring-1 ring-black/5">
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder="Événement, thématique, expert..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary/20 transition-all bg-white"
          />
          <svg className="absolute left-3 top-3 h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-border text-sm bg-white min-w-[160px] cursor-pointer"
        >
          <option value="ALL">Toutes les catégories</option>
          <option value="LIVE">Sessions Live</option>
          <option value="WEBINAIRE">Webinaires</option>
          <option value="ATELIER">Ateliers</option>
          <option value="FORMATION">Formations Vidéo</option>
        </select>

        <Button
          variant="ghost"
          size="sm"
          className="text-muted hover:text-navy"
          onClick={() => {
            setSearch("");
            setTypeFilter("ALL");
          }}
        >
          Réinitialiser
        </Button>
      </div>

      {/* Events Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white/40 p-16 rounded-2xl border border-dashed border-border text-center">
          <p className="text-muted font-medium">Aucun événement ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((ev) => (
            <Link key={ev.id} href={`/events/${ev.slug}`} className="group relative bg-white rounded-xl border border-border shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col transform hover:-translate-y-1">
              {/* Banner with Overlay on Hover */}
              <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                {ev.bannerUrl ? (
                  <img
                    src={ev.bannerUrl}
                    alt={ev.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-navy/5">
                    <div className="flex flex-col items-center gap-2">
                       <svg className="h-12 w-12 text-navy/10" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                       <span className="text-[10px] font-black text-navy/20 uppercase tracking-widest">Capitune Learning</span>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-navy/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                   <div className="bg-white text-navy h-12 w-12 rounded-full flex items-center justify-center shadow-2xl transform scale-50 group-hover:scale-100 transition-transform duration-300">
                      <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                   </div>
                </div>
                {ev.isPaid && (
                   <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-[10px] font-black text-navy shadow-lg">
                      {ev.price ? `${ev.price.toFixed(2)} CA$` : "PAYANT"}
                   </div>
                )}
              </div>

              {/* Card Content */}
              <div className="p-4 flex flex-col flex-1 gap-3">
                <div className="flex items-center justify-between">
                  <TypeBadge type={ev.type} status={ev.status} />
                  <span className="text-[11px] font-semibold text-primary uppercase tracking-tighter">
                    {ev.mode}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-bold text-navy text-[15px] leading-tight line-clamp-2 min-h-[40px] group-hover:text-primary transition-colors">
                    {ev.title}
                  </h3>
                  <p className="text-[13px] text-muted line-clamp-2 leading-relaxed h-[38px]">
                    {ev.description}
                  </p>
                </div>

                <div className="pt-4 mt-auto border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={ev.creator.avatarUrl || "/brand/capitune-logo.png"}
                      className="w-6 h-6 rounded-full border border-border"
                      alt=""
                    />
                    <span className="text-[12px] font-medium text-navy truncate">
                      {ev.creator.fullName.split(" ")[0]}
                    </span>
                  </div>
                  
                  <div className="text-right flex flex-col">
                    {ev.isPaid && ev.price ? (
                      <span className="text-sm font-black text-navy">{ev.price.toFixed(2)} CA$</span>
                    ) : (
                      <span className="text-sm font-black text-green-600">Gratuit</span>
                    )}
                    {ev.startsAt && (
                       <span className="text-[10px] text-muted font-medium">{formatDate(ev.startsAt)}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
