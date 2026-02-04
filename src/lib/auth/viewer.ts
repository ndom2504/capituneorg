import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/session";

export type AppViewer = {
  id: string;
  fullName: string;
  email: string;
  accountType: "USER" | "PROFESSIONAL" | "ADMIN";
  isCertified: boolean;
  avatarUrl: string | null;
  coverUrl: string | null;
};

export async function getAppViewer(): Promise<AppViewer | null> {
  const sessionUserId = await getSessionUserId();
  if (sessionUserId) {
    const user = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: {
        id: true,
        fullName: true,
        email: true,
        accountType: true,
        isCertified: true,
        avatarUrl: true,
        coverUrl: true,
      },
    });
    return user ?? null;
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
      isCertified: true,
      avatarUrl: true,
      coverUrl: true,
    },
  });
  return user ?? null;
}
