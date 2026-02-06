import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/jobs/my-applications
 * Liste des candidatures du demandeur connecté
 */
export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const applications = await prisma.jobApplication.findMany({
      where: {
        applicantId: user.id,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            jobType: true,
            domain: true,
            city: true,
            province: true,
            remote: true,
            status: true,
            poster: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("Erreur lors de la récupération des candidatures:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des candidatures." },
      { status: 500 },
    );
  }
}
