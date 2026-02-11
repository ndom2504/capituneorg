import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { CaseThread } from "./case-thread";
import { CaseHeader } from "./case-header";

export const dynamic = "force-dynamic";

export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const viewer = await getAppViewer();
  if (!viewer) {
    redirect("/auth/login");
  }

  const c = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      requester: { select: { id: true, fullName: true, avatarUrl: true, accountType: true } },
      professional: { select: { id: true, fullName: true, avatarUrl: true, accountType: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          authorId: true,
          body: true,
          fileUrl: true,
          fileName: true,
          createdAt: true,
          author: { select: { fullName: true, avatarUrl: true, accountType: true } },
        },
      },
    },
  });

  if (!c) {
    notFound();
  }

  const isParticipant = c.requesterId === viewer.id || c.professionalId === viewer.id;
  const isAdmin = viewer.accountType === "ADMIN";
  if (!isParticipant && !isAdmin) {
    notFound();
  }

  const viewerRole: "REQUESTER" | "PROFESSIONAL" = c.requesterId === viewer.id ? "REQUESTER" : "PROFESSIONAL";
  const otherUser = viewerRole === "REQUESTER" ? c.professional : c.requester;

  const initialMessages = c.messages
    .map((m) => ({
      id: m.id,
      authorId: m.authorId,
      authorName: m.author.fullName,
      authorAvatarUrl: m.author.avatarUrl,
      authorRole: m.author.accountType,
      body: m.body,
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      createdAt: m.createdAt.toISOString(),
    }))
    .reverse(); // oldest first

  const canEditStatus = viewer.accountType === "ADMIN" || viewerRole === "PROFESSIONAL";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <CaseHeader
        caseId={c.id}
        title={c.title}
        description={c.description}
        status={c.status}
        viewerRole={viewerRole}
        canEditStatus={canEditStatus}
        otherUserName={otherUser.fullName}
      />

      <CaseThread
        caseId={c.id}
        viewerId={viewer.id}
        viewerRole={viewerRole}
        otherUser={otherUser}
        status={c.status}
        initialMessages={initialMessages}
      />
    </div>
  );
}
