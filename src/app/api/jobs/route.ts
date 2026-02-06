import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

/**
 * GET /api/jobs
 * List job postings
 * Query params:
 *   - my=true: Only return jobs posted by the current user
 *   - status: Filter by status (DRAFT, PUBLISHED, CLOSED, ARCHIVED)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const myJobs = searchParams.get("my") === "true";
    const status = searchParams.get("status");

    const where: any = {};

    if (myJobs) {
      where.posterId = user.id;
    } else {
      // Public listings: only published jobs
      where.status = "PUBLISHED";
    }

    if (status) {
      where.status = status;
    }

    const jobs = await prisma.jobPosting.findMany({
      where,
      include: {
        poster: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ ok: true, jobs });
  } catch (error) {
    console.error("[GET /api/jobs] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des offres" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs
 * Create a new job posting (professionals only)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const isProfessional =
      user.accountType === "PROFESSIONAL" || user.accountType === "ADMIN";

    if (!isProfessional) {
      return NextResponse.json(
        { error: "Seuls les professionnels peuvent créer des offres d'emploi" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      title,
      description,
      requirements,
      jobType = "CDI",
      domain = "AUTRE",
      experienceLevel = "INTERMEDIATE",
      city,
      province,
      remote = false,
      languages = "FR",
      startDate,
      deadline,
      salaryMin,
      salaryMax,
      status = "DRAFT",
    } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Titre et description requis" },
        { status: 400 }
      );
    }

    const job = await prisma.jobPosting.create({
      data: {
        posterId: user.id,
        title,
        description,
        requirements: requirements || null,
        jobType,
        domain,
        experienceLevel,
        city: city || null,
        province: province || null,
        remote,
        languages,
        startDate: startDate ? new Date(startDate) : null,
        deadline: deadline ? new Date(deadline) : null,
        salaryMin: salaryMin || null,
        salaryMax: salaryMax || null,
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
    });

    return NextResponse.json({ ok: true, job });
  } catch (error) {
    console.error("[POST /api/jobs] Error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'offre" },
      { status: 500 }
    );
  }
}
