import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * GET /api/jobs/applications
 * Liste des candidatures reçues (uniquement pour les Pros sur leurs offres)
 */
export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  if (user.accountType !== "PROFESSIONAL" && user.accountType !== "ADMIN") {
    return NextResponse.json(
      { error: "Accès réservé aux professionnels." },
      { status: 403 },
    );
  }

  try {
    // Récupérer toutes les candidatures sur les offres du pro
    const applications = await prisma.jobApplication.findMany({
      where: {
        job: {
          posterId: user.id,
        },
      },
      include: {
        applicant: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            email: true,
            preRegistration: {
              select: {
                residenceSituation: true,
              },
            },
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            jobType: true,
            domain: true,
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

/**
 * PATCH /api/jobs/applications
 * Mettre à jour le statut d'une candidature (Pro uniquement)
 */
export async function PATCH(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  if (user.accountType !== "PROFESSIONAL" && user.accountType !== "ADMIN") {
    return NextResponse.json(
      { error: "Accès réservé aux professionnels." },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const { applicationId, status } = body;

    if (!applicationId || !status) {
      return NextResponse.json(
        { error: "applicationId et status requis." },
        { status: 400 },
      );
    }

    // Vérifier que le statut est valide
    const validStatuses = ["RECUE", "EN_COURS", "RETENUE", "REFUSEE"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }

    // Vérifier que la candidature appartient à une offre du pro
    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          select: {
            posterId: true,
            title: true,
          },
        },
        applicant: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Candidature introuvable." },
        { status: 404 },
      );
    }

    if (application.job.posterId !== user.id && user.accountType !== "ADMIN") {
      return NextResponse.json(
        { error: "Vous ne pouvez modifier que les candidatures sur vos offres." },
        { status: 403 },
      );
    }

    // Mettre à jour le statut
    const updated = await prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status },
    });

    // Créer une notification pour le demandeur si le statut a changé (sauf RECUE qui est le statut initial)
    if (status !== "RECUE") {
      const statusMessages: Record<string, string> = {
        EN_COURS: "Votre candidature est en cours d'examen",
        RETENUE: "Félicitations ! Votre candidature a été retenue",
        REFUSEE: "Votre candidature n'a pas été retenue",
      };

      const statusPriorities: Record<string, "INFO" | "IMPORTANT" | "CRITICAL"> = {
        EN_COURS: "INFO",
        RETENUE: "IMPORTANT",
        REFUSEE: "INFO",
      };

      await prisma.notification.create({
        data: {
          userId: application.applicant.id,
          role: "DEMANDEUR",
          type: "JOB_STATUS_UPDATE",
          title: statusMessages[status] || "Mise à jour de votre candidature",
          message: `Pour l'offre "${application.job.title}"`,
          link: `/emploi/mes-candidatures`,
          priority: statusPriorities[status] || "INFO",
        },
      });
    }

    return NextResponse.json({ application: updated });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la candidature:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour." },
      { status: 500 },
    );
  }
}
