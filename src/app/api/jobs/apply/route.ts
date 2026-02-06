import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

/**
 * POST /api/jobs/apply
 * Postuler à une offre d'emploi (V1 : CV uniquement)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const { jobId, cvUrl } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: "ID de l'offre requis" },
        { status: 400 }
      );
    }

    if (!cvUrl) {
      return NextResponse.json(
        { error: "CV requis pour postuler" },
        { status: 400 }
      );
    }

    // Vérifier que l'offre existe et est publiée
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: {
        poster: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Offre d'emploi introuvable" },
        { status: 404 }
      );
    }

    if (job.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "Cette offre n'est plus disponible" },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur n'a pas déjà postulé
    const existingApplication = await prisma.jobApplication.findUnique({
      where: {
        jobId_applicantId: {
          jobId,
          applicantId: user.id,
        },
      },
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: "Vous avez déjà postulé à cette offre" },
        { status: 400 }
      );
    }

    // Créer la candidature (V1 : pas de MarketplaceRequest, CV uniquement)
    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        applicantId: user.id,
        cvUrl,
        status: "RECUE",
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            jobType: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      application,
      message: "Candidature envoyée avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la candidature:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'envoi de la candidature" },
      { status: 500 }
    );
  }
}
