import { NextResponse } from "next/server";

import { getAppViewer } from "@/lib/auth/viewer";

export type AdminViewerAuth = {
  id: string;
  fullName: string;
  email: string;
  accountType: "USER" | "PROFESSIONAL" | "ADMIN";
  adminRole: "ADMIN" | "MODERATOR";
  accountStatus: "ACTIVE" | "SUSPENDED" | "DELETED";
};

export async function requireAdminViewer(): Promise<
  | { ok: true; viewer: AdminViewerAuth }
  | { ok: false; response: NextResponse }
> {
  const viewer = await getAppViewer();

  if (!viewer) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Non authentifié." }, { status: 401 }),
    };
  }

  if (viewer.accountType !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 },
      ),
    };
  }

  if (viewer.accountStatus !== "ACTIVE") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Compte inactif." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, viewer };
}

export async function requireAdminActionViewer(): Promise<
  | { ok: true; viewer: AdminViewerAuth }
  | { ok: false; response: NextResponse }
> {
  const auth = await requireAdminViewer();
  if (!auth.ok) return auth;

  if (auth.viewer.adminRole !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Actions réservées au rôle ADMIN." },
        { status: 403 },
      ),
    };
  }

  return auth;
}
