import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

/**
 * POST /api/jobs/apply
 * Apply to a job posting
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const { jobId, coverLetter, cvUrl } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: "ID de l'offre requis" },
        { status: 400 }
      );
    }

    // Check if job exists and is published
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

    // Check if user already applied
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

    // Create MarketplaceRequest for communication
    const request = await prisma.marketplaceRequest.create({
      data: {
        requesterId: user.id,
        professionalId: job.posterId,
        status: "PENDING",
        message: `Candidature pour: ${job.title}\n\n${coverLetter || "Aucune lettre de motivation fournie."}`,
      },
    });

    // Create job application
    const application = await prisma.jobApplication.create({
      data: {
        jobId,
        applicantId: user.id,
        coverLetter: coverLetter || null,
        cvUrl: cvUrl || null,
        status: "PENDING",
        requestId: request.id,
      },
    });

    // Create initial message in the request thread
    if (coverLetter) {
      await db.marketplaceRequestMessage.create({
        data: {
          requestId: request.id,
          senderRole: "REQUESTER",
          kind: "TEXT",
          body: coverLetter,
        },
      });
    }

    if (cvUrl) {
      await db.marketplaceRequestMessage.create({
        data: {
          requestId: request.id,
          senderRole: "REQUESTER",
          kind: "FILE",
          fileUrl: cvUrl,
          fileName: "CV.pdf",
        },
      });
    }

    return NextResponse.json({ ok: true, application });
  } catch (error) {
    console.error("[POST /api/jobs/apply] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de la candidature" },
      { status: 500 }
    );
  }
}
