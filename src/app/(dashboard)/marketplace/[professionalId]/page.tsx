import { MarketplaceProfile } from "@/components/marketplace/marketplace-profile";
import { getAppViewer } from "@/lib/auth/viewer";
import { prisma } from "@/lib/db";

export default async function MarketplaceProfessionalPage({
  params,
}: {
  params: Promise<{ professionalId: string }>;
}) {
  const { professionalId } = await params;

  const viewer = await getAppViewer();
  const isSelfProfessional =
    (viewer?.accountType === "PROFESSIONAL" || viewer?.accountType === "ADMIN") &&
    viewer.id === professionalId;

  const initialIsFollowed = viewer?.id
    ? !!(await prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: viewer.id, followingId: professionalId },
        },
        select: { followerId: true },
      }))
    : false;

  return (
    <div className="space-y-4">
      <MarketplaceProfile
        professionalId={professionalId}
        mode={isSelfProfessional ? "PRO_SELF" : "PUBLIC"}
        viewer={
          viewer
            ? { id: viewer.id, accountType: viewer.accountType, isCertified: !!viewer.isCertified }
            : null
        }
        initialIsFollowed={initialIsFollowed}
      />
    </div>
  );
}
