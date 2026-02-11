import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EventDetailClient } from "./event-detail-client";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const viewer = await getAppViewer();

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      creator: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          accountType: true,
        },
      },
      registrations: {
        where: { userId: viewer?.id || "" },
        select: { status: true },
      },
      _count: {
        select: { registrations: true },
      },
    },
  });

  if (!event) {
    notFound();
  }

  // Seul le créateur peut voir ses propres brouillons
  if (event.status === "DRAFT" && event.createdBy !== viewer?.id) {
    notFound();
  }

  const userRegistration = event.registrations[0];
  const isRegistered = !!userRegistration;

  return (
    <EventDetailClient
      event={{
        ...event,
        startsAt: event.startsAt?.toISOString() ?? null,
        price: event.price ? Number(event.price) : null,
        registrationCount: event._count.registrations,
      }}
      viewer={viewer}
      isRegistered={isRegistered}
    />
  );
}
