import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

/**
 * POST /api/jobs/apply
 * Postuler à une offre d'emploi (V1 : CV uniquement)
 */
export async function POST(req: NextRequest) {
  try {
    const flags = await getFeatureFlagsFromDb();
    if (!flags.jobs) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { jobId } = body as { jobId?: string };

    if (!jobId) {
      return NextResponse.json(
        { error: "ID de l'offre requis" },
        { status: 400 }
      );
    }

    const employmentProfile = await prisma.employmentProfile.findUnique({
      where: { userId: user.id },
      select: {
        professionalTitle: true,
        domain: true,
        experienceLevel: true,
        availability: true,
        residenceCountry: true,
        workPreference: true,
        contractTypes: true,
        primaryLanguage: true,
        cvUrl: true,
        consentUseCv: true,
        accuracyConfirmed: true,
      },
    });

    const profileComplete = Boolean(
      employmentProfile?.professionalTitle?.trim() &&
        employmentProfile.domain &&
        employmentProfile.experienceLevel &&
        employmentProfile.availability &&
        employmentProfile.residenceCountry?.trim() &&
        employmentProfile.workPreference &&
        Array.isArray(employmentProfile.contractTypes) &&
        (employmentProfile.contractTypes as unknown as string[]).length > 0 &&
        employmentProfile.primaryLanguage &&
        employmentProfile.cvUrl &&
        employmentProfile.consentUseCv &&
        employmentProfile.accuracyConfirmed
    );

    if (!profileComplete) {
      return NextResponse.json(
        {
          error: "Profil emploi requis pour postuler.",
          redirectTo: "/emploi/mon-profil-emploi",
        },
        { status: 400 },
      );
    }

    const cvUrl = employmentProfile!.cvUrl;

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
            posterId: true,
          },
        },
      },
    });

    // Créer une notification pour le professionnel
    await prisma.notification.create({
      data: {
        userId: application.job.posterId,
        role: "PRO",
        type: "JOB_APPLICATION",
        title: "Nouvelle candidature reçue",
        message: `${user.fullName} a postulé pour "${application.job.title}"`,
        link: `/emploi/candidatures`,
        priority: "INFO",
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
