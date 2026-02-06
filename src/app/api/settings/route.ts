import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampText(input: unknown, maxLen: number) {
  const value = String(input ?? "").trim();
  if (!value) return null;
  return value.length > maxLen ? value.slice(0, maxLen) : value;
}

function toBool(input: unknown, fallback: boolean) {
  if (typeof input === "boolean") return input;
  return fallback;
}

function toInt(input: unknown, fallback: number) {
  const n = typeof input === "number" ? input : Number(String(input ?? ""));
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

const DEFAULTS = {
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
  notificationFrequency: "IMMEDIATE" as const,
  allowFollow: true,
  showFollowersCount: true,
  showBadges: true,
  allowReviews: true,
  showRatingPublicly: true,
  showReviewComments: true,
};

export async function GET() {
  const viewer = await getAppViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let settings;
  try {
    settings = await prisma.userSettings.findUnique({
      where: { userId: viewer.id },
    });

    if (!settings) {
      try {
        settings = await prisma.userSettings.create({
          data: {
            userId: viewer.id,
            ...DEFAULTS,
          },
        });
      } catch (e) {
        // Concurrence: 2 requêtes peuvent tenter de créer en même temps.
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          settings = await prisma.userSettings.findUnique({
            where: { userId: viewer.id },
          });
        } else {
          throw e;
        }
      }
    }
  } catch (e) {
    // Permet à l’UI de fonctionner même si la migration n’est pas encore appliquée.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      settings = {
        userId: viewer.id,
        ...DEFAULTS,
        country: null,
        deletionRequestedAt: null,
        deletionScheduledAt: null,
      };
    } else {
      throw e;
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: viewer.id },
    select: {
      fullName: true,
      email: true,
      avatarUrl: true,
      accountType: true,
      passwordHash: true,
      marketplaceProfile: {
        select: { id: true, status: true, isVerified: true },
      },
    },
  });

  return NextResponse.json({
    viewer: {
      id: viewer.id,
      accountType: viewer.accountType,
      fullName: user?.fullName ?? viewer.fullName,
      email: user?.email ?? viewer.email,
      avatarUrl: viewer.avatarUrl,
      hasPassword: !!user?.passwordHash,
      marketplaceProfile: user?.marketplaceProfile ?? null,
    },
    settings,
  });
}

export async function PUT(req: Request) {
  const viewer = await getAppViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return NextResponse.json({ error: "Body requis." }, { status: 400 });
  }

  const languageRaw = body.language;
  const timezoneRaw = body.timezone;
  const countryRaw = body.country;

  const language = languageRaw === "EN" ? "EN" : "FR";
  const timezone = clampText(timezoneRaw, 80) ?? DEFAULTS.timezone;
  const country = clampText(countryRaw, 80);

  const autoAwayMinutes = toInt(body.autoAwayMinutes, DEFAULTS.autoAwayMinutes);
  const autoAwayAllowed = new Set([15, 30, 60]);
  const safeAutoAway = autoAwayAllowed.has(autoAwayMinutes) ? autoAwayMinutes : DEFAULTS.autoAwayMinutes;

  const notificationFrequency = body.notificationFrequency === "IMMEDIATE" ? "IMMEDIATE" : "IMMEDIATE";

  const data = {
    language,
    timezone,
    country,

    showOnlineStatus: toBool(body.showOnlineStatus, DEFAULTS.showOnlineStatus),
    showLastSeen: toBool(body.showLastSeen, DEFAULTS.showLastSeen),
    showCountryOnProfile: toBool(body.showCountryOnProfile, DEFAULTS.showCountryOnProfile),
    communityVisible: toBool(body.communityVisible, DEFAULTS.communityVisible),

    autoAwayMinutes: safeAutoAway,

    notifyInApp: toBool(body.notifyInApp, DEFAULTS.notifyInApp),
    notifyEmail: toBool(body.notifyEmail, DEFAULTS.notifyEmail),
    notifyRequests: toBool(body.notifyRequests, DEFAULTS.notifyRequests),
    notifyDocuments: toBool(body.notifyDocuments, DEFAULTS.notifyDocuments),
    notifyPayments: toBool(body.notifyPayments, DEFAULTS.notifyPayments),
    notifyMeetings: toBool(body.notifyMeetings, DEFAULTS.notifyMeetings),
    notifyEvents: toBool(body.notifyEvents, DEFAULTS.notifyEvents),
    notifyMarketplace: toBool(body.notifyMarketplace, DEFAULTS.notifyMarketplace),
    notificationFrequency,

    allowFollow: toBool(body.allowFollow, DEFAULTS.allowFollow),
    showFollowersCount: toBool(body.showFollowersCount, DEFAULTS.showFollowersCount),
    showBadges: toBool(body.showBadges, DEFAULTS.showBadges),
    allowReviews: toBool(body.allowReviews, DEFAULTS.allowReviews),
    showRatingPublicly: toBool(body.showRatingPublicly, DEFAULTS.showRatingPublicly),
    showReviewComments: toBool(body.showReviewComments, DEFAULTS.showReviewComments),
  };

  let settings;
  try {
    try {
      settings = await prisma.userSettings.update({
        where: { userId: viewer.id },
        data,
      });
    } catch (e) {
      // Si pas encore de ligne, on crée.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        try {
          settings = await prisma.userSettings.create({
            data: {
              userId: viewer.id,
              ...DEFAULTS,
              ...data,
            },
          });
        } catch (e2) {
          if (e2 instanceof Prisma.PrismaClientKnownRequestError && e2.code === "P2002") {
            settings = await prisma.userSettings.update({
              where: { userId: viewer.id },
              data,
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

  return NextResponse.json({ settings });
}
