import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { redirect } from "next/navigation";
import { EventsManage } from "./events-manage";

export const dynamic = "force-dynamic";

export default async function EventsManagePage() {
  const viewer = await getAppViewer();

  // Check if user is PRO or ADMIN
  if (!viewer || (viewer.accountType !== "PROFESSIONAL" && viewer.accountType !== "ADMIN")) {
    redirect("/events");
  }

  // Fetch creator's events
  const events = await prisma.event.findMany({
    where: {
      createdBy: viewer.id,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      type: true,
      status: true,
      startsAt: true,
      bannerUrl: true,
      isPaid: true,
      price: true,
      durationMin: true,
      createdAt: true,
      _count: {
        select: { registrations: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <EventsManage
      initialEvents={events.map((ev) => ({
        ...ev,
        startsAt: ev.startsAt?.toISOString() ?? null,
        createdAt: ev.createdAt.toISOString(),
        price: ev.price ? Number(ev.price) : null,
      }))}
    />
  );
}
