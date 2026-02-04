import { prisma } from "@/lib/db";
import { getViewer } from "@/app/api/relationships/_viewer";

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

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

export async function GET() {
  const viewer = await getViewer();
  const check = ensureProfessional(viewer);
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: 403 });
  }

  const networks = await prisma.professionalNetwork.findMany({
    where: {
      OR: [
        { ownerId: check.viewer.id },
        { members: { some: { userId: check.viewer.id } } },
      ],
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

  return Response.json({ networks });
}

export async function POST(req: Request) {
  const viewer = await getViewer();
  const check = ensureProfessional(viewer);
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as null | {
    name?: string;
    description?: string;
  };

  const nameRaw = body?.name ?? "";
  const descriptionRaw = body?.description ?? "";

  const name = normalizeText(nameRaw);
  const description = normalizeText(descriptionRaw);

  if (name.length < 2 || name.length > 50) {
    return Response.json(
      { error: "Nom invalide (2 à 50 caractères)." },
      { status: 400 },
    );
  }
  if (description.length > 240) {
    return Response.json(
      { error: "Description trop longue (max 240 caractères)." },
      { status: 400 },
    );
  }

  const network = await prisma.professionalNetwork.create({
    data: {
      name,
      description: description.length ? description : null,
      ownerId: check.viewer.id,
      members: {
        create: {
          userId: check.viewer.id,
          role: "OWNER",
        },
      },
    },
    include: {
      owner: { select: { id: true, fullName: true, email: true } },
      members: {
        include: { user: { select: { id: true, fullName: true, email: true } } },
      },
    },
  });

  return Response.json({ network });
}
