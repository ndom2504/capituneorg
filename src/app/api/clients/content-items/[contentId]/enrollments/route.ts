import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireProfessionalViewer } from "@/app/api/clients/_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ contentId: string }> }) {
  const auth = await requireProfessionalViewer();
  if (!auth.ok) return auth.response;

  const { contentId } = await params;

  const item = await prisma.contentItem.findUnique({
    where: { id: contentId },
    select: { id: true, ownerId: true, type: true, title: true, isPaid: true, currency: true, priceCents: true },
  });
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const canView = auth.viewer.accountType === "ADMIN" || auth.viewer.id === item.ownerId;
  if (!canView) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const enrollments = await prisma.enrollment.findMany({
    where: { contentId },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      paymentStatus: true,
      stripeSessionId: true,
      createdAt: true,
      user: { select: { id: true, fullName: true, email: true, accountType: true } },
    },
  });

  return NextResponse.json({
    item,
    enrollments: enrollments.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
