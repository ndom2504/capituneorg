import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const viewer = await getAppViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { confirm?: unknown; password?: unknown }
    | null;

  const confirm = String(body?.confirm ?? "").trim();
  const password = String(body?.password ?? "");

  if (confirm !== "SUPPRIMER") {
    return NextResponse.json(
      { error: "Confirmation invalide. Tapez SUPPRIMER." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: viewer.id },
    select: { passwordHash: true },
  });

  if (user?.passwordHash) {
    if (!password) {
      return NextResponse.json(
        { error: "Mot de passe requis." },
        { status: 400 },
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Mot de passe incorrect." },
        { status: 400 },
      );
    }
  }

  const now = new Date();
  const scheduled = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let settings;
  try {
    try {
      settings = await prisma.userSettings.update({
        where: { userId: viewer.id },
        data: {
          deletionRequestedAt: now,
          deletionScheduledAt: scheduled,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        try {
          settings = await prisma.userSettings.create({
            data: {
              userId: viewer.id,
              language: "FR",
              timezone: "UTC",
              showOnlineStatus: true,
              showLastSeen: true,
              showCountryOnProfile: true,
              communityVisible: true,
              autoAwayMinutes: 30,
              notifyInApp: true,
              notifyEmail: false,
              notifyRequests: true,
              notifyDocuments: true,
              notifyPayments: true,
              notifyMeetings: true,
              notifyEvents: true,
              notifyMarketplace: true,
              notificationFrequency: "IMMEDIATE",
              allowFollow: true,
              showFollowersCount: true,
              showBadges: true,
              allowReviews: true,
              showRatingPublicly: true,
              showReviewComments: true,
              deletionRequestedAt: now,
              deletionScheduledAt: scheduled,
            },
          });
        } catch (e2) {
          if (e2 instanceof Prisma.PrismaClientKnownRequestError && e2.code === "P2002") {
            settings = await prisma.userSettings.update({
              where: { userId: viewer.id },
              data: {
                deletionRequestedAt: now,
                deletionScheduledAt: scheduled,
              },
            });
          } else {
            throw e2;
          }
        }
      } else {
        throw e;
      }
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return NextResponse.json(
        {
          error:
            "La migration UserSettings n’est pas appliquée. Exécutez `npx prisma migrate deploy` (ou `npx prisma migrate dev`) puis réessayez.",
        },
        { status: 503 },
      );
    }
    throw e;
  }

  return NextResponse.json({
    success: true,
    deletionRequestedAt: settings.deletionRequestedAt,
    deletionScheduledAt: settings.deletionScheduledAt,
  });
}
