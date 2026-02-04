import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireProfessionalViewer } from "@/app/api/clients/_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const isAdmin = auth.viewer.accountType === "ADMIN";

  const items = await prisma.preRegistration.findMany({
    where: {
      status: "SUBMITTED",
      review: {
        is: {
          status: "ACCEPTED",
          ...(isAdmin ? {} : { assignedProId: auth.viewer.id }),
        },
      },
    },
    select: {
      id: true,
      createdAt: true,
      firstName: true,
      lastName: true,
      email: true,
      review: {
        select: {
          id: true,
          status: true,
          recommendedTrack: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const dto = items
    .filter((it) => it.review?.status === "ACCEPTED")
    .map((it) => ({
      preRegistrationId: it.id,
      reviewId: it.review!.id,
      createdAt: it.createdAt.toISOString(),
      acceptedAt: it.review!.updatedAt.toISOString(),
      firstName: it.firstName ?? "",
      lastName: it.lastName ?? "",
      email: it.email ?? "",
      recommendedTrack: it.review!.recommendedTrack,
    }));

  return NextResponse.json({ items: dto });
}
