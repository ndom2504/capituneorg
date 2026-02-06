import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";

/**
 * POST /api/presence/heartbeat
 * 
 * Met à jour le lastSeenAt de l'utilisateur connecté.
 * Appelé automatiquement toutes les 30-45s par le frontend.
 * 
 * V1 Spec:
 * - Auth requise
 * - Update lastSeenAt = now()
 * - Optionnel: statusManual (busy/away/etc)
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId();
    
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { statusManual } = body;

    // Mise à jour du heartbeat
    await db.user.update({
      where: { id: userId },
      data: {
        lastSeenAt: new Date(),
        ...(statusManual !== undefined && { statusManual }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Erreur heartbeat:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du statut" },
      { status: 500 }
    );
  }
}
