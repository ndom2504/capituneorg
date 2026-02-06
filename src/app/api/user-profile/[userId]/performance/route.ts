import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/user-profile/[userId]/performance
 * Calcule les métriques de performance d'un professionnel
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      accountType: true,
      marketplaceProfile: {
        select: {
          id: true,
          profession: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Utilisateur introuvable" },
      { status: 404 },
    );
  }

  // Si pas de profil marketplace, pas de performance
  if (!user.marketplaceProfile) {
    return NextResponse.json({
      casesCompleted: 0,
      averageRating: null,
      reviewCount: 0,
      responseRate: null,
      followerCount: 0,
      badges: [],
    });
  }

  // 1. Cas traités (demandes closes par le client)
  const casesCompleted = await prisma.marketplaceRequest.count({
    where: {
      professionalId: userId,
      closedByClientAt: { not: null },
    },
  });

  // 2. Satisfaction moyenne + nombre d'avis
  const reviewStats = await prisma.review.aggregate({
    where: { professionalId: userId },
    _avg: { rating: true },
    _count: { id: true },
  });

  const averageRating = reviewStats._avg.rating
    ? Math.round(reviewStats._avg.rating * 10) / 10
    : null;
  const reviewCount = reviewStats._count.id;

  // 3. Taux de réponse (demandes acceptées avec réponse < 24h)
  const SLA_HOURS = 24;
  const slaMs = SLA_HOURS * 60 * 60 * 1000;

  const acceptedRequests = await prisma.marketplaceRequest.findMany({
    where: {
      professionalId: userId,
      acceptedAt: { not: null },
    },
    select: {
      id: true,
      createdAt: true,
      firstProResponseAt: true,
    },
  });

  let respondedInTime = 0;
  let totalEligible = 0;

  for (const req of acceptedRequests) {
    if (req.firstProResponseAt) {
      const delta =
        req.firstProResponseAt.getTime() - req.createdAt.getTime();
      if (delta <= slaMs) {
        respondedInTime++;
      }
      totalEligible++;
    }
  }

  const responseRate =
    totalEligible > 0
      ? Math.round((respondedInTime / totalEligible) * 100)
      : null;

  // 4. Abonnés (followers)
  const followerCount = await prisma.follow.count({
    where: { followingId: userId },
  });

  // 5. Badges calculés
  const badges: string[] = [];

  // Badge "Fiable" : taux de réponse > 80% + cas traités > 10
  if (
    responseRate !== null &&
    responseRate >= 80 &&
    casesCompleted >= 10
  ) {
    badges.push("FIABLE");
  }

  // Badge "Plébiscité" : rating ≥ 4.5 et ≥ 20 avis
  if (
    averageRating !== null &&
    averageRating >= 4.5 &&
    reviewCount >= 20
  ) {
    badges.push("PLEBISCITE");
  }

  return NextResponse.json({
    casesCompleted,
    averageRating,
    reviewCount,
    responseRate,
    followerCount,
    badges,
  });
}
