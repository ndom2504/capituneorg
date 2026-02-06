"use client";

import { useEffect, useState } from "react";

interface PerformanceData {
  casesCompleted: number;
  averageRating: number | null;
  reviewCount: number;
  responseRate: number | null;
  followerCount: number;
  badges: string[];
}

interface PerformanceCardProps {
  userId: string;
  isPro?: boolean;
}

export function PerformanceCard({ userId, isPro = false }: PerformanceCardProps) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/user-profile/${userId}/performance`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-white p-6">
        <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Si pas de données pertinentes pour un demandeur, on affiche seulement le réseau
  if (!isPro) {
    return (
      <div className="rounded-lg border border-border bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-navy">Réseau & activité</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-2xl">👥</span>
            <div>
              <div className="font-medium text-navy">Abonnés</div>
              <div className="text-muted">{data.followerCount}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pour les pros, affichage complet
  const badgeLabels: Record<string, { emoji: string; label: string; color: string }> = {
    FIABLE: { emoji: "🟦", label: "Fiable", color: "text-blue-600" },
    PLEBISCITE: { emoji: "⭐", label: "Plébiscité", color: "text-yellow-600" },
  };

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <div className="mb-4 flex items-start justify-between">
        <h3 className="text-lg font-semibold text-navy">Performance</h3>
        {data.badges && data.badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.badges.map((badge) => {
              const info = badgeLabels[badge];
              if (!info) return null;
              return (
                <div
                  key={badge}
                  className={`flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold ${info.color}`}
                >
                  <span>{info.emoji}</span>
                  <span>{info.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-2xl">✅</span>
          <div className="flex-1">
            <div className="font-medium text-navy">Cas traités</div>
            <div className="text-lg font-semibold text-primary">{data.casesCompleted}</div>
          </div>
        </div>

        {data.averageRating !== null && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-2xl">⭐</span>
            <div className="flex-1">
              <div className="font-medium text-navy">Satisfaction</div>
              <div className="text-lg font-semibold text-primary">
                {data.averageRating.toFixed(1)}/5{" "}
                <span className="text-sm font-normal text-muted">({data.reviewCount} avis)</span>
              </div>
            </div>
          </div>
        )}

        {data.responseRate !== null && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-2xl">⏱️</span>
            <div className="flex-1">
              <div className="font-medium text-navy">Réponse &lt; 24h</div>
              <div className="text-lg font-semibold text-primary">{data.responseRate}%</div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-sm">
          <span className="text-2xl">👥</span>
          <div className="flex-1">
            <div className="font-medium text-navy">Abonnés</div>
            <div className="text-lg font-semibold text-primary">{data.followerCount}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-4 text-xs text-muted">
        Basé sur les dossiers CAPITUNE réellement traités.
      </div>
    </div>
  );
}
