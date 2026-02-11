import { prisma } from "@/lib/db";
import { EventsDiscovery } from "./events-discovery";
import { getAppViewer } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const viewer = await getAppViewer();

  // Fetch events: PUBLISHED for everyone, DRAFT only for the creator
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { status: "PUBLISHED" },
        { createdBy: viewer?.id || "anonymous" }, // Creator sees their own drafts
      ],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      type: true,
      status: true,
      theme: true,
      level: true,
      mode: true,
      startsAt: true,
      durationMin: true,
      bannerUrl: true,
      isPaid: true,
      price: true,
      liveUrl: true,
      creator: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      registrations: {
        where: {
          userId: viewer?.id || "",
        },
        select: {
          status: true,
        },
      },
    },
    orderBy: {
      startsAt: "asc",
    },
  });

  return (
    <EventsDiscovery
      initialEvents={events.map((ev) => ({
        ...ev,
        startsAt: ev.startsAt?.toISOString() ?? null,
        price: ev.price ? Number(ev.price) : null,
        isRegistered: ev.registrations.length > 0,
      }))}
      viewerId={viewer?.id || null}
      isProfessional={viewer?.accountType === "PROFESSIONAL" || viewer?.accountType === "ADMIN"}
    />
  );
}
