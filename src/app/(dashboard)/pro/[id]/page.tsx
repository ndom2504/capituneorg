
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PublicProfileView } from "@/components/pro-profile/public-profile-view";
import { MessagingManager } from "@/components/messaging/messaging-manager";
import { getAppViewer } from "@/lib/auth/viewer";

export default async function ProProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getAppViewer();

  // Try fetching by userId (simplest URL strategy /pro/userid)
  let user = await prisma.user.findUnique({
    where: { id },
    include: {
      marketplaceProfile: true,
    },
  });

  if (!user || user.accountType !== "PROFESSIONAL" || !user.marketplaceProfile) {
    // Fallback search by profile ID
    const profile = await prisma.marketplaceProfile.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (profile) {
        user = await prisma.user.findUnique({
            where: { id: profile.userId },
            include: { marketplaceProfile: true }
        });
    } else {
        notFound();
    }
  }

  // Double check existence after fallback
  if (!user || !user.marketplaceProfile) {
      notFound();
  }

  return (
    <>
      <PublicProfileView user={user} profile={user.marketplaceProfile} />
      {viewer && <MessagingManager currentUserId={viewer.id} />}
    </>
  );
}
