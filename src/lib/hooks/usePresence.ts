"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hook pour envoyer automatiquement des heartbeats de présence.
 * 
 * V1 Spec:
 * - Envoie POST /api/presence/heartbeat toutes les 30s
 * - Pause si onglet inactif (document.hidden)
 * - Cleanup automatique
 * 
 * Usage:
 * ```tsx
 * function App() {
 *   usePresence(); // C'est tout!
 *   return <div>...</div>
 * }
 * ```
 * 
 * Note: Ce hook doit être utilisé uniquement dans des composants
 * protégés par auth (comme DashboardShell).
 */
export function usePresence() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Fonction d'envoi heartbeat
    const sendHeartbeat = async () => {
      // Ne pas envoyer si l'onglet est caché
      if (document.hidden) return;

      try {
        await fetch("/api/presence/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        // Silencieux - heartbeat n'est pas critique
        console.debug("Heartbeat failed:", error);
      }
    };

    // Premier heartbeat immédiat
    sendHeartbeat();

    // Heartbeat toutes les 30s
    intervalRef.current = setInterval(sendHeartbeat, 30 * 1000);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
}

/**
 * Hook pour récupérer le statut en ligne d'utilisateurs.
 * 
 * V1 Spec:
 * - Fetch GET /api/presence?userIds=...
 * - Retourne Map<userId, { online, lastSeenAt, statusManual }>
 * 
 * Usage:
 * ```tsx
 * const presenceData = usePresenceStatus(["user1", "user2"]);
 * const isOnline = presenceData?.["user1"]?.online ?? false;
 * ```
 */
export function usePresenceStatus(userIds: string[]) {
  const [presenceData, setPresenceData] = useState<Record<
    string,
    {
      online: boolean;
      lastSeenAt: string | null;
      statusManual: string | null;
    }
  > | null>(null);

  useEffect(() => {
    if (userIds.length === 0) {
      setPresenceData(null);
      return;
    }

    const fetchPresence = async () => {
      try {
        const res = await fetch(`/api/presence?userIds=${userIds.join(",")}`);
        if (res.ok) {
          const data = await res.json();
          setPresenceData(data);
        }
      } catch (error) {
        console.error("Erreur fetch presence:", error);
      }
    };

    fetchPresence();
    
    // Refresh toutes les 30s
    const interval = setInterval(fetchPresence, 30 * 1000);

    return () => clearInterval(interval);
  }, [userIds.join(",")]);

  return presenceData;
}
