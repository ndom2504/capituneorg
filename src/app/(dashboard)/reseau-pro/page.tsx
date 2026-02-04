import { jsonStringArray } from "@/app/api/marketplace/_viewer";
import { ReseauProPageClient } from "@/components/pro-network/reseau-pro-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";

function professionLabel(p: string) {
  switch (p) {
    case "IMMIGRATION_CONSULTANT":
      return "Consultant en immigration";
    case "IMMIGRATION_LAWYER":
      return "Avocat en immigration";
    case "ORIENTATION_COUNSELOR":
      return "Conseiller d’orientation";
    case "ACADEMIC_COUNSELOR":
      return "Conseiller académique";
    case "EMPLOYMENT_COUNSELOR":
      return "Conseiller emploi";
    case "CASE_MANAGER":
      return "Gestionnaire de dossier";
    case "CERTIFIED_TRANSLATOR":
      return "Traducteur certifié";
    case "INTEGRATION_COACH":
      return "Coach d’intégration";
    case "COMMUNITY_ORG":
      return "Organisme communautaire";
    default:
      return p;
  }
}

export default async function ReseauProPage() {
  const viewer = await getAppViewer();
  const viewerEmail = viewer?.email ?? "";

  const isPro = viewer?.accountType === "PROFESSIONAL" && !!viewer.isCertified;
  if (!viewer) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Réseau professionnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="text-text">
              Vous n’êtes pas connecté.
            </div>
            <div className="text-muted">
              Connectez-vous avec un compte professionnel certifié, ou utilisez le mode démo via <span className="font-mono">CAPITUNE_VIEWER_EMAIL</span>.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isPro) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Réseau professionnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="text-text">
              Accès réservé aux <span className="font-semibold">professionnels certifiés</span>.
            </div>
            <div className="text-muted">
              Viewer actuel: <span className="font-mono">{viewerEmail}</span>
            </div>
            <div className="text-muted">
              Si vous utilisez le mode démo, mettez par exemple <span className="font-mono">pro@capitune.local</span> (ou <span className="font-mono">pro2@capitune.local</span>) dans <span className="font-mono">CAPITUNE_VIEWER_EMAIL</span>, puis relancez le serveur.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [
    contactReceived,
    partnershipReceived,
    partnershipSent,
    partnershipActiveRaw,
  ] = await Promise.all([
    prisma.contactRequest.findMany({
      where: { toId: viewer.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        message: true,
        status: true,
        from: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
      },
    }),
    prisma.partnershipRequest.findMany({
      where: { toId: viewer.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        message: true,
        status: true,
        from: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
      },
    }),
    prisma.partnershipRequest.findMany({
      where: { fromId: viewer.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        message: true,
        status: true,
        from: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
        to: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
      },
    }),
    prisma.partnershipRequest.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ fromId: viewer.id }, { toId: viewer.id }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        message: true,
        status: true,
        fromId: true,
        toId: true,
        from: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
        to: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
      },
    }),
  ]);

  const partnerIds = new Set(
    partnershipActiveRaw.map((r) => (r.fromId === viewer.id ? r.toId : r.fromId)),
  );

  const partnershipActive = partnershipActiveRaw.map((r) => {
    const partner = r.fromId === viewer.id ? r.to : r.from;
    return {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      message: r.message,
      status: r.status,
      from: r.from,
      to: partner,
    };
  });

  const directoryProfiles = await prisma.marketplaceProfile.findMany({
    where: {
      status: "PUBLISHED",
      user: { is: { accountType: "PROFESSIONAL", isCertified: true } },
    },
    orderBy: [{ isVerified: "desc" }, { updatedAt: "desc" }],
    include: {
      user: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });

  const directoryPros = directoryProfiles.map((p) => ({
    userId: p.userId,
    fullName: p.user.fullName,
    avatarUrl: p.user.avatarUrl,
    profession: p.profession,
    professionLabel: professionLabel(p.profession),
    organization: p.organization,
    country: p.country,
    city: p.city,
    languages: jsonStringArray(p.languagesJson),
    specialties: jsonStringArray(p.specialtiesJson),
    isVerified: p.isVerified,
    isPartnerWithViewer: partnerIds.has(p.userId),
  }));

  const networks = await prisma.professionalNetwork.findMany({
    where: {
      OR: [{ ownerId: viewer.id }, { members: { some: { userId: viewer.id } } }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, fullName: true, email: true } },
      members: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, fullName: true, email: true } } },
      },
    },
  });

  const initialNetworks = networks.map((n) => ({
    id: n.id,
    name: n.name,
    description: n.description,
    createdAt: n.createdAt.toISOString(),
    owner: n.owner,
    members: n.members.map((m) => ({
      userId: m.userId,
      role: m.role,
      user: m.user,
    })),
  }));

  return (
    <ReseauProPageClient
      directoryPros={directoryPros}
      contactReceived={contactReceived.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        message: r.message,
        status: r.status,
        from: r.from,
      }))}
      partnershipReceived={partnershipReceived.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        message: r.message,
        status: r.status,
        from: r.from,
      }))}
      partnershipSent={partnershipSent.map((r) => ({
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        message: r.message,
        status: r.status,
        from: r.from,
        to: r.to,
      }))}
      partnershipActive={partnershipActive}
      initialNetworks={initialNetworks}
    />
  );
}
