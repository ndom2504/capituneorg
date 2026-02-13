import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";

export type AppViewer = {
  id: string;
  fullName: string;
  email: string;
  accountType: "USER" | "PROFESSIONAL" | "ADMIN";
  adminRole: "ADMIN" | "MODERATOR";
  accountStatus: "ACTIVE" | "SUSPENDED" | "DELETED";
  isCertified: boolean;
  avatarUrl: string | null;
  coverUrl: string | null;
  professionalProfile: { id: string; verificationStatus?: "DRAFT" | "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED" } | null;
};

function normalizeMediaUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return url;
  return `/${url}`;
}

export async function getAppViewer(): Promise<AppViewer | null> {
  try {
    const sessionUserId = await getSessionUserId();
    if (sessionUserId) {
      const user = await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: {
          id: true,
          fullName: true,
          email: true,
          accountType: true,
          adminRole: true,
          accountStatus: true,
          avatarUrl: true,
          coverUrl: true,
          professionalProfile: { select: { id: true, verificationStatus: true } },
        },
      });
      if (!user) return null;
      return {
        ...user,
        isCertified: user.professionalProfile?.verificationStatus === "VERIFIED",
        avatarUrl: normalizeMediaUrl(user.avatarUrl),
        coverUrl: normalizeMediaUrl(user.coverUrl),
      };
    }

    // fallback mode démo (variable d'env)
    const email = process.env.CAPITUNE_VIEWER_EMAIL ?? "client@capitune.local";
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        fullName: true,
        email: true,
        accountType: true,
        adminRole: true,
        accountStatus: true,
        avatarUrl: true,
        coverUrl: true,
        professionalProfile: { select: { id: true, verificationStatus: true } },
      },
    });
    if (!user) return null;
    return {
      ...user,
      isCertified: user.professionalProfile?.verificationStatus === "VERIFIED",
      avatarUrl: normalizeMediaUrl(user.avatarUrl),
      coverUrl: normalizeMediaUrl(user.coverUrl),
    };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      const errorName = err instanceof Error ? err.name : "UnknownError";
      console.warn(
        `[getAppViewer] Prisma indisponible (${errorName}). Configurez DATABASE_URL/DIRECT_URL (PostgreSQL) dans .env.local.`,
      );
    }
    return null;
  }
}
