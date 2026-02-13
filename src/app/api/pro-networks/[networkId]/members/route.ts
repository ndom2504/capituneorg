import { prisma } from "@/lib/db";
import { getViewer } from "@/app/api/relationships/_viewer";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

function ensureProfessional(viewer: Awaited<ReturnType<typeof getViewer>>) {
  if (!viewer) return { ok: false as const, error: "Viewer introuvable." };
  if (viewer.accountType !== "PROFESSIONAL") {
    return { ok: false as const, error: "Fonctionnalité réservée aux professionnels." };
  }
  if (!viewer.isCertified) {
    return { ok: false as const, error: "Professionnel non certifié." };
  }
  return { ok: true as const, viewer };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ networkId: string }> },
) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.proNetwork) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const { networkId } = await params;

  const viewer = await getViewer();
  const check = ensureProfessional(viewer);
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as null | {
    email?: string;
  };

  const email = (body?.email ?? "").trim().toLowerCase();
  if (!email) {
    return Response.json({ error: "Email requis." }, { status: 400 });
  }

  const membership = await prisma.professionalNetworkMember.findUnique({
    where: {
      networkId_userId: {
        networkId,
        userId: check.viewer.id,
      },
    },
    select: { role: true },
  });

  if (!membership || membership.role !== "OWNER") {
    return Response.json(
      { error: "Seul le propriétaire peut ajouter des membres." },
      { status: 403 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      accountType: true,
      professionalProfile: { select: { verificationStatus: true } },
    },
  });

  if (!target) {
    return Response.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }

  const isTargetCertified = target.professionalProfile?.verificationStatus === "VERIFIED";

  if (target.accountType !== "PROFESSIONAL" || !isTargetCertified) {
    return Response.json(
      { error: "Seuls les professionnels certifiés peuvent être ajoutés." },
      { status: 400 },
    );
  }

  if (target.id === check.viewer.id) {
    return Response.json(
      { error: "Vous êtes déjà membre de ce réseau." },
      { status: 400 },
    );
  }

  try {
    await prisma.professionalNetworkMember.create({
      data: {
        networkId,
        userId: target.id,
        role: "MEMBER",
      },
    });
  } catch {
    return Response.json(
      { error: "Ce membre est déjà dans le réseau." },
      { status: 409 },
    );
  }

  return Response.json({ ok: true });
}
