import { AdminFeed } from "@/components/community/admin-feed";
import { AboutCard } from "@/components/community/about-card";
import { ConnectionsCard } from "@/components/community/connections-card";
import { CommunityPageHeader } from "@/components/community/community-page-header";
import { UserPostsFeed } from "@/components/community/user-posts-feed";
import { EventsSidebarCard } from "@/components/events/events-sidebar-card";
import { PerformanceCard } from "@/components/profile/performance-card";
import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

function formatRelativeDate(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60000));
  if (diffMin < 2) return "à l’instant";
  if (diffMin < 60) return `${diffMin} min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return diffDays === 1 ? "Hier" : `Il y a ${diffDays} jours`;
}

export default async function AccueilPage() {
  const viewer = await getAppViewer();
  const featureFlags = await getFeatureFlagsFromDb();

  let directoryUsers: any[] = [];
  let following: any[] = [];
  let userPosts: any[] = [];
  let posts: any[] = [];

  try {
    directoryUsers = viewer
      ? await prisma.user.findMany({
          where: {
            id: { not: viewer.id },
            ...(viewer.accountType === "USER"
              ? { accountType: { in: ["PROFESSIONAL", "ADMIN"] as const } }
              : {}),
          },
          orderBy: [{ accountType: "desc" }, { fullName: "asc" }],
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            accountType: true,
            isCertified: true,
          },
        })
      : [];

    following = viewer
      ? await prisma.follow.findMany({
          where: { followerId: viewer.id },
          select: { followingId: true },
        })
      : [];

    userPosts = await prisma.userPost.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
        _count: { select: { comments: true } },
        likesRel: viewer?.id
          ? { where: { userId: viewer.id }, select: { userId: true } }
          : { where: { userId: "__none__" }, select: { userId: true } },
        comments: viewer?.id
          ? {
              where: { userId: viewer.id },
              orderBy: { createdAt: "desc" },
              take: 5,
              select: { id: true, message: true, createdAt: true },
            }
          : {
              where: { userId: "__none__" },
              orderBy: { createdAt: "desc" },
              take: 0,
              select: { id: true, message: true, createdAt: true },
            },
      },
    });

    posts = await prisma.adminPost.findMany({
      orderBy: { createdAt: "desc" },
      include: { comments: { orderBy: { createdAt: "desc" } } },
    });
  } catch (err) {
    // DB unavailable: return empty data
    if (process.env.NODE_ENV === "development") {
      console.error("[AccueilPage] Database error:", err);
    }
  }

  const followingSet = new Set(following.map((f) => f.followingId));

  function professionalCertified(u: { accountType: string; isCertified: boolean }) {
    return u.accountType === "PROFESSIONAL" && u.isCertified;
  }

  function canFollowTarget(target: { accountType: string; isCertified: boolean }) {
    if (!viewer) return { ok: false, reason: "Mode démo: viewer manquant." };
    if (viewer.accountType === "USER" && target.accountType === "USER") {
      return { ok: false, reason: "Deux demandeurs ne peuvent pas se suivre." };
    }
    if (viewer.accountType === "PROFESSIONAL" && !professionalCertified(viewer)) {
      return { ok: false, reason: "Compte professionnel non certifié." };
    }
    if (target.accountType === "PROFESSIONAL" && !professionalCertified(target)) {
      return { ok: false, reason: "Professionnel non certifié." };
    }
    return { ok: true };
  }

  function canContactTarget(target: { accountType: string; isCertified: boolean }) {
    if (!viewer) return { ok: false, reason: "Mode démo: viewer manquant." };
    if (viewer.accountType === "USER" && target.accountType === "USER") {
      return { ok: false, reason: "Deux demandeurs ne peuvent pas se contacter." };
    }
    if (viewer.accountType === "PROFESSIONAL" && !professionalCertified(viewer)) {
      return { ok: false, reason: "Compte professionnel non certifié." };
    }
    if (target.accountType === "PROFESSIONAL" && !professionalCertified(target)) {
      return { ok: false, reason: "Professionnel non certifié." };
    }
    return { ok: true };
  }

  function canPartnershipTarget(target: { accountType: string; isCertified: boolean }) {
    if (!viewer) return { ok: false, reason: "Mode démo: viewer manquant." };
    if (viewer.accountType !== "PROFESSIONAL" || target.accountType !== "PROFESSIONAL") {
      return { ok: false, reason: "Partenariat réservé aux professionnels." };
    }
    if (!professionalCertified(viewer) || !professionalCertified(target)) {
      return { ok: false, reason: "Partenariat réservé aux professionnels certifiés." };
    }
    return { ok: true };
  }

  const connections = directoryUsers.map((u) => {
    const follow = canFollowTarget(u);
    const contact = canContactTarget(u);
    const partnership = canPartnershipTarget(u);
    const reason = !follow.ok
      ? follow.reason
      : !contact.ok
        ? contact.reason
        : !partnership.ok
          ? partnership.reason
          : null;

    return {
      id: u.id,
      fullName: u.fullName,
      avatarUrl: u.avatarUrl,
      accountType: u.accountType,
      isCertified: u.isCertified,
      isFollowed: viewer ? followingSet.has(u.id) : false,
      canFollow: !!follow.ok,
      canContact: !!contact.ok,
      canPartnership: !!partnership.ok,
      disabledReason: reason,
    };
  });

  const initialPosts = posts.map((p) => ({
    id: p.id,
    adminLabel: p.adminLabel,
    createdAt: formatRelativeDate(p.createdAt),
    content: p.content,
    likes: p.likes,
    shares: p.shares,
    comments: p.comments.map((c: { id: string; authorLabel: string; message: string; createdAt: Date }) => ({
      id: c.id,
      author: c.authorLabel,
      message: c.message,
      createdAt: formatRelativeDate(c.createdAt),
    })),
  }));

  const initialUserPosts = userPosts.map((p) => ({
    id: p.id,
    userId: p.userId,
    authorName: p.user.fullName,
    authorAvatarUrl: p.user.avatarUrl,
    createdAt: p.createdAt.toISOString(),
    createdAtLabel: formatRelativeDate(p.createdAt),
    content: p.content,
    mediaUrl: p.mediaUrl,
    mediaType: p.mediaType,
    likes: p.likes,
    shares: p.shares,
    commentsCount: p._count.comments,
    likedByViewer: p.likesRel.length > 0,
    isMine: viewer?.id ? p.userId === viewer.id : false,
    comments: p.comments.map((c: { id: string; message: string; createdAt: Date }) => ({
      id: c.id,
      message: c.message,
      createdAt: c.createdAt.toISOString(),
      createdAtLabel: formatRelativeDate(c.createdAt),
    })),
  }));

  return (
    <div className="w-full space-y-4">
      <CommunityPageHeader
        pageName={viewer?.fullName ?? "Client Capitune"}
        avatarUrl={viewer?.avatarUrl}
        coverUrl={viewer?.coverUrl}
        activeTab="publications"
        isOwner
        viewerAccountType={viewer?.accountType ?? null}
        featureFlags={featureFlags}
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-[92px]">
            <div className="space-y-4">
              <AboutCard />
              {viewer && <PerformanceCard userId={viewer.id} isPro={!!viewer.professionalProfile} />}
              {featureFlags.events ? <EventsSidebarCard /> : null}
              <ConnectionsCard users={connections} viewerAccountType={viewer?.accountType ?? null} />
            </div>
          </div>
        </div>
        <div className="lg:col-span-8">
          <UserPostsFeed initialPosts={initialUserPosts} />
          <div className="h-4" />
          <AdminFeed initialPosts={initialPosts} />
        </div>
      </div>
    </div>
  );
}
